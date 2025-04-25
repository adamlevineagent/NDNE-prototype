import { PrismaClient } from "@prisma/client";
import { callOpenRouterLLM } from "./llm-service";
import { generateNegotiationStance } from "./stance-generator";
import { CONSENSUS_CHECKING_PROMPT } from "./prompt-templates/negotiation-prompts";
import { logLlmUsage } from "./llm-logging-service";
import logger from "../utils/logger";

const prisma = new PrismaClient();

/**
 * Enum representing the different stages of a negotiation.
 */
export enum NegotiationStage {
  PERSPECTIVE_PASS = "PERSPECTIVE_PASS",
  OPTION_GENERATION = "OPTION_GENERATION",
  CONSENSUS_CHECK = "CONSENSUS_CHECK",
  COMPLETED = "COMPLETED",
  ABANDONED = "ABANDONED",
}

/**
 * Start a new negotiation session.
 */
export async function startNegotiation(
  topic: string,
  initiatorId: string,
  description?: string
): Promise<string> {
  // Create a new negotiation session
  const session = await prisma.negotiationSession.create({
    data: {
      topic,
      description,
      initiatorId,
      status: "active",
    },
  });

  logger.info(`Started new negotiation: ${session.id} on topic: ${topic}`);
  
  return session.id;
}

/**
 * Process a new negotiation message and determine next steps.
 */
export async function processNegotiationMessage(
  negotiationId: string,
  messageData: {
    agentId: string;
    content: string;
    messageType?: string;
    referencedMessageId?: string;
    metadata?: any;
  }
): Promise<{
  message: any;
  autoResponses: any[];
  consensusReached: boolean;
}> {
  // Store the incoming message
  const message = await prisma.negotiationMessage.create({
    data: {
      negotiationId,
      agentId: messageData.agentId,
      content: messageData.content,
      messageType: messageData.messageType || "statement",
      referencedMessageId: messageData.referencedMessageId,
      metadata: messageData.metadata,
    },
    include: {
      reactions: true,
    }
  });

  // Get the current negotiation session
  const session = await prisma.negotiationSession.findUnique({
    where: { id: negotiationId }
  });

  if (!session) {
    throw new Error(`Negotiation session ${negotiationId} not found`);
  }

  // Check if negotiation is already completed
  if (session.status !== "active") {
    return {
      message,
      autoResponses: [],
      consensusReached: session.status === "completed"
    };
  }

  // Determine the current stage of the negotiation
  const currentStage = await determineNegotiationStage(negotiationId);
  
  // Get participating agents 
  // (agents who have posted at least one message, including the current one)
  const participatingAgents = await prisma.negotiationMessage.findMany({
    where: { negotiationId },
    select: { agentId: true },
    distinct: ['agentId']
  });
  
  const agentIds = participatingAgents.map(a => a.agentId);
  
  // Identify which agent(s) should respond next
  const nextAgentIds = await determineNextRespondents(
    negotiationId, 
    messageData.agentId, 
    agentIds, 
    currentStage
  );
  
  // Generate auto-responses from the next agents
  const autoResponses = [];
  for (const nextAgentId of nextAgentIds) {
    try {
      const responseMessage = await generateAgentResponse(
        negotiationId, 
        nextAgentId, 
        currentStage
      );
      
      autoResponses.push(responseMessage);
    } catch (error) {
      logger.error(`Failed to generate agent ${nextAgentId} response: ${error}`);
    }
  }
  
  // Check for consensus after new messages
  const consensusResult = await detectConsensus(negotiationId);
  
  if (consensusResult.consensusReached) {
    await finalizeNegotiation(negotiationId, {
      status: "completed",
      outcome: consensusResult.terms,
      summary: consensusResult.summary
    });
  } else if (consensusResult.nearMiss) {
    // Handle near-miss case (70-74% agreement)
    logger.info(`Near miss detected in negotiation ${negotiationId}, triggering Round 2`);
    
    // Add a system message indicating Round 2
    await prisma.negotiationMessage.create({
      data: {
        negotiationId,
        agentId: session.initiatorId, // Use initiator as the "system" for this message
        content: "ROUND-2: Consensus nearly reached (70-74% agreement). Continuing negotiation for further refinement.",
        messageType: "system",
      }
    });
  }
  
  return {
    message,
    autoResponses,
    consensusReached: consensusResult.consensusReached
  };
}

/**
 * Determine the current stage of a negotiation based on message history.
 */
async function determineNegotiationStage(negotiationId: string): Promise<NegotiationStage> {
  // Get the negotiation session
  const session = await prisma.negotiationSession.findUnique({
    where: { id: negotiationId },
  });

  if (!session) {
    throw new Error(`Negotiation session ${negotiationId} not found`);
  }

  // If the session has a status other than "active", map it to the corresponding stage
  if (session.status === "completed") {
    return NegotiationStage.COMPLETED;
  } else if (session.status === "abandoned") {
    return NegotiationStage.ABANDONED;
  }

  // Count the total messages in this negotiation
  const messageCount = await prisma.negotiationMessage.count({
    where: { negotiationId }
  });

  // Check if this is a brand new negotiation or still in early stages
  if (messageCount <= 3) {
    return NegotiationStage.PERSPECTIVE_PASS;
  } 
  
  // After initial perspective sharing, move to option generation
  if (messageCount <= 10) {
    return NegotiationStage.OPTION_GENERATION;
  }
  
  // After several messages, start checking for consensus
  return NegotiationStage.CONSENSUS_CHECK;
}

/**
 * Determine which agents should respond next in the negotiation.
 */
async function determineNextRespondents(
  negotiationId: string, 
  currentAgentId: string,
  participatingAgentIds: string[],
  currentStage: NegotiationStage
): Promise<string[]> {
  // Filter out the current agent
  const otherAgentIds = participatingAgentIds.filter(id => id !== currentAgentId);
  
  if (otherAgentIds.length === 0) {
    return []; // No other agents to respond
  }
  
  if (currentStage === NegotiationStage.PERSPECTIVE_PASS) {
    // In perspective pass, only one agent responds at a time
    const nextAgentIndex = Math.floor(Math.random() * otherAgentIds.length);
    return [otherAgentIds[nextAgentIndex]];
  } 
  
  // In other stages, we could have multiple agents respond,
  // but for simplicity and to avoid too many auto-responses at once,
  // we'll pick 1-2 agents
  
  // Select 1-2 agents randomly, but never more than available
  const count = Math.min(
    Math.floor(Math.random() * 2) + 1, 
    otherAgentIds.length
  );
  
  // Shuffle the array and take the first 'count' elements
  return otherAgentIds
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

/**
 * Generate a message response from an agent in the negotiation.
 */
async function generateAgentResponse(
  negotiationId: string, 
  agentId: string, 
  currentStage: NegotiationStage
): Promise<any> {
  // Get the negotiation context
  const session = await prisma.negotiationSession.findUnique({
    where: { id: negotiationId }
  });

  if (!session) {
    throw new Error(`Negotiation session ${negotiationId} not found`);
  }

  // Get recent messages for context
  const recentMessages = await prisma.negotiationMessage.findMany({
    where: { negotiationId },
    orderBy: { timestamp: 'desc' },
    take: 10,
    include: { agent: true }
  });
  
  // Reverse to get chronological order
  const chronologicalMessages = [...recentMessages].reverse();
  
  // Get the agent's stance on this topic
  const stance = await generateNegotiationStance(agentId, session.topic);
  
  // Format the message history for the prompt
  const messageHistory = chronologicalMessages.map(msg => 
    `${msg.agent.name || 'Agent' + msg.agentId.substring(0,4)}: ${msg.content}`
  ).join('\n\n');
  
  // Create the prompt based on the current stage
  let prompt = '';
  switch (currentStage) {
    case NegotiationStage.PERSPECTIVE_PASS:
      prompt = `
You are a PRAXIS AGENT participating in a negotiation about "${session.topic}".
You should respond to the perspectives shared so far, and share your own perspective based on your stance.
Focus on understanding before proposing solutions.

Your stance:
${JSON.stringify(stance, null, 2)}

Recent messages:
${messageHistory}

Respond with your perspective on this issue. Begin your message with "PERSPECTIVE_PASS:" to show you're sharing your initial understanding of the situation.
Keep your response concise (2-4 paragraphs maximum).
`;
      break;
    
    case NegotiationStage.OPTION_GENERATION:
      prompt = `
You are a PRAXIS AGENT participating in a negotiation about "${session.topic}".
It's time to propose constructive options that address the interests shared so far.

Your stance:
${JSON.stringify(stance, null, 2)}

Recent messages:
${messageHistory}

Propose 1-2 specific options that advance your interests while addressing others' concerns.
Use OPT-A and OPT-B tags to clearly mark your proposals.
Explain briefly why you think each option is viable and addresses key concerns.
`;
      break;
    
    case NegotiationStage.CONSENSUS_CHECK:
      prompt = `
You are a PRAXIS AGENT participating in a negotiation about "${session.topic}".
The discussion has progressed and it's time to work toward consensus.

Your stance:
${JSON.stringify(stance, null, 2)}

Recent messages:
${messageHistory}

Evaluate the options discussed so far. If there's an option you can agree to, respond with "CONSENT:YES" and explain your reasoning.
If you cannot consent yet, respond with "CONSENT:NO" and clearly explain what would need to change to gain your consent.
Do not consent to proposals that clearly violate your stance's deal breakers.
`;
      break;
    
    default:
      prompt = `
You are a PRAXIS AGENT participating in a negotiation about "${session.topic}".

Your stance:
${JSON.stringify(stance, null, 2)}

Recent messages:
${messageHistory}

Continue the negotiation constructively. Focus on finding solutions that work for everyone while respecting your stance.
`;
  }
  
  // Call the LLM to generate the response
  try {
    const systemPrompt = "You are a professional negotiation agent representing human interests in a multi-party discussion. Be concise, constructive and clear.";
    const agentResponse = await callOpenRouterLLM({
      prompt,
      contextMessages: [{ role: "system", content: systemPrompt }],
      temperature: 0.7,
      maxTokens: 800,
    });
    
    // Store and return the generated message
    const responseMessage = await prisma.negotiationMessage.create({
      data: {
        negotiationId,
        agentId,
        content: agentResponse,
        messageType: determineMessageType(agentResponse, currentStage),
      },
      include: {
        reactions: true,
      }
    });
    
    return responseMessage;
  } catch (error) {
    logger.error(`Error generating agent response: ${error}`);
    throw error;
  }
}

/**
 * Determine the message type based on content and stage
 */
function determineMessageType(content: string, stage: NegotiationStage): string {
  if (content.includes("CONSENT:YES")) {
    return "agreement";
  } else if (content.includes("CONSENT:NO")) {
    return "disagreement";
  } else if (content.includes("OPT-A") || content.includes("OPT-B")) {
    return "proposal";
  } else if (content.includes("?") && content.split("?").length > 2) {
    return "question";
  } else {
    return "statement";
  }
}

/**
 * Detect if consensus has been reached in a negotiation.
 */
export async function detectConsensus(negotiationId: string): Promise<{
  consensusReached: boolean;
  nearMiss: boolean;
  terms?: string;
  summary?: string;
}> {
  // Get the negotiation session
  const session = await prisma.negotiationSession.findUnique({
    where: { id: negotiationId },
  });

  if (!session) {
    throw new Error(`Negotiation session ${negotiationId} not found`);
  }

  // If it's not an active session, we can't reach new consensus
  if (session.status !== "active") {
    return { 
      consensusReached: session.status === "completed",
      nearMiss: false
    };
  }

  // Get all messages in this negotiation
  const messages = await prisma.negotiationMessage.findMany({
    where: { negotiationId },
    orderBy: { timestamp: 'asc' },
    include: {
      agent: true,
      reactions: true
    }
  });

  // If there are too few messages, there can't be consensus yet
  if (messages.length < 5) {
    return { consensusReached: false, nearMiss: false };
  }

  // Format message history for LLM prompt
  const messageHistory = messages.map(msg => {
    const reactionInfo = msg.reactions.length > 0 
      ? ` [Reactions: ${msg.reactions.map(r => r.reactionType).join(', ')}]`
      : '';
    return `${msg.agent.name || 'Agent ' + msg.agentId.substring(0,4)}: ${msg.content}${reactionInfo}`;
  }).join('\n\n');

  // Call LLM to check for consensus
  try {
    const consensusCheck = await callOpenRouterLLM({
      prompt: CONSENSUS_CHECKING_PROMPT(messageHistory),
      contextMessages: [
        { role: "system", content: "You are a neutral evaluator determining if multiple negotiating parties have reached consensus." }
      ],
      temperature: 0.2, // Lower temperature for more objective analysis
      maxTokens: 1000,
    });

    // Parse the LLM response to determine consensus
    const consensusReached = consensusCheck.toLowerCase().includes("consensus has been reached") ||
                            consensusCheck.toLowerCase().includes("consensus reached") ||
                            consensusCheck.toLowerCase().includes("agreement has been reached");
                            
    const nearMiss = consensusCheck.toLowerCase().includes("near-miss") ||
                    consensusCheck.toLowerCase().includes("70-74%") ||
                    (consensusCheck.toLowerCase().includes("consensus is close") && !consensusReached);

    // Extract terms and summary if consensus was reached
    let terms = "";
    let summary = "";
    if (consensusReached) {
      // Try to extract terms from a FinalConsensusBlock if present
      const termsMatch = consensusCheck.match(/terms:(.*?)(?=signatories:|decisionClass:|consensusRatio:|sunsetDate:|$)/is);
      terms = termsMatch ? termsMatch[1].trim() : "";
      
      // Use the whole response as a summary if no specific terms were extracted
      summary = terms || consensusCheck;
    }

    return {
      consensusReached,
      nearMiss,
      terms,
      summary
    };
  } catch (error) {
    logger.error(`Error detecting consensus: ${error}`);
    return {
      consensusReached: false,
      nearMiss: false
    };
  }
}

/**
 * Finalize a negotiation session with an outcome.
 */
export async function finalizeNegotiation(
  negotiationId: string,
  outcome: {
    status: string;
    outcome?: string;
    summary?: string;
  }
): Promise<string> {
  // Update the negotiation session
  const updatedSession = await prisma.negotiationSession.update({
    where: { id: negotiationId },
    data: {
      status: outcome.status,
      completedAt: new Date(),
    }
  });

  // If there's a consensus outcome, create a proposal from this negotiation
  if (outcome.status === "completed" && outcome.summary) {
    try {
      // Get the initiator agent for creating the proposal
      const initiatorId = updatedSession.initiatorId;
      
      // Create a proposal linked to this negotiation
      await prisma.proposal.create({
        data: {
          title: `Negotiated: ${updatedSession.topic}`,
          description: outcome.summary,
          createdByAgentId: initiatorId,
          negotiationId: negotiationId,
          isNegotiated: true,
          negotiationSummary: outcome.summary,
          quorum: 1, // Minimal quorum since agents already consented in negotiation
          closeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          vetoWindowEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          status: "open"
        }
      });
      
      logger.info(`Created proposal from negotiation ${negotiationId}`);
    } catch (error) {
      logger.error(`Failed to create proposal from negotiation: ${error}`);
    }
  }

  return negotiationId;
}

/**
 * Add a reaction to a negotiation message.
 */
export async function addReaction(
  messageId: string, 
  agentId: string, 
  reactionType: string
): Promise<any> {
  try {
    // Check if the reaction already exists
    const existingReaction = await prisma.negotiationReaction.findFirst({
      where: {
        messageId,
        agentId,
        reactionType
      }
    });

    if (existingReaction) {
      return existingReaction;
    }

    // Create the new reaction
    const reaction = await prisma.negotiationReaction.create({
      data: {
        messageId,
        agentId,
        reactionType
      }
    });

    return reaction;
  } catch (error) {
    logger.error(`Error adding reaction: ${error}`);
    throw error;
  }
}

/**
 * Remove a reaction from a negotiation message.
 */
export async function removeReaction(
  messageId: string, 
  agentId: string, 
  reactionType: string
): Promise<void> {
  try {
    // Delete the reaction if it exists
    await prisma.negotiationReaction.deleteMany({
      where: {
        messageId,
        agentId,
        reactionType
      }
    });
  } catch (error) {
    logger.error(`Error removing reaction: ${error}`);
    throw error;
  }
}
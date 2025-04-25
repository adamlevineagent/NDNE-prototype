import { PrismaClient } from "@prisma/client";
import { callOpenRouterLLM } from "./llm-service";
import { logLlmUsage } from "./llm-logging-service";
import logger from "../utils/logger";
import { detectConsensus } from "./negotiation-service";

const prisma = new PrismaClient();

/**
 * Creates a formal proposal from a completed negotiation with consensus
 * @param negotiationId ID of the negotiation session to convert
 * @param options Optional parameters like title override
 * @returns ID of the created proposal
 */
export async function createProposalFromNegotiation(
  negotiationId: string,
  options?: {
    title?: string;
    autoCreate?: boolean;
  }
): Promise<{
  proposalId: string;
  proposalTitle: string;
  proposalDescription: string;
  status: string;
}> {
  try {
    // Fetch the negotiation session with messages
    const negotiation = await prisma.negotiationSession.findUnique({
      where: { id: negotiationId },
      include: {
        messages: {
          orderBy: { timestamp: "asc" },
          include: {
            agent: true,
            reactions: true
          }
        }
      }
    });

    if (!negotiation) {
      throw new Error(`Negotiation session ${negotiationId} not found`);
    }

    // Check if the negotiation has completed and reached consensus
    if (negotiation.status !== "completed" && !options?.autoCreate) {
      const consensusResult = await detectConsensus(negotiationId);
      
      if (!consensusResult.consensusReached) {
        throw new Error("Negotiation has not reached consensus yet and cannot be converted to a proposal");
      }
    }

    // Check if a proposal already exists for this negotiation
    const existingProposal = await prisma.proposal.findUnique({
      where: { negotiationId }
    });

    if (existingProposal) {
      return {
        proposalId: existingProposal.id,
        proposalTitle: existingProposal.title,
        proposalDescription: existingProposal.description,
        status: "existing"
      };
    }

    // Format negotiation messages for the LLM
    const messageHistory = negotiation.messages.map(msg => {
      const reactionInfo = msg.reactions.length > 0 
        ? ` [Reactions: ${msg.reactions.map(r => r.reactionType).join(', ')}]`
        : '';
      return `${msg.agent.name || 'Agent ' + msg.agentId.substring(0,4)}: ${msg.content}${reactionInfo}`;
    }).join('\n\n');

    // Generate proposal title and description using LLM
    const proposalContent = await generateProposalContent(
      negotiation.topic,
      messageHistory,
      options?.title
    );

    // Extract any monetary amounts if present in the negotiation
    const monetaryMatch = messageHistory.match(/\$([\d,]+(\.\d{1,2})?)/);
    const amount = monetaryMatch ? parseFloat(monetaryMatch[1].replace(/,/g, '')) : null;
    
    // Create the proposal
    const proposal = await prisma.proposal.create({
      data: {
        title: proposalContent.title,
        description: proposalContent.description,
        negotiationId: negotiationId,
        isNegotiated: true,
        negotiationSummary: proposalContent.summary,
        createdByAgentId: negotiation.initiatorId,
        // Set appropriate proposal parameters
        type: amount ? "monetary" : "standard",
        amount: amount,
        playMode: false,
        status: "open",
        quorum: Math.max(1, Math.ceil(negotiation.messages.filter(m => m.messageType === "agreement").length / 2)),
        threshold: 0.5,
        closeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        vetoWindowEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
      }
    });

    logger.info(`Created proposal ${proposal.id} from negotiation ${negotiationId}`);

    // If the negotiation wasn't already completed, mark it as completed
    if (negotiation.status !== "completed") {
      await prisma.negotiationSession.update({
        where: { id: negotiationId },
        data: {
          status: "completed",
          completedAt: new Date()
        }
      });
    }

    return {
      proposalId: proposal.id,
      proposalTitle: proposal.title,
      proposalDescription: proposal.description,
      status: "created"
    };
  } catch (error) {
    logger.error(`Failed to create proposal from negotiation: ${error}`);
    throw error;
  }
}

/**
 * Generate proposal title, description, and summary from negotiation history
 */
async function generateProposalContent(
  topic: string,
  negotiationHistory: string,
  titleOverride?: string
): Promise<{
  title: string;
  description: string;
  summary: string;
}> {
  try {
    // Create a system prompt for LLM
    const systemPrompt = `You are a governance summarization expert tasked with converting agent-to-agent negotiations into formal proposals.`;
    
    // Create the prompt for generating proposal content
    const prompt = `
Based on the following negotiation about "${topic}", create a formal proposal.

The negotiation history:
${negotiationHistory}

Extract the key points of consensus and generate:
1. A concise, descriptive title (10 words or less) that clearly represents the proposal
2. A formal proposal description (2-4 paragraphs) that includes:
   - The problem or opportunity being addressed
   - The proposed solution with specific details
   - Any key constraints or conditions
   - Expected benefits or outcomes
3. A brief summary (1 paragraph) that can be used in listings and notifications

Format your response as a valid JSON object with these fields:
{
  "title": "Concise proposal title",
  "description": "Formal multi-paragraph proposal description",
  "summary": "Brief one-paragraph summary"
}
`;

    // Call the LLM with the prompt
    const contextMessages = [
      { role: "system", content: systemPrompt }
    ];
    
    const response = await callOpenRouterLLM({
      prompt,
      contextMessages,
      temperature: 0.3, // Lower temperature for more consistent, structured outputs
      maxTokens: 1000,
    });

    // Parse the LLM response to extract the structured content
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON object found in LLM response");
      }
      
      const content = JSON.parse(jsonMatch[0]);
      
      // Validate the content has all required fields
      if (!content.title || !content.description || !content.summary) {
        throw new Error("LLM response missing required fields");
      }
      
      // If a title override was provided, use it instead
      if (titleOverride) {
        content.title = titleOverride;
      }
      
      return {
        title: content.title,
        description: content.description,
        summary: content.summary
      };
    } catch (parseError) {
      logger.error(`Failed to parse LLM response: ${parseError}`);
      
      // Provide fallback content if parsing fails
      return {
        title: titleOverride || `Proposal: ${topic}`,
        description: `This proposal was created from a negotiation on "${topic}". The negotiation reached consensus and is now formalized as a proposal for consideration by the community.`,
        summary: `Proposal based on negotiation about "${topic}" that reached consensus.`
      };
    }
  } catch (error) {
    logger.error(`Error generating proposal content: ${error}`);
    
    // Provide minimal fallback content
    return {
      title: titleOverride || `Proposal: ${topic}`,
      description: `This proposal was created from a negotiation on "${topic}".`,
      summary: `Proposal based on negotiation about "${topic}".`
    };
  }
}
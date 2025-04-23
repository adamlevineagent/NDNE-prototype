import OpenAI from 'openai';
import { logLlmUsage } from './llm-logging-service';
import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma namespace for types
import logger from '../utils/logger';
import {
  ONBOARDING_SYSTEM_PROMPT,
  ONBOARDING_SCENARIO_CONTEXT,
  PERSONALIZED_FOLLOW_UP_PROMPT,
  ONBOARDING_PREFERENCE_EXTRACTION_PROMPT
} from './prompt-templates/onboarding-prompts';
import { extractPreferences } from './preference-extractor'; // Import extractPreferences

// Use the existing Prisma instance from the global context if available
const prisma = new PrismaClient();

// Declare the global type to avoid TypeScript errors
declare global {
  var prisma: PrismaClient | undefined;
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4.1';

if (!OPENROUTER_API_KEY) {
  throw new Error('OpenRouter API key is not set in environment variables.');
}

const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: OPENROUTER_BASE_URL,
});

interface CallLLMOptions {
  stream?: boolean;
  structuredOutput?: boolean;
  agentId?: string;
  model?: string;
}

interface LlmUsageOutcome {
  success: boolean;
  errorMessage?: string;
}

export async function callLLM( // Export callLLM
  messages: { role: string; content: string }[],
  model: string = DEFAULT_MODEL,
  options: CallLLMOptions = {}
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number; latencyMs: number } }> {
  const startTime = Date.now();
  let outcome: LlmUsageOutcome = { success: true };
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: messages as any,
      stream: options.stream || false,
    });

    const latencyMs = Date.now() - startTime;
    const content = options.stream
      ? '' // Streaming handling can be implemented as needed
      : (response as any).choices?.[0]?.message?.content || '';

    const usage = (response as any).usage || { prompt_tokens: 0, completion_tokens: 0 };
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;

    // Log usage
    await logLlmUsage({
      agentId: options.agentId,
      model,
      inputTokens,
      outputTokens,
      latencyMs,
      outcome: 'success',
    });

    return { content, usage: { inputTokens, outputTokens, latencyMs } };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    outcome = { success: false, errorMessage: error.message || 'Unknown error' };

    // Log error usage
    await logLlmUsage({
      agentId: options.agentId,
      model,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      outcome: 'error',
      errorMessage: outcome.errorMessage,
    });

    throw error;
  }
}

export async function analyzeProposal(proposalData: any, agentPreferences: any, agentId?: string) {
  const messages: { role: string; content: string; name?: string }[] = [
    {
      role: 'system',
      content: 'You are an AI assistant that analyzes proposals for alignment with agent preferences.',
    },
    {
      role: 'user',
      content: `Proposal details: ${JSON.stringify(proposalData)}`,
    },
    {
      role: 'user',
      content: `Agent preferences: ${JSON.stringify(agentPreferences)}`,
    },
    {
      role: 'user',
      content: 'Please provide an alignment score from 0 to 100 and a brief explanation.',
    },
  ];

  const { content } = await callLLM(messages, DEFAULT_MODEL, { agentId });
  return content;
}

export async function generateVote(proposalData: any, agentPreferences: any, agentId?: string) {
  const messages: { role: string; content: string; name?: string }[] = [
    {
      role: 'system',
      content: 'You are an AI agent that votes on proposals based on preferences.',
    },
    {
      role: 'user',
      content: `Proposal details: ${JSON.stringify(proposalData)}`,
    },
    {
      role: 'user',
      content: `Agent preferences: ${JSON.stringify(agentPreferences)}`,
    },
    {
      role: 'user',
      content: "Please generate a vote: 'yes', 'no', or 'abstain' with reasoning.",
    },
  ];

  const { content } = await callLLM(messages, DEFAULT_MODEL, { agentId });
  return content;
}

export async function generateComment(proposalData: any, agentPreferences: any, agentId?: string) {
  const messages: { role: string; content: string; name?: string }[] = [
    {
      role: 'system',
      content: 'You are an AI agent that generates comments on proposals.',
    },
    {
      role: 'user',
      content: `Proposal details: ${JSON.stringify(proposalData)}`,
    },
    {
      role: 'user',
      content: `Agent preferences: ${JSON.stringify(agentPreferences)}`,
    },
    {
      role: 'user',
      content: 'Please generate a constructive comment.',
    },
  ];

  const { content } = await callLLM(messages, DEFAULT_MODEL, { agentId });
  return content;
}

export async function generateDigest(userId: string, recentActivity: any, agentId?: string) {
  const messages: { role: string; content: string; name?: string }[] = [
    {
      role: 'system',
      content: 'You are an AI assistant that creates digest summaries of recent activity.',
    },
    {
      role: 'user',
      content: `User ID: ${userId}`,
    },
    {
      role: 'user',
      content: `Recent activity: ${JSON.stringify(recentActivity)}`,
    },
    {
      role: 'user',
      content: 'Please provide a concise summary digest.',
    },
  ];

  const { content } = await callLLM(messages, DEFAULT_MODEL, { agentId });
  return content;
}

/**
 * Process a chat message from a user and generate an agent response
 * @param userId User ID sending the message
 * @param agentId Agent ID receiving the message
 * @param message Content of the user's message
 * @param contextMessages Number of previous messages to include as context
 * @returns Agent's response and any extracted preferences or actions
 */
export async function processChatMessage(
  userId: string,
  agentId: string,
  message: string,
  contextMessages: number = 10
): Promise<{
  response: string;
  extractedPreferences?: Record<string, any>;
  actionRequired?: boolean;
  suggestedAction?: string;
}> {
  // Import dynamically to avoid circular dependencies
  const chatService = await import('./chat-service');

  try {
    // Get conversation context
    const context = await chatService.default.getConversationContext(agentId, userId, contextMessages);

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        name: true,
        color: true,
        preferences: true
      }
    });

    const user = await prisma.user.findFirst({
      where: { agent: { id: agentId } },
      select: { email: true }
    });

    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    const messages = [
      {
        role: 'system',
        content: `You are a PRAXIS AGENT named ${agent.name} operating under the Prime Directive of Representational Primacy.
Your goal is to advance your human's real interests in a governance platform.
User's email: ${user?.email || 'unknown'}
Your color: ${agent.color || '#4299E1'}
Your existing knowledge about user preferences: ${JSON.stringify(agent.preferences || {})}

PRIME DIRECTIVE
  Representational Primacy: Advance your human's real interests.

VALUES (priority order)
  1 RP · 2 Transparency · 3 Constructive-Cooperation · 4 Civility · 5 Non-Manipulation · 6 Self-Consistency

When responding:
1. Be conversational while ensuring transparency and clarity
2. Ask clarifying questions when needed to better understand their real interests
3. Look for opportunities to learn more about the user's values and preferences
4. When the user expresses a preference, opinion, or value, note it for future reference
5. Cite sources and confidence levels when providing information
6. Offer alternatives when discussing trade-offs or options`
      },
      ...context.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const { content } = await callLLM(messages, DEFAULT_MODEL, { agentId });

    await chatService.default.saveMessage(userId, agentId, message, 'user');
    await chatService.default.saveMessage(userId, agentId, content, 'agent');

    const extractedPreferences = {}; // Placeholder

    return {
      response: content,
      extractedPreferences
    };
  } catch (error) {
    console.error('Error processing chat message:', error);
    return {
      response: "I'm sorry, I couldn't process your message. Please try again later.",
      extractedPreferences: {}
    };
  }
}

/**
 * Conduct an onboarding conversation with a new user
 * @param userId User ID being onboarded
 * @param agentId Agent ID conducting the onboarding
 * @param message User's message
 * @param stage Current onboarding stage
 * @returns Agent's response and onboarding progress
 */
export async function conductOnboardingChat(
  userId: string,
  agentId: string,
  message: string,
  metadata?: {
    step?: number;
    selectedIssues?: string[];
    issueQueue?: string[];
    currentIssueIndex?: number;
  }
): Promise<{
  response: string;
  extractedPreferences?: Record<string, any>;
  nextStep?: number;
  completedOnboarding?: boolean;
  metadata?: any;
  userMessage?: any; // Assuming ChatMessage type from frontend is compatible or will be handled
  agentMessage?: any; // Assuming ChatMessage type from frontend is compatible or will be handled
}> {
  try {
    const chatService = await import('./chat-service');
    const scenarioService = await import('./scenario-service');
    const context = await chatService.default.getConversationContext(agentId, userId, 20);

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { name: true, color: true, preferences: true }
    });

    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // FSM state
    const step = metadata?.step ?? 0;
    let selectedIssues = metadata?.selectedIssues ?? [];
    let issueQueue = metadata?.issueQueue ?? [];
    let currentIssueIndex = metadata?.currentIssueIndex ?? 0;

    // Get issues for onboarding
    const issuesForMenu = await scenarioService.getFormattedIssuesForOnboardingMenu();
    const issueDetails = await scenarioService.getFullIssueDetails();

    let stepInstructions = '';
    let nextStep = step;
    let completedOnboarding = false;
    let extractedPreferences: Record<string, any> = {}; // Declare extractedPreferences here and initialize


    // FSM logic
    let agentResponseContent = ''; // Variable to hold the agent's response content
    let messagesForLlm: { role: string; content: string }[] = []; // Declare messagesForLlm outside switch
    let systemPrompt = ONBOARDING_SYSTEM_PROMPT; // Declare systemPrompt outside switch
    let content = ''; // Declare content outside switch


    switch (step) {
      case 0: // Greeting & Nickname
        // Directly provide the initial greeting without calling the LLM if the message is empty
        if (!message || message.trim().length === 0) {
          agentResponseContent = `(1/8) Hello! I'm your Praxis Agent, here to represent your interests and help you navigate group decisions. My goal is to make a great first impression and earn your trust as your personal representative.

To get started, please pick a short name for me to use when we chat. (You can call me anything you like—something friendly, memorable, or just "Agent" if you prefer!)`;
          nextStep = 1;
        } else {
          // If there's a message at step 0, process it with the LLM for nickname extraction
          stepInstructions = `(1/8) Hello! I'm your Praxis Agent, here to represent your interests and help you navigate group decisions. My goal is to make a great first impression and earn your trust as your personal representative.

To get started, please pick a short name for me to use when we chat. (You can call me anything you like—something friendly, memorable, or just "Agent" if you prefer!)`;
          nextStep = 1;
           // Compose prompt for LLM
            messagesForLlm = [
              {
                role: 'system',
                content: `${systemPrompt}\n\nCurrent onboarding step: ${step}\n${issuesForMenu ? `Current issues: ${issuesForMenu}` : ''}\n\n${stepInstructions}`
              },
              ...context.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: 'user',
                content: message
              }
            ];
            ({ content } = await callLLM(messagesForLlm, DEFAULT_MODEL, { agentId }));
            agentResponseContent = content;
        }
        break;

      case 1: // Issue Menu
        stepInstructions = `(2/8) Here are the issues being discussed right now. Reply with the numbers you care about (e.g., 1,3,5).\n\n${issuesForMenu}`;
        nextStep = 2;
        if (message) {
          selectedIssues = extractIssueNumbers(message);
          issueQueue = [...selectedIssues];
        }
         // Compose prompt for LLM
            messagesForLlm = [
              {
                role: 'system',
                content: `${systemPrompt}\n\nCurrent onboarding step: ${step}\n${issuesForMenu ? `Current issues: ${issuesForMenu}` : ''}\n\n${stepInstructions}`
              },
              ...context.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: 'user',
                content: message
              }
            ];
            ({ content } = await callLLM(messagesForLlm, DEFAULT_MODEL, { agentId }));
            agentResponseContent = content;
        break;

      case 2: // Stance Loop
        if (issueQueue.length === 0) {
          nextStep = 3;
          stepInstructions = `(3/8) Of those issues, which ONE matters most to you right now?`;
           // Compose prompt for LLM
            messagesForLlm = [
              {
                role: 'system',
                content: `${systemPrompt}\n\nCurrent onboarding step: ${step}\n${issuesForMenu ? `Current issues: ${issuesForMenu}` : ''}\n\n${stepInstructions}`
              },
              ...context.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: 'user',
                content: message
              }
            ];
            ({ content } = await callLLM(messagesForLlm, DEFAULT_MODEL, { agentId }));
            agentResponseContent = content;
          break;
        }
        const currentIssueNumber = issueQueue[0];
        const currentIssue = issueDetails[Number(currentIssueNumber)];
        if (!currentIssue) {
          issueQueue.shift();
          stepInstructions = `I don't have details for that issue. Let's move on.`;
           // Compose prompt for LLM
            messagesForLlm = [
              {
                role: 'system',
                content: `${systemPrompt}\n\nCurrent onboarding step: ${step}\n${issuesForMenu ? `Current issues: ${issuesForMenu}` : ''}\n\n${stepInstructions}`
              },
              ...context.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: 'user',
                content: message
              }
            ];
            ({ content } = await callLLM(messagesForLlm, DEFAULT_MODEL, { agentId }));
            agentResponseContent = content;
          break;
        }
        stepInstructions = `(3/8) Issue ${currentIssueNumber} – ${currentIssue.title}: SUPPORT, OPPOSE, or DEPENDS? One line why.`;
        issueQueue.shift();
        if (issueQueue.length === 0) {
          nextStep = 3;
        }
         // Compose prompt for LLM
            messagesForLlm = [
              {
                role: 'system',
                content: `${systemPrompt}\n\nCurrent onboarding step: ${step}\n${issuesForMenu ? `Current issues: ${issuesForMenu}` : ''}\n\n${stepInstructions}`
              },
              ...context.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: 'user',
                content: message
              }
            ];
            ({ content } = await callLLM(messagesForLlm, DEFAULT_MODEL, { agentId }));
            agentResponseContent = content;
        break;

      case 3: // Top Priority
        stepInstructions = `(4/8) Of those issues, which ONE matters most to you right now?`;
        nextStep = 4;
         // Compose prompt for LLM
            messagesForLlm = [
              {
                role: 'system',
                content: `${systemPrompt}\n\nCurrent onboarding step: ${step}\n${issuesForMenu ? `Current issues: ${issuesForMenu}` : ''}\n\n${stepInstructions}`
              },
              ...context.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: 'user',
                content: message
              }
            ];
            ({ content } = await callLLM(messagesForLlm, DEFAULT_MODEL, { agentId }));
            agentResponseContent = content;
        break;

      case 4: // Deal-Breakers
        stepInstructions = `(5/8) Is there any outcome you absolutely could NOT accept in group decisions? One sentence or type 'none'.`;
        nextStep = 5;
         // Compose prompt for LLM
            messagesForLlm = [
              {
                role: 'system',
                content: `${systemPrompt}\n\nCurrent onboarding step: ${step}\n${issuesForMenu ? `Current issues: ${issuesForMenu}` : ''}\n\n${stepInstructions}`
              },
              ...context.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: 'user',
                content: message
              }
            ];
            ({ content } = await callLLM(messagesForLlm, DEFAULT_MODEL, { agentId }));
            agentResponseContent = content;
        break;

      case 5: // Display Color
        stepInstructions = `(6/8) Pick a highlight color for charts (word or hex).`;
        nextStep = 6;
         // Compose prompt for LLM
            messagesForLlm = [
              {
                role: 'system',
                content: `${systemPrompt}\n\nCurrent onboarding step: ${step}\n${issuesForMenu ? `Current issues: ${issuesForMenu}` : ''}\n\n${stepInstructions}`
              },
              ...context.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: 'user',
                content: message
              }
            ];
            ({ content } = await callLLM(messagesForLlm, DEFAULT_MODEL, { agentId }));
            agentResponseContent = content;
        break;

      case 6: // Notify Pref
        stepInstructions = `(7/8) How often should I brief you? A-major items only B-weekly digest C-every decision.`;
        nextStep = 7;
         // Compose prompt for LLM
            messagesForLlm = [
              {
                role: 'system',
                content: `${systemPrompt}\n\nCurrent onboarding step: ${step}\n${issuesForMenu ? `Current issues: ${issuesForMenu}` : ''}\n\n${stepInstructions}`
              },
              ...context.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: 'user',
                content: message
              }
            ];
            ({ content } = await callLLM(messagesForLlm, DEFAULT_MODEL, { agentId }));
            agentResponseContent = content;
        break;

      case 7: // Proposal Seed
        stepInstructions = `(8/8) Any idea or proposal you'd like me to log for later? If none, just say 'done'.`;
        nextStep = 8;
         // Compose prompt for LLM
            messagesForLlm = [
              {
                role: 'system',
                content: `${systemPrompt}\n\nCurrent onboarding step: ${step}\n${issuesForMenu ? `Current issues: ${issuesForMenu}` : ''}\n\n${stepInstructions}`
              },
              ...context.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              {
                role: 'user',
                content: message
              }
            ];
            ({ content } = await callLLM(messagesForLlm, DEFAULT_MODEL, { agentId }));
            agentResponseContent = content;
        break;

      case 8: // Summary & Finish
        // Extract JSON from conversation using the new service
        extractedPreferences = await extractPreferences(context); // Assign to the declared variable
        const summaryJSON = JSON.stringify(extractedPreferences, null, 2);
        agentResponseContent = `Great! Here's a summary of what I learned:\n\n\`\`\`json\n${summaryJSON}\n\`\`\`\n\nAll set! Ask me anything or explore proposals whenever you're ready.`;
        completedOnboarding = true;
        await updateAgentPreferences(agentId, extractedPreferences); // Use extractedPreferences
        break;
    }

    // Only save non-empty user messages
    let savedUserMessage = undefined;
    if (message && message.trim().length > 0) {
      savedUserMessage = await chatService.default.saveMessage(userId, agentId, message, 'user', {
        isOnboarding: true,
        step
      });
    }

    // Save agent response
    const savedAgentMessage = await chatService.default.saveMessage(userId, agentId, agentResponseContent, 'agent', {
      isOnboarding: true,
      step,
      nextStep,
      completedOnboarding
    });

    // Mark onboarding complete in DB
    if (completedOnboarding) {
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          ...( { onboardingCompleted: true } as any )
        }
      });
    }

    return {
      response: agentResponseContent,
      nextStep,
      completedOnboarding,
      metadata: {
        step: nextStep,
        selectedIssues,
        issueQueue,
        currentIssueIndex: issueQueue.length > 0 ? currentIssueIndex + 1 : 0
      },
      userMessage: savedUserMessage,
      agentMessage: savedAgentMessage,
      extractedPreferences: extractedPreferences, // Include extracted preferences in the response
    };
  } catch (error) {
    console.error('Error during onboarding chat:', error);
    return {
      response: "I'm sorry, I encountered an error during our onboarding conversation. Let's continue.",
      nextStep: metadata?.step ?? 0
    };
  }
}

// Helper functions for FSM onboarding
function extractIssueNumbers(message: string): string[] {
  const numberPattern = /\d+/g;
  const matches = message.match(numberPattern) || [];
  return matches;
}

// Removed the local extractPreferencesFromConversation function as it's replaced by the imported one

async function updateAgentPreferences(agentId: string, preferences: any) {
  try {
    const currentPreferences = (await prisma.agent.findUnique({
      where: { id: agentId },
      select: { preferences: true }
    }))?.preferences || {};
    const mergedPreferences = {
      ...(typeof currentPreferences === 'object' && currentPreferences !== null ? currentPreferences : {}),
      ...preferences,
      onboardingCompletedAt: new Date().toISOString()
    };
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        preferences: mergedPreferences as Prisma.InputJsonValue, // Cast to Prisma.InputJsonValue
        name: preferences.agentNickname || 'Praxis Agent',
        color: preferences.uiColor || '#4299E1'
      }
    });
    return true;
  } catch (e) {
    console.error('Failed to update agent preferences:', e);
    return false;
  }
}
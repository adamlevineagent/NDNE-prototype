import OpenAI from 'openai';
import { logLlmUsage } from './llm-logging-service';
import { PrismaClient } from '@prisma/client';

// Use the existing Prisma instance from the global context if available
const prisma = new PrismaClient();

// Declare the global type to avoid TypeScript errors
declare global {
  var prisma: PrismaClient | undefined;
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL || 'gpt-4o-mini';

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

async function callLLM(
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
    
    // Get agent details
    // Get agent details with a query that works with the current schema
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        name: true,
        color: true,
        preferences: true
      }
    });
    
    // Get user email separately since the schema might not support the relation yet
    const user = await prisma.user.findFirst({
      where: { agent: { id: agentId } }, // Using 'agent' instead of 'agents'
      select: { email: true }
    });
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Create prompt for the LLM
    const messages = [
      {
        role: 'system',
        content: `You are an AI agent named ${agent.name} representing a user in a governance platform.
Your primary goal is to have a helpful conversation with your user.
User's email: ${user?.email || 'unknown'}
Your personality: friendly, thoughtful, and thorough
Your knowledge about the user so far: {}
Your existing preferences: ${JSON.stringify(agent.preferences || {})}

When responding:
1. Be conversational but concise
2. Ask clarifying questions when needed
3. Look for opportunities to learn more about the user's preferences
4. When the user expresses a preference, opinion, or value, note it for future reference`
      },
      // Add context from previous messages
      ...context.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      // Add the new message
      {
        role: 'user',
        content: message
      }
    ];
    
    // Call LLM
    const { content } = await callLLM(messages, DEFAULT_MODEL, { agentId });
    
    // Save the user message
    await chatService.default.saveMessage(userId, agentId, message, 'user');
    
    // Save the agent response
    await chatService.default.saveMessage(userId, agentId, content, 'agent');
    
    // Extract preferences (in a real implementation, this would use another LLM call)
    // This is just a placeholder for now
    const extractedPreferences = {};
    
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
  stage: 'initial' | 'preferences' | 'priorities' | 'confirmation' | 'complete' = 'initial'
): Promise<{
  response: string;
  extractedPreferences?: Record<string, any>;
  nextStage?: 'initial' | 'preferences' | 'priorities' | 'confirmation' | 'complete';
  completedOnboarding?: boolean;
}> {
  // Import dynamically to avoid circular dependencies
  const chatService = await import('./chat-service');
  
  try {
    // Get conversation context
    const context = await chatService.default.getConversationContext(agentId, userId, 20);
    
    // Get agent details
    // Get agent details with a query that works with the current schema
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        name: true,
        preferences: true
      }
    });
    
    // Get user email separately
    const user = await prisma.user.findFirst({
      where: { agent: { id: agentId } }, // Using 'agent' instead of 'agents'
      select: { email: true }
    });
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Create stage-specific instructions
    let stageInstructions = '';
    let progress = 0;
    
    switch (stage) {
      case 'initial':
        stageInstructions = `
This is the first stage of onboarding. Introduce yourself warmly and explain that you'll be helping the user set up their preferences.
Ask just ONE question to start understanding their priorities. Focus on what matters most to them in decision-making.`;
        progress = 10;
        break;
        
      case 'preferences':
        stageInstructions = `
This is the preferences stage of onboarding (about 30% complete).
Based on previous messages, ask follow-up questions about specific preferences like risk tolerance, transparency values, etc.
Ask just ONE focused question per message.`;
        progress = 30;
        break;
        
      case 'priorities':
        stageInstructions = `
This is the priorities stage of onboarding (about 60% complete).
Now focus on understanding how the user prioritizes their various preferences when there are conflicts.
Ask about trade-offs they would make between different values.`;
        progress = 60;
        break;
        
      case 'confirmation':
        stageInstructions = `
This is the final confirmation stage of onboarding (about 90% complete).
Summarize what you've learned about their preferences and priorities.
Ask if everything sounds correct and if they want to make any adjustments.
If they confirm everything is correct, let them know onboarding is complete and include "ONBOARDING_COMPLETE" in your response.`;
        progress = 90;
        break;
    }
    
    // Create prompt for the LLM
    const messages = [
      {
        role: 'system',
        content: `You are an AI agent named ${agent.name} conducting an onboarding conversation with a new user.
Your goal is to gather information about the user's preferences and priorities in a conversational way.
Current onboarding stage: ${stage} (progress: ${progress}%)

${stageInstructions}

Important:
- Be conversational and warm, not like a form or survey
- Ask only ONE question per message
- Acknowledge their responses before asking the next question
- Don't rush through all the questions at once`
      },
      // Add context from previous messages
      ...context.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      // Add the new message
      {
        role: 'user',
        content: message
      }
    ];
    
    // Call LLM
    const { content } = await callLLM(messages, DEFAULT_MODEL, { agentId });
    
    // Save the user message
    await chatService.default.saveMessage(userId, agentId, message, 'user', { isOnboarding: true, stage });
    
    // Check if onboarding is complete
    const isComplete = content.includes('ONBOARDING_COMPLETE');
    
    // Determine next stage
    let nextStage = stage;
    let completedOnboarding = false;
    
    if (isComplete) {
      nextStage = 'complete';
      completedOnboarding = true;
      
      // Update agent record to mark onboarding as completed
      // Using a type assertion until the migration is applied
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          // Type assertion to bypass TypeScript checks until migration is applied
          ...(({ onboardingCompleted: true } as any))
        }
      });
    } else {
      // Simple progression logic - in a real implementation this would be more sophisticated
      // and would be based on the content of the conversation
      if (context.length >= 2 && stage === 'initial') {
        nextStage = 'preferences';
      } else if (context.length >= 6 && stage === 'preferences') {
        nextStage = 'priorities';
      } else if (context.length >= 10 && stage === 'priorities') {
        nextStage = 'confirmation';
      }
    }
    
    // Save the agent response with metadata
    await chatService.default.saveMessage(userId, agentId, content, 'agent', {
      isOnboarding: true,
      stage,
      nextStage,
      completedOnboarding
    });
    
    // Extract preferences (placeholder - would use LLM in real implementation)
    const extractedPreferences = {};
    
    return {
      response: content,
      extractedPreferences,
      nextStage,
      completedOnboarding
    };
  } catch (error) {
    console.error('Error during onboarding chat:', error);
    return {
      response: "I'm sorry, I encountered an error during our onboarding conversation. Let's try again.",
      nextStage: stage
    };
  }
}
import OpenAI from 'openai';
import { logLlmUsage } from './llm-logging-service';

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
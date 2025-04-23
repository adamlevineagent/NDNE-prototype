import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface LlmLogData {
  agentId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  outcome: 'success' | 'error';
  errorMessage?: string;
}

/**
 * Logs LLM usage details to the database.
 * @param data - The LLM usage data to log.
 */
export async function logLlmUsage(data: LlmLogData): Promise<void> {
  try {
    await prisma.llmUsageLog.create({
      data: {
        agentId: data.agentId,
        model: data.model,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        latencyMs: data.latencyMs,
        outcome: data.outcome,
        errorMessage: data.errorMessage,
      },
    });
    console.log('LLM usage logged successfully.'); // Basic console log for confirmation
  } catch (error) {
    console.error('Failed to log LLM usage:', error);
    // Depending on requirements, might re-throw or handle differently
  }
}

// Example usage (for demonstration purposes, remove later)
/*
logLlmUsage({
  agentId: 'some-agent-uuid',
  model: 'openai/gpt-4o',
  inputTokens: 500,
  outputTokens: 150,
  latencyMs: 1234,
  outcome: 'success',
});

logLlmUsage({
  model: 'anthropic/claude-3-opus', // System action, no agentId
  inputTokens: 100,
  outputTokens: 0,
  latencyMs: 500,
  outcome: 'error',
  errorMessage: 'API connection failed',
});
*/
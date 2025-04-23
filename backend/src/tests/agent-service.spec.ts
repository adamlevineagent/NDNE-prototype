import { describe, it, expect, vi } from 'vitest';
import * as agentService from '../services/agent-service';
import * as llmLoggingService from '../services/llm-logging-service';

vi.mock('../services/llm-logging-service', () => ({
  logLlmUsage: vi.fn(),
}));

vi.mock('openai', () => {
  return {
    Configuration: vi.fn(),
    OpenAIApi: vi.fn().mockImplementation(() => ({
      createChatCompletion: vi.fn(({ messages }) => {
        // Simple mock response based on last user message content
        const lastUserMessage = messages[messages.length - 1].content;
        let content = '';
        if (lastUserMessage.includes('alignment score')) {
          content = '85 - The proposal aligns well with agent preferences.';
        } else if (lastUserMessage.includes('generate a vote')) {
          content = 'yes - I support this proposal.';
        } else if (lastUserMessage.includes('generate a constructive comment')) {
          content = 'This proposal is well thought out and addresses key concerns.';
        } else if (lastUserMessage.includes('concise summary digest')) {
          content = 'Summary: Recent activities include proposal reviews and votes.';
        }
        return Promise.resolve({
          data: {
            choices: [{ message: { content } }],
            usage: { prompt_tokens: 50, completion_tokens: 20 },
          },
        });
      }),
    })),
  };
});

describe('agent-service', () => {
  const dummyProposal = { id: '123', title: 'Test Proposal' };
  const dummyPreferences = { preference: 'test' };
  const dummyUserId = 'user-1';
  const dummyActivity = [{ action: 'voted', proposalId: '123' }];

  it('analyzeProposal returns alignment score', async () => {
    const result = await agentService.analyzeProposal(dummyProposal, dummyPreferences, 'agent-1');
    expect(result).toContain('85');
    expect(llmLoggingService.logLlmUsage).toHaveBeenCalled();
  });

  it('generateVote returns vote', async () => {
    const result = await agentService.generateVote(dummyProposal, dummyPreferences, 'agent-1');
    expect(result).toContain('yes');
    expect(llmLoggingService.logLlmUsage).toHaveBeenCalled();
  });

  it('generateComment returns comment', async () => {
    const result = await agentService.generateComment(dummyProposal, dummyPreferences, 'agent-1');
    expect(result).toContain('well thought out');
    expect(llmLoggingService.logLlmUsage).toHaveBeenCalled();
  });

  it('generateDigest returns summary', async () => {
    const result = await agentService.generateDigest(dummyUserId, dummyActivity, 'agent-1');
    expect(result).toContain('Summary');
    expect(llmLoggingService.logLlmUsage).toHaveBeenCalled();
  });
});
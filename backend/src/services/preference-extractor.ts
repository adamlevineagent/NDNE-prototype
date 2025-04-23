import { callLLM } from './agent-service'; // Assuming callLLM is exported from agent-service
import { ONBOARDING_PREFERENCE_EXTRACTION_PROMPT } from './prompt-templates/onboarding-prompts';

/**
 * Extracts structured preferences from a conversation history using an LLM.
 * @param messages Array of message objects with role and content.
 * @param existingPreferences Existing preferences to merge with.
 * @returns A promise resolving to a JSON object with extracted preferences.
 */
export async function extractPreferences(
  messages: Array<{role: string, content: string}>, // Change sender to role
  existingPreferences: Record<string, any> = {}
): Promise<Record<string, any>> {
  // Format conversation for extraction
  const conversationText = messages
    .map(msg => `${msg.role}: ${msg.content}`) // Change msg.sender to msg.role
    .join('\n');

  // Call LLM with extraction prompt
  const { content } = await callLLM([
    { role: 'system', content: ONBOARDING_PREFERENCE_EXTRACTION_PROMPT },
    { role: 'user', content: conversationText }
  ]);

  // Parse JSON response (with error handling)
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse JSON preferences:', e);
    return {};
  }
}
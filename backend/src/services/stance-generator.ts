import { PrismaClient } from "@prisma/client";
import { callOpenRouterLLM } from "./llm-service";
import { logLlmUsage } from "./llm-logging-service";
import logger from "../utils/logger";

const prisma = new PrismaClient();

/**
 * Interface for a structured negotiation stance
 */
export interface NegotiationStance {
  position: string;
  strength: 'strong' | 'moderate' | 'weak';
  flexibility: 'high' | 'medium' | 'low';
  priorities: Array<{key: string, importance: number}>;
  constraints: string[];
  dealBreakers: string[];
}

/**
 * Generate a negotiation stance for an agent based on their preferences and the negotiation topic
 */
export async function generateNegotiationStance(
  agentId: string, 
  topic: string,
  context?: string
): Promise<NegotiationStance> {
  try {
    // Fetch the agent's preferences
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Extract relevant preferences, especially the issuesMatrix
    const preferences = agent.preferences as any;
    const issuesMatrix = preferences.issuesMatrix || {};

    // Create the prompt for the LLM
    const prompt = `
Based on the user's preferences and the negotiation topic, generate a stance that represents their interests.

Negotiation Topic: ${topic}
${context ? `Context: ${context}\n` : ''}

User's Preferences:
${JSON.stringify(preferences, null, 2)}

Issues Matrix (key priorities):
${JSON.stringify(issuesMatrix, null, 2)}

Generate a structured negotiation stance that includes:
1. A clear position statement
2. Strength of the position (strong, moderate, or weak)
3. Flexibility level (high, medium, or low)
4. Prioritized list of issues (keys and importance values from 1-10)
5. Constraints or limitations
6. Deal breakers (if any)

Return the stance as a valid JSON object with the following structure:
{
  "position": "...",
  "strength": "strong|moderate|weak",
  "flexibility": "high|medium|low",
  "priorities": [{"key": "...", "importance": number}, ...],
  "constraints": ["...", ...],
  "dealBreakers": ["...", ...]
}
`;

    // Create system prompt for LLM
    const systemPrompt = "You are a negotiation stance analyzer that converts user preferences into structured negotiation positions.";
    
    // Call the LLM with the prompt
    const contextMessages = [
      { role: "system", content: systemPrompt }
    ];
    
    const response = await callOpenRouterLLM({
      prompt,
      contextMessages,
      temperature: 0.2, // Lower temperature for more consistent, structured outputs
      maxTokens: 1000,
    });

    // Parse the LLM response to extract the structured stance
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON object found in LLM response");
      }
      
      const stance = JSON.parse(jsonMatch[0]) as NegotiationStance;
      
      // Validate the stance has all required fields
      if (!stance.position || !stance.strength || !stance.flexibility || !Array.isArray(stance.priorities)) {
        throw new Error("LLM response missing required fields in stance");
      }
      
      return stance;
    } catch (parseError) {
      logger.error(`Failed to parse LLM response into stance: ${parseError}`);
      // Fallback to a default stance if parsing fails
      return {
        position: "Unable to determine specific position based on user preferences",
        strength: "moderate",
        flexibility: "medium",
        priorities: Object.entries(issuesMatrix).map(([key, value]) => ({
          key,
          importance: typeof value === 'number' ? value : 5
        })),
        constraints: ["Must respect user's explicit preferences"],
        dealBreakers: []
      };
    }
  } catch (error) {
    logger.error(`Error generating negotiation stance: ${error}`);
    throw error;
  }
}

/**
 * Generate a natural language explanation of a stance based on the agent's preferences
 */
export async function explainStanceReasoning(
  agentId: string,
  stance: NegotiationStance
): Promise<string> {
  try {
    // Fetch the agent's preferences
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Extract preferences
    const preferences = agent.preferences as any;

    // Create the prompt for the LLM
    const prompt = `
Explain why this negotiation stance accurately represents the user's preferences and interests.

Negotiation Stance:
${JSON.stringify(stance, null, 2)}

User's Preferences:
${JSON.stringify(preferences, null, 2)}

Provide a clear, concise explanation that connects the stance's position, priorities, and constraints to specific elements in the user's preferences. Explain the reasoning behind the stance's strength and flexibility levels.
`;

    // Create system prompt for LLM
    const systemPrompt = "You are a negotiation analyst that explains how stances represent user preferences.";
    
    // Call the LLM with the prompt
    const contextMessages = [
      { role: "system", content: systemPrompt }
    ];
    
    const response = await callOpenRouterLLM({
      prompt,
      contextMessages,
      temperature: 0.7, // Higher temperature for more natural language
      maxTokens: 800,
    });

    return response;
  } catch (error) {
    logger.error(`Error generating stance explanation: ${error}`);
    throw error;
  }
}
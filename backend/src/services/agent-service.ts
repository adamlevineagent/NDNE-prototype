import OpenAI from 'openai';
import { logLlmUsage } from './llm-logging-service';
import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma namespace for types
import logger from '../utils/logger';
import {
  ONBOARDING_SYSTEM_PROMPT,
  ONBOARDING_SCENARIO_CONTEXT,
  PERSONALIZED_FOLLOW_UP_PROMPT,
  ONBOARDING_PREFERENCE_EXTRACTION_PROMPT,
  BALANCED_ISSUE_PRESENTATION
} from './prompt-templates/onboarding-prompts';
// import { extractPreferences } from './preference-extractor'; // Import extractPreferences

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
    // Import services
    const chatService = await import('./chat-service');
    const scenarioService = await import('./scenario-service');

    // [DEBUG] Onboarding FSM entry
    console.log('[Onboarding/FSM] userId:', userId, 'agentId:', agentId, 'step:', metadata?.step ?? 0, 'message:', message?.slice(0, 100));

    // Get conversation context
    const context = await chatService.default.getConversationContext(agentId, userId, 20);

    // Get agent details
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { name: true, color: true, preferences: true }
    });

    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Initialize or use provided metadata
    const step = metadata?.step ?? 0;
    let selectedIssues = metadata?.selectedIssues ?? [];
    let issueQueue = metadata?.issueQueue ?? [];
    let currentIssueIndex = metadata?.currentIssueIndex ?? 0;

    // Get issues from database
    const issuesForMenu = await scenarioService.default.getFormattedIssuesForOnboardingMenu();
    const issueDetails = await scenarioService.default.getFullIssueDetails();

    // Step-specific instructions based on the 0-7 FSM
    let stepInstructions = '';
    let agentResponseContent = ''; // Variable to hold the agent's response content
    let nextStep = step;
    let completedOnboarding = false;
    let preferences: Record<string, any> = {}; // Declare preferences here and initialize
    let useHardcodedResponse = false; // Flag to determine if we should bypass LLM for certain responses


    // FSM logic
    switch (step) {
      case 0: // Collect User Name
        stepInstructions = `(1/9) Welcome! What is your name?`;
        nextStep = 1;
        // No processing of message needed in this step, just asking for the name.
        break;

      case 1: // Greeting & Nickname
        stepInstructions = `(2/9) Nice to meet you, ${message.trim()}! I'm your Praxis Agent. Pick a short name for me when we chat.`;
        nextStep = 2;

        // Save user's name
        if (message && message.trim()) {
          try {
            await prisma.user.update({
              where: { id: userId },
              data: { name: message.trim() }
            });
            console.log(`[Onboarding/FSM] Updated user name to: ${message.trim()}`);
          } catch (err) {
            console.error('[Onboarding/FSM] Failed to update user name:', err);
          }
        }

        // Update agent name immediately if user provided one in this step (if they skipped step 0)
        // This logic might need refinement based on how strictly we enforce step order.
        // For now, assuming step 1 message is either agent name or user name if step 0 was just completed.
        // We'll prioritize saving user name if step 0 was just completed.
        // If step was 1 and message is not just a name (e.g., "Call me AgentX"), update agent name.
        if (step === 1 && message && message.trim() && !/^\s*\S+\s*$/.test(message.trim())) {
             const name = message.trim();
             try {
               await prisma.agent.update({
                 where: { id: agentId },
                 data: { name }
               });
               console.log(`[Onboarding/FSM] Updated agent name to: ${name}`);
             } catch (err) {
               console.error('[Onboarding/FSM] Failed to update agent name:', err);
             }
        }
        break;

      case 2: // Issue Menu
        stepInstructions = `(3/9) Here are the issues being discussed right now. Reply with the numbers you care about (e.g., 1,3,5).
        ${issuesForMenu}`;
        nextStep = 3;

        // Process the user's response to extract selected issues
        if (message) {
          selectedIssues = extractIssueNumbers(message);
          issueQueue = [...selectedIssues]; // Create a queue for step 3
          // [DEBUG] Selected issues and mapping
          console.log(`[Onboarding/FSM] Selected issues: ${selectedIssues.join(',')} (Raw message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}")`);
          // Save selected issues to DB for the frontend to access and update the issues matrix
          try {
            const currentPreferences = (await prisma.agent.findUnique({
              where: { id: agentId },
              select: { preferences: true }
            }))?.preferences || {};

            // Create an issues matrix array to populate the frontend matrix
            const issueList = [];
            for (const issueId of selectedIssues) {
              // Use the issueDetails that was already loaded
              const issueDetail = issueDetails[Number(issueId)];
              if (issueDetail) {
                issueList.push({
                  id: issueId,
                  title: issueDetail.title || `Issue ${issueId}`,
                  description: issueDetail.description || '',
                  stance: null,
                  reason: '', // Empty string, not null
                  summary: '',
                  isPriority: false
                });
              } else {
                issueList.push({
                  id: issueId,
                  title: `Issue ${issueId}`,
                  description: '',
                  stance: null,
                  reason: '', // Empty string, not null
                  summary: '',
                  isPriority: false
                });
              }
            }
            console.log('[Onboarding/FSM][Step 2 SAVE] Initial issuesMatrix to save:', JSON.stringify(issueList, null, 2));
            await prisma.agent.update({
              where: { id: agentId },
              data: {
                preferences: {
                  ...(typeof currentPreferences === 'object' ? currentPreferences : {}),
                  selectedIssues,
                  issuesMatrix: issueList
                }
              }
            });
            console.log(`[Onboarding/FSM] Saved selected issues to agent preferences: ${selectedIssues.join(',')}`);
          } catch (err) {
            console.error('[Onboarding/FSM] Failed to save selected issues to agent preferences:', err);
          }
        }
        break;

      case 3: // Stance Loop
        if (issueQueue.length === 0) {
          // If no more issues to process, move to next step
          nextStep = 4;
          stepInstructions = generateStep4Instruction(); // Updated step number
          break;
        }

        const currentIssueNumber = issueQueue[0];
        const currentIssue = issueDetails[Number(currentIssueNumber)]; // Cast to Number

        if (!currentIssue) {
          // If issue not found, skip it
          issueQueue.shift();
          stepInstructions = `I don't have details for that issue. Let's move on.`;
          break;
        }

        // Generate balanced perspectives for the current issue in format matching BALANCED_ISSUE_PRESENTATION
        // [DEBUG] Generating balanced perspectives for issue
        console.log('[Onboarding/FSM] Generating balanced perspectives for issue:', currentIssue.title);

        let perspectivesText = "";
        if (currentIssue.stances && currentIssue.stances.length > 0) {
          // Format similar to our template example - using Approach A, B, C format
          perspectivesText = currentIssue.stances.map((stance: any, index: number) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, etc.
            return `Approach ${letter} - ${stance.perspective} prioritize ${stance.opinion}`;
          }).join('\n');
          console.log('[Onboarding/FSM] Generated perspectives:', perspectivesText.substring(0, 100));
        } else {
          perspectivesText = "Different approaches exist with varying priorities:\n" +
                           "Approach A - Some prioritize immediate needs\n" +
                           "Approach B - Others focus on long-term solutions\n" +
                           "Approach C - Some suggest a mixed approach balancing different factors";
        }

        // Generate stance question for current issue with balanced perspectives
        stepInstructions = `(4/9) Issue ${currentIssueNumber} – ${currentIssue.title}:\n\n${currentIssue.description}\n\nBALANCED PERSPECTIVE:\n${perspectivesText}\n\nAfter considering these perspectives, do you prefer approach A, B, C or something else? One-line reason.`;

        // Process the user's response to extract stance on the previous issue
        // Only update the matrix if the message is not just a list of numbers (i.e., not the issue selection)
        // and only after the first stance (currentIssueIndex > 0)
        // Only update the matrix if the message is not just a list of numbers (i.e., not the issue selection)
        if (
          message &&
          issueQueue.length > 0 &&
          selectedIssues.length > 0 &&
          !/^\d+(,\s*\d+)*$/.test(message.trim())
        ) {
          try {
            // Log matrix state *before* attempting update in this step
            const agentDataBeforeUpdate = await prisma.agent.findUnique({ where: { id: agentId }, select: { preferences: true } });
            const matrixBeforeUpdate = (typeof agentDataBeforeUpdate?.preferences === 'object' ? agentDataBeforeUpdate?.preferences as Record<string, any> : {}).issuesMatrix || [];
            console.log('[Onboarding/FSM][Step 3 PRE-UPDATE] issuesMatrix before processing stance:', JSON.stringify(matrixBeforeUpdate, null, 2)); // Updated step number

            // Extract stance and reason from the message (Approach A/B/C or custom)
            let stance = null;
            let reason = message.trim();
            
            // Make sure we don't use the issue selection string as a reason
            if (/^\d+(,\s*\d+)*$/.test(reason.trim())) {
              reason = ''; // Use empty string instead of null to avoid type error
            }
            
            const approachMatch = message.match(/\b(Approach\s*[A-C]|[A-C])\b/i);
            // Map stance letter to balanced perspective text
            let mappedSummary = '';
            if (approachMatch) {
              stance = approachMatch[0].replace(/\s+/g, '_').toUpperCase(); // e.g., "Approach_A" or "A"
              reason = message.replace(approachMatch[0], '').trim();
              // Map stance letter to perspective
              if (currentIssue && currentIssue.stances && currentIssue.stances.length > 0) {
                let idx = -1;
                if (/A/i.test(approachMatch[0])) idx = 0;
                else if (/B/i.test(approachMatch[0])) idx = 1;
                else if (/C/i.test(approachMatch[0])) idx = 2;
                if (idx >= 0 && currentIssue.stances[idx]) {
                  mappedSummary = currentIssue.stances[idx].opinion || '';
                }
              }
            } else {
              // If not A/B/C, treat the whole message as a custom stance
              stance = 'CUSTOM';
            }
            reason = reason.replace(/^[,.:;-]\s*/, ''); // Clean up punctuation
            // If no custom reason, use mapped summary
            if (!reason && mappedSummary) {
              reason = mappedSummary;
            }

            // Always update the current issue (issueQueue[0])
            const currentIssueId = issueQueue[0];
            if (currentIssueId) {
              console.log(`[Onboarding/FSM] Updating stance for issue #${currentIssueId} with stance: ${stance}, reason: ${reason.substring(0, 50)}...`);

              // Update the issues matrix in agent preferences
              const currentAgentData = await prisma.agent.findUnique({
                where: { id: agentId },
                select: { preferences: true }
              });

              const prefsObj = typeof currentAgentData?.preferences === 'object' ?
                currentAgentData?.preferences as Record<string, any> :
                {};

              let issuesMatrix = prefsObj.issuesMatrix || [];
              const existingIssueIndex = issuesMatrix.findIndex((i: any) => i.id === currentIssueId);

              if (existingIssueIndex >= 0 && stance) {
                // Update existing issue
                issuesMatrix[existingIssueIndex] = {
                  ...issuesMatrix[existingIssueIndex],
                  stance: stance,
                  reason: reason || issuesMatrix[existingIssueIndex].reason,
                  summary: mappedSummary || (stance === 'CUSTOM' ? reason : undefined),
                  title: currentIssue?.title || issuesMatrix[existingIssueIndex].title,
                  description: currentIssue?.description || ''
                };
              }

              // Save updated matrix
              await prisma.agent.update({
                where: { id: agentId },
                data: {
                  preferences: {
                    ...prefsObj,
                    issuesMatrix
                  } as Prisma.InputJsonValue
                }
              });

              console.log(`[Onboarding/FSM] Updated issue stance in matrix:`, JSON.stringify(issuesMatrix[existingIssueIndex]));
              // Log the full issuesMatrix after update
              const updatedAgent = await prisma.agent.findUnique({
                where: { id: agentId },
                select: { preferences: true }
              });
              let updatedMatrix: any[] = [];
              if (updatedAgent?.preferences) {
                let prefsObj: any;
                if (typeof updatedAgent.preferences === 'string') {
                  try {
                    prefsObj = JSON.parse(updatedAgent.preferences);
                  } catch {
                    prefsObj = {};
                  }
                } else {
                  prefsObj = updatedAgent.preferences;
                }
                updatedMatrix = prefsObj.issuesMatrix || [];
              }
              console.log('[Onboarding/FSM][DEBUG] issuesMatrix after update:', JSON.stringify(updatedMatrix, null, 2)); // Updated step number
            }
          } catch (err) {
            console.error('[Onboarding] Error updating issue stance:', err);
          }
        }

        // Pop the issue from queue after processing
        issueQueue.shift();

        // If queue is now empty, we'll advance to step 4 on next message
        if (issueQueue.length === 0) {
          nextStep = 4;
        }
        break;

      case 4: // Top Priority
        stepInstructions = `(5/9) Of those issues, which ONE matters most to you right now?`; // Updated step number
        nextStep = 5; // Updated next step
        break;

      case 5: // Deal-Breakers
        stepInstructions = `(6/9) Is there any outcome you absolutely could NOT accept in group decisions? One sentence or type 'none'.`; // Updated step number
        nextStep = 6; // Updated next step

        // Mark priority issue in the matrix
        if (message && message.trim()) {
          try {
            // Look up the agent's current preferences
            const currentAgentData = await prisma.agent.findUnique({
              where: { id: agentId },
              select: { preferences: true }
            });

            const prefsObj = typeof currentAgentData?.preferences === 'object' ?
              currentAgentData?.preferences as Record<string, any> :
              {};

            let issuesMatrix = prefsObj.issuesMatrix || [];
            if (issuesMatrix.length > 0) {
              // Reset priorities first
              issuesMatrix = issuesMatrix.map((issue: any) => ({ ...issue, isPriority: false }));

              // Try to find the issue based on title, number, or key terms
              const lowerMessage = message.toLowerCase();

              // Try direct mention of issue number
              const numberMatch = lowerMessage.match(/\b(?:issue)\s*#?(\d+)\b/i);
              if (numberMatch && numberMatch[1]) {
                const issueId = numberMatch[1];
                const issueIndex = issuesMatrix.findIndex((i: any) => i.id === issueId);
                if (issueIndex >= 0) {
                  issuesMatrix[issueIndex].isPriority = true;
                }
              } else {
                // Try to match by title
                const priorityIssue = issuesMatrix.find((issue: any) => {
                  return issue.title && lowerMessage.includes(issue.title.toLowerCase());
                });

                if (priorityIssue) {
                  const issueIndex = issuesMatrix.findIndex((i: any) => i.id === priorityIssue.id);
                  if (issueIndex >= 0) {
                    issuesMatrix[issueIndex].isPriority = true;
                  }
                } else {
                  // If no match found, set the first issue as priority
                  if (issuesMatrix.length > 0) {
                    issuesMatrix[0].isPriority = true;
                  }
                }
              }

              // Save updated matrix
              await prisma.agent.update({
                where: { id: agentId },
                data: {
                  preferences: {
                    ...prefsObj,
                    issuesMatrix
                  } as Prisma.InputJsonValue
                }
              });

              console.log(`[Onboarding/FSM] Updated priority issue in matrix:`, JSON.stringify(issuesMatrix));
            }
          } catch (err) {
            console.error('[Onboarding] Error updating priority issue:', err);
          }
        }
        break;

      case 6: // Notify Pref
        stepInstructions = `(7/9) How often should I brief you? A-major items only B-weekly digest C-every decision.`; // Updated step number
        nextStep = 7; // Updated next step
        break;

      case 7: // Proposal Seed
        stepInstructions = `(8/9) Any idea or proposal you'd like me to log for later? If none, just say 'done'.`; // Updated step number
        nextStep = 8; // Updated next step
        break;

      case 8: // Summary & Finish
        // Extract JSON from conversation
        preferences = await extractPreferencesFromConversation(context);

        // Remove the JSON summary from the agent's final response
        stepInstructions = `All set! Ask me anything or explore proposals whenever you're ready.`;

        completedOnboarding = true;

        // Update agent preferences with extracted data
        await updateAgentPreferences(agentId, preferences);
        break;
    }

    // Create prompt for the LLM
    const systemPrompt = ONBOARDING_SYSTEM_PROMPT;

    const messagesForLlm = [
      {
        role: 'system',
        content: `${systemPrompt}

        Current onboarding step: ${step}
        ${issuesForMenu ? `Current issues: ${issuesForMenu}` : ''}

        ${stepInstructions}`
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

    // For step 0 initial greeting, use hardcoded response to ensure consistency
    if (step === 0 && (!message || message.trim().length === 0)) {
      console.log('[Onboarding] Using hardcoded initial greeting for step 0');
      useHardcodedResponse = true;
      agentResponseContent = stepInstructions;
    } else {
      // [DEBUG] LLM prompt and response
      console.log('[Onboarding/FSM] LLM SYSTEM PROMPT:', messagesForLlm[0].content);
      try {
        // Include the balanced issue perspectives template for stance questions
        // Add it at the beginning of the system prompt for stronger influence
        if (step === 2) {
          const balancedPrompt = `${BALANCED_ISSUE_PRESENTATION}\n\n${messagesForLlm[0].content}`;
          messagesForLlm[0].content = balancedPrompt;
          console.log('[Onboarding/FSM] Added balanced perspective template to LLM prompt');
        }
        // Log the full prompt array for diagnosis
        console.log('[Onboarding/FSM] Full prompt array:', JSON.stringify(messagesForLlm, null, 2));
        const { content } = await callLLM(messagesForLlm, DEFAULT_MODEL, { agentId });
        
        // For step 8 (final step), explicitly filter out any JSON from the response
        if (step === 8 || nextStep > 7) {
          // Extract only the non-JSON part from the response by looking for typical phrases
          const standardResponse = "All set! Ask me anything or explore proposals whenever you're ready.";
          
          // More robust JSON detection - look for anything that starts with { and includes typical JSON keys
          const hasJson = /\{[\s\S]*("agentNickname"|"selectedIssues"|"issueStances"|"topPriorityIssue"|"dealBreakers"|"notifyPref")[\s\S]*\}/.test(content);
          
          if (hasJson) {
            console.log('[Onboarding/FSM] JSON detected in final step response, replacing with standard message');
            agentResponseContent = standardResponse;
          } else {
            agentResponseContent = content;
          }
          
          // Force onboarding completion
          completedOnboarding = true;
          console.log('[Onboarding/FSM] Final step detected, marking onboarding as completed');
        } else {
          agentResponseContent = content;
        }
        
        console.log('[Onboarding/FSM] LLM response received:', agentResponseContent.substring(0, 200));
      } catch (llmError) {
        console.error('[Onboarding/FSM] LLM call failed:', llmError);
        // Fallback to step instruction if LLM fails
        agentResponseContent = stepInstructions;
      }
    }


    // Only save non-empty user messages
    let savedUserMessage = undefined;
    if (message && message.trim().length > 0) {
      try {
        savedUserMessage = await chatService.default.saveMessage(userId, agentId, message, 'user', {
          isOnboarding: true,
          step
        });
        console.log('[Onboarding] Saved user message:', { id: savedUserMessage?.id });
      } catch (err) {
        console.error('[Onboarding] Failed to save user message:', err);
      }
    }

    // Make sure we have content before saving agent message
    if (!agentResponseContent) {
      console.log('[Onboarding] No agent response content, using default greeting');
      agentResponseContent = `(1/9) Welcome! I'm your Praxis Agent. Pick a short name for me when we chat.`;
    }

    // Save agent response
    let savedAgentMessage;
    try {
      savedAgentMessage = await chatService.default.saveMessage(userId, agentId, agentResponseContent, 'agent', {
        isOnboarding: true,
        step,
        nextStep,
        completedOnboarding,
        onboardingComplete: completedOnboarding // Add this redundant field for compatibility
      }, agent.name); // Pass the updated agent name
      console.log('[Onboarding] Saved agent message:', {
        id: savedAgentMessage?.id,
        contentLength: agentResponseContent.length,
        step,
        nextStep
      });
    } catch (err) {
      console.error('[Onboarding] Failed to save agent message:', err);
    }

    // Mark onboarding complete in DB for the final step or if explicitly marked
    if (completedOnboarding || step === 8 || nextStep >= 8) {
      console.log('[DEBUG-COMPLETION] Marking onboarding as completed for agentId:', agentId,
                 'completedOnboarding flag:', completedOnboarding,
                 'step:', step,
                 'nextStep:', nextStep);
      
      try {
        console.log('[DEBUG-COMPLETION] Before update - agent state:', await prisma.agent.findUnique({
          where: { id: agentId },
          select: { id: true, name: true, onboardingCompleted: true }
        }));
        
        // Use update to ensure the agent record is updated
        const updateResult = await prisma.agent.update({
          where: { id: agentId },
          data: {
            onboardingCompleted: true
          }
        });
        
        console.log('[DEBUG-COMPLETION] Update operation result:', {
          id: updateResult.id,
          onboardingCompleted: updateResult.onboardingCompleted
        });
        
        // Double-check that it was set
        const updatedAgent = await prisma.agent.findUnique({
          where: { id: agentId },
          select: { id: true, name: true, onboardingCompleted: true }
        });
        
        console.log('[DEBUG-COMPLETION] After update - Verified agent state:', updatedAgent);
        
        // If somehow it failed to update, try once more
        if (!updatedAgent?.onboardingCompleted) {
          console.log('[DEBUG-COMPLETION] Onboarding flag not set! Retrying update...');
          const secondAttempt = await prisma.agent.update({
            where: { id: agentId },
            data: { onboardingCompleted: true }
          });
          console.log('[DEBUG-COMPLETION] Second update attempt result:', {
            id: secondAttempt.id,
            onboardingCompleted: secondAttempt.onboardingCompleted
          });
        }
      } catch (err) {
        console.error('[DEBUG-COMPLETION] Error updating onboardingCompleted flag:', err);
        // Dump the full error for diagnosis
        console.error('[DEBUG-COMPLETION] Full error:', JSON.stringify(err, null, 2));
      }
    } else {
      console.log('[DEBUG-COMPLETION] Not marking onboarding complete:', {
        completedOnboarding,
        step,
        nextStep
      });
    }

    // Return response with updated metadata for next call
    // Fetch latest agent preferences for live matrix updates
    let partialPreferences: Record<string, any> | undefined = undefined;
    let shouldReturnPartial = false;

    // Return partial preferences after steps 1, 2, 3 (issue selection, stance, priority)
    if (
      step === 1 || // after issue selection
      step === 2 || // after stance update
      step === 3    // after priority selection
    ) {
      try {
        const agentData = await prisma.agent.findUnique({
          where: { id: agentId },
          select: { preferences: true }
        });
        if (agentData && typeof agentData.preferences === 'object') {
          partialPreferences = agentData.preferences as Record<string, any>;
          shouldReturnPartial = true;
          console.log('[Onboarding/FSM] Returning partial extractedPreferences:', JSON.stringify(partialPreferences));
        }
      } catch (err) {
        console.error('[Onboarding/FSM] Failed to fetch partial preferences for live matrix:', err);
      }
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
      extractedPreferences: completedOnboarding
        ? preferences
        : shouldReturnPartial
          ? partialPreferences
          : undefined,
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
  // Extract numbers like 1,3,5 or 1, 3, 5 or "1 3 5" from user message
  const numberPattern = /\d+/g;
  const matches = message.match(numberPattern) || [];
  return matches;
}

async function extractPreferencesFromConversation(context: any[]): Promise<any> {
  // Format conversation for extraction
  const conversationText = context
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  // Call LLM with extraction prompt - make it clear this should NOT be part of the conversation
  const { content } = await callLLM([
    { role: 'system', content: ONBOARDING_PREFERENCE_EXTRACTION_PROMPT + "\nIMPORTANT: This JSON is for internal use only and should NOT be displayed in the chat." },
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

async function updateAgentPreferences(agentId: string, preferences: any) {
  try {
    const currentPreferences = (await prisma.agent.findUnique({
      where: { id: agentId },
      select: { preferences: true }
    }))?.preferences || {};

    // Get current agent information to avoid losing existing data
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { name: true, color: true }
    });

    // Merge existing preferences with new ones
    const mergedPreferences = {
      ...(typeof currentPreferences === 'object' && currentPreferences !== null ? currentPreferences : {}),
      ...preferences,
      onboardingCompletedAt: new Date().toISOString()
    };

    // [DEBUG] Updating agent preferences
    console.log('[Onboarding/FSM] Updating agent preferences:', {
      agentId,
      newName: preferences.agentNickname || agent?.name || 'Praxis Agent',
      color: agent?.color || '#4299E1',
      preferencesKeys: Object.keys(mergedPreferences)
    });

    // Update agent record
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        preferences: mergedPreferences as Prisma.InputJsonValue, // Cast to Prisma.InputJsonValue
        name: preferences.agentNickname || agent?.name || 'Praxis Agent',
        color: agent?.color || '#4299E1' // Keep existing color or use default
      }
    });

    return true;
  } catch (e) {
    console.error('Failed to update agent preferences:', e);
    return false;
  }
}

function generateStep4Instruction() {
  return `(5/9) Of those issues, which ONE matters most to you right now?`;
}

// Helper function to extract color (moved from case 5)
function extractColor(message: string): string | null {
  const colorMatch = message.match(/#?([0-9A-Fa-f]{6}|[A-Fa-f]{3})|\b(red|blue|green|yellow|orange|purple|pink|brown|gray|black|white)\b/i);
  let extractedColor = null;
  if (colorMatch) {
      if (colorMatch[1]) {
          extractedColor = `#${colorMatch[1]}`; // Hex color
      } else if (colorMatch[2]) {
          // Simple mapping for basic color names (can be expanded)
          const colorMap: { [key: string]: string } = {
              red: '#F56565', blue: '#4299E1', green: '#48BB78', yellow: '#F6E05E',
              orange: '#ED8936', purple: '#9F7AEA', pink: '#ED64A6', brown: '#A0522D',
              gray: '#A0AEC0', black: '#1A202C', white: '#FFFFFF'
          };
          extractedColor = colorMap[colorMatch[2].toLowerCase()] || null;
      }
  }
  return extractedColor;
}
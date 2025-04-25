import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma namespace for types
// Remove jwt import if only used for local requireAuth
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth'; // Import centralized auth

const prisma = new PrismaClient();
const router = Router();

// Remove local requireAuth definition
// Remove local AuthenticatedRequest interface definition

// Define expected body structure for onboarding steps
// Renamed agentPreferences to preferences to match Prisma model
interface OnboardingStepBody {
    agentName?: string;
    agentColor?: string;
    preferences?: Record<string, any>; // User provides standard JSON
    digestFrequency?: number;
    digestTone?: string;
}

// Define specific update payload types using Prisma generated types
// Pick only the relevant fields that can be updated in onboarding
type UserUpdatePayload = Pick<Prisma.UserUpdateInput, 'digestFrequency' | 'digestTone'>;
type AgentUpdatePayload = Pick<Prisma.AgentUpdateInput, 'name' | 'color' | 'preferences'>;


// POST /api/onboarding/steps/:step
router.post('/steps/:step', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { step } = req.params;
    // Cast the body to the expected structure
    const data = req.body as OnboardingStepBody;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication invalid or missing user ID.' });
    }

    // Ensure agent exists for this user, or create one if not
    let agent = await prisma.agent.findFirst({ where: { userId } });
    if (!agent) {
        try {
            agent = await prisma.agent.create({
                data: {
                    userId,
                    name: data.agentName || "Agent",
                    color: data.agentColor || "#007bff",
                    preferences: data.preferences || {},
                    publicKey: "placeholder-key",
                    encryptedPrivKey: "placeholder-priv",
                }
            });
            console.log(`Created new agent for user ${userId}: ${agent.id}`);
        } catch (err) {
            console.error("Error creating agent during onboarding:", err);
            return res.status(500).json({ error: "Failed to create agent during onboarding." });
        }
    }
    const agentId = agent.id;

    try {
        // Initialize with specific Prisma types
        let updateUserData: UserUpdatePayload = {};
        let updateAgentData: AgentUpdatePayload = {};

        // Map data based on step
        switch (step) {
            case '1':
            case 'name_appearance':
                // Use 'name' and 'color' matching AgentUpdatePayload keys
                if (data.agentName !== undefined) updateAgentData.name = data.agentName;
                if (data.agentColor !== undefined) updateAgentData.color = data.agentColor;
                break;
            case '2':
            case 'preferences':
                 // Use 'preferences' matching AgentUpdatePayload key
                 // Cast to Prisma.InputJsonValue for type safety with Prisma
                 if (data.preferences !== undefined) updateAgentData.preferences = data.preferences as Prisma.InputJsonValue;
                break;
            case '3':
            case 'digest_settings':
                if (data.digestFrequency !== undefined) updateUserData.digestFrequency = data.digestFrequency;
                if (data.digestTone !== undefined) updateUserData.digestTone = data.digestTone;
                break;
            default:
                return res.status(400).json({ error: `Invalid onboarding step: ${step}` });
        }

        // Perform updates only if there's data to update
        const userUpdatePromise = Object.keys(updateUserData).length > 0
            ? prisma.user.update({ where: { id: userId }, data: updateUserData })
            : Promise.resolve(); // No update needed

        const agentUpdatePromise = Object.keys(updateAgentData).length > 0
            ? prisma.agent.update({ where: { id: agentId }, data: updateAgentData })
            : Promise.resolve(); // No update needed

        // Wait for both potential updates to complete
        await Promise.all([userUpdatePromise, agentUpdatePromise]);

        console.log(`Onboarding step ${step} processed for user ${userId}, agent ${agentId}`);
        res.status(200).json({ message: `Step ${step} data saved successfully.` });

    } catch (error) {
        console.error(`Error processing onboarding step ${step} for user ${userId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
             // More specific error check for Prisma record not found
             return res.status(404).json({ error: 'User or Agent not found.' });
        }
        res.status(500).json({ error: 'Internal server error processing onboarding step.' });
    }
});

/**
 * POST /api/onboarding/message
 * Handles FSM-based onboarding chat messages.
 */
router.post('/message', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, step, selectedIssues, issueQueue, currentIssueIndex } = req.body;
    const userId = req.user?.userId;
    
    console.log('[DEBUG-ONBOARDING] Message received with:', {
      userId,
      message: message?.substring(0, 50),
      step,
      selectedIssuesCount: selectedIssues?.length,
      issueQueueCount: issueQueue?.length,
      currentIssueIndex
    });

    if (!userId) {
      console.log('[DEBUG-ONBOARDING] Authentication invalid or missing user ID');
      return res.status(401).json({ error: 'Authentication invalid or missing user ID.' });
    }

    // Get agent for this user
    const agent = await prisma.agent.findFirst({
      where: { userId }
    });

    if (!agent) {
      console.log('[DEBUG-ONBOARDING] Agent not found for user:', userId);
      return res.status(404).json({ error: 'Agent not found for user' });
    }
    
    console.log('[DEBUG-ONBOARDING] Found agent:', {
      id: agent.id,
      name: agent.name,
      onboardingCompleted: agent.onboardingCompleted
    });

    // Call FSM onboarding logic
    console.log('[DEBUG-ONBOARDING] Calling conductOnboardingChat...');
    try {
      const result = await (await import('../services/agent-service')).conductOnboardingChat(
        userId,
        agent.id,
        message,
        {
          step,
          selectedIssues,
          issueQueue,
          currentIssueIndex
        }
      );
      
      console.log('[DEBUG-ONBOARDING] Chat result:', {
        nextStep: result.nextStep,
        completedOnboarding: result.completedOnboarding,
        extractedPreferencesKeys: result.extractedPreferences ? Object.keys(result.extractedPreferences) : [],
        responseLength: result.response?.length
      });
      
      return res.json(result);
    } catch (chatError) {
      console.error('[DEBUG-ONBOARDING] Error in conductOnboardingChat:', chatError);
      throw chatError;
    }
  } catch (error) {
    console.error('Error in onboarding message route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/onboarding/reset
 * Resets onboarding state for the current user's agent.
 */
router.post('/reset', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { agentId } = req.body;

    if (!userId || !agentId) {
      return res.status(400).json({ error: 'Missing user or agent ID.' });
    }

    // Reset agent to pre-onboarding state
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        name: 'Agent',
        color: '#4299E1',
        preferences: {},
        onboardingCompleted: false
      } as any
    });

    // Delete onboarding chat messages for this agent/user
    // Use the standard Prisma model property (singular, camelCase)
    await prisma.chatMessage.deleteMany({
      where: {
        agentId,
        userId,
        metadata: {
          path: ['isOnboarding'],
          equals: true
        }
      }
    });

    res.json({ message: 'Onboarding reset successfully.' });
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    res.status(500).json({ error: 'Failed to reset onboarding.' });
  }
});

export default router;
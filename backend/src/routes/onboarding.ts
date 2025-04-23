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
    const agentId = req.user?.agentId;

    if (!userId || !agentId) {
        return res.status(401).json({ error: 'Authentication invalid or missing user/agent ID.' });
    }

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

export default router;
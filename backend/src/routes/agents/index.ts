import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, AuthenticatedRequest } from "../../middleware/requireAuth";
import { HttpError } from "../../utils/HttpError";
import logger from "../../utils/logger";

const router = Router();
const prisma = new PrismaClient();

console.log("[AgentRoutes] /api/agents route loaded");

// Create a new agent for the current user
router.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log("[AgentRoutes] POST /api/agents called");
  try {
    const userId = req.user?.userId;
    if (!userId) {
      console.error("[AgentRoutes] No userId in JWT");
      throw new HttpError("Unauthorized", 401);
    }

    // Check if user already has an agent
    const existingAgent = await prisma.agent.findFirst({ where: { userId } });
    if (existingAgent) {
      console.error(`[AgentRoutes] Agent already exists for userId: ${userId}`);
      return res.status(409).json({ error: "User already has an agent" });
    }

    // Extract agent details from request body
    const { name, color } = req.body;

    if (!name) {
      throw new HttpError("Agent name is required", 400);
    }

    // Create a new agent
    const newAgent = await prisma.agent.create({
      data: {
        userId,
        name,
        color: color || "#4299E1", // Default to blue if no color specified
        publicKey: "placeholder", // Would be generated in a real implementation
        encryptedPrivKey: "placeholder", // Would be generated and encrypted in a real implementation
        alignmentScore: 85.0, // Default initial alignment score
        preferences: {}, // Empty preferences to start with
        autonomyLevel: 0, // Default autonomy level
        // Use type assertion for fields that might not be recognized by TypeScript
        ...(({ onboardingCompleted: false } as any))
      },
    });

    console.log(`[AgentRoutes] Agent created for userId: ${userId}, agentId: ${newAgent.id}`);
    res.status(201).json(newAgent);
  } catch (err) {
    console.error("[AgentRoutes] Error creating agent:", err);
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Failed to create agent", details: err });
    }
  }
});

// Get a specific agent by ID
router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`[AgentRoutes] GET /api/agents/${req.params.id} called`);
  try {
    const userId = req.user?.userId;
    if (!userId) {
      console.error("[AgentRoutes] No userId in JWT");
      throw new HttpError("Unauthorized", 401);
    }

    const agentId = req.params.id;
    const agent = await prisma.agent.findUnique({ 
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        color: true,
        alignmentScore: true,
        preferences: true,
        pausedUntil: true,
        userId: true
      }
    });

    if (!agent) {
      console.error(`[AgentRoutes] Agent not found: ${agentId}`);
      return res.status(404).json({ error: "Agent not found" });
    }

    // Only allow users to access their own agents
    if (agent.userId !== userId) {
      console.error(`[AgentRoutes] User ${userId} tried to access agent ${agentId} belonging to ${agent.userId}`);
      return res.status(403).json({ error: "You do not have permission to access this agent" });
    }

    console.log(`[AgentRoutes] Returning agent: ${agentId}`);
    res.json(agent);
  } catch (err) {
    console.error("[AgentRoutes] Error fetching agent:", err);
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Failed to fetch agent", details: err });
    }
  }
});

export default router;
/**
 * GET /api/agents/:id/messages?onboarding=true
 * Returns chat messages for the agent/user, filtered by onboarding if requested.
 */
router.get('/:id/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.params.id;
    const userId = req.user?.userId;
    const onboarding = req.query.onboarding === 'true';

    if (!agentId || !userId) {
      return res.status(400).json({ error: 'Missing agent or user ID.' });
    }

    const where: any = {
      agentId,
      userId
    };
    if (onboarding) {
      where.metadata = { path: ['isOnboarding'], equals: true };
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { timestamp: 'asc' }
    });

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching agent messages:', error);
    res.status(500).json({ error: 'Failed to fetch agent messages.' });
  }
});
import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, AuthenticatedRequest } from "../../middleware/requireAuth";
import { HttpError } from "../../utils/HttpError";

const router = Router();
const prisma = new PrismaClient();

console.log("[AgentMe] /api/agents/me route loaded");

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log("[AgentMe] GET /api/agents/me called");
  try {
    const userId = req.user?.userId;
    if (!userId) {
      console.error("[AgentMe] No userId in JWT");
      throw new HttpError("Unauthorized", 401);
    }
    const agent = await prisma.agent.findFirst({ where: { userId } });
    if (!agent) {
      console.error(`[AgentMe] Agent not found for userId: ${userId}`);
      return res.status(404).json({ error: "Agent not found for user." });
    }
    // Add detailed color debugging
    console.log(`[DEBUG_COLOR] /me endpoint - Agent color value: ${agent.color}`);
    console.log(`[AgentMe] Returning agent for userId: ${userId}, agentId: ${agent.id}`);
    console.log(`[DEBUG_COLOR] /me endpoint - Full agent object:`, JSON.stringify({
      id: agent.id,
      name: agent.name,
      color: agent.color,
      onboardingCompleted: agent.onboardingCompleted
    }));
    res.json(agent);
  } catch (err) {
    console.error("[AgentMe] Error fetching agent:", err);
    res.status(500).json({ error: "Failed to fetch agent.", details: err });
  }
});

export default router;
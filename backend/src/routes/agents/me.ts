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
    // Fetch the user record for personalization
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error(`[AgentMe] User not found for userId: ${userId}`);
      return res.status(404).json({ error: "User not found." });
    }
    // Log original agent and user data
    console.log(`[DEBUG_NAMES] Original agent data:`, JSON.stringify({
      id: agent.id,
      name: agent.name,
      color: agent.color
    }));
    console.log(`[DEBUG_NAMES] User data:`, JSON.stringify({
      id: user.id,
      name: user.name || user.email.split('@')[0]
    }));

    // FIXED: Do not override the agent name - preserve agent identity
    const personalizedAgent = {
      ...agent
      // Removed the name override to keep agent's identity intact
    };
    
    // Add detailed color debugging
    console.log(`[DEBUG_COLOR] /me endpoint - Agent color value: ${personalizedAgent.color}`);
    console.log(`[AgentMe] Returning personalized agent for userId: ${userId}, agentId: ${personalizedAgent.id}`);
    console.log(`[DEBUG_COLOR] /me endpoint - Full agent object:`, JSON.stringify({
      id: personalizedAgent.id,
      name: personalizedAgent.name, // This should be agent's name but contains user's name
      color: personalizedAgent.color,
      onboardingCompleted: personalizedAgent.onboardingCompleted
    }));
    // Add debug log for what we're returning
    console.log(`[DEBUG_NAMES] Returning response with:
      agentName (in personalizedAgent.name): ${personalizedAgent.name}
      userName: ${user.name || user.email.split('@')[0] || "User"}
    `);

    res.json({
      ...personalizedAgent,
      // Keep the agent's original name as agentName
      agentName: personalizedAgent.name,
      // Set the user's name in userName field
      userName: user.name || user.email.split('@')[0] || "User"
    });
  } catch (err) {
    console.error("[AgentMe] Error fetching agent:", err);
    res.status(500).json({ error: "Failed to fetch agent.", details: err });
  }
});

export default router;
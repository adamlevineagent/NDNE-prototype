import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/negotiations
 * Create a new negotiation session
 */
router.post("/api/negotiations", async (req: Request, res: Response) => {
  const { topic, description } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const session = await prisma.negotiationSession.create({
      data: {
        topic,
        description,
        initiatorId: req.body.initiatorId || "unknown", // Should be set by auth in production
        status: "active",
      },
    });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: "Failed to create negotiation session", details: err });
  }
});

/**
 * GET /api/negotiations
 * List all negotiation sessions
 */
router.get("/api/negotiations", async (_req: Request, res: Response) => {
  try {
    const sessions = await prisma.negotiationSession.findMany();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch negotiations", details: err });
  }
});

/**
 * GET /api/negotiations/:id
 * Get details of a negotiation session
 */
router.get("/api/negotiations/:id", async (req: Request, res: Response) => {
  try {
    const session = await prisma.negotiationSession.findUnique({
      where: { id: req.params.id },
    });
    if (!session) return res.status(404).json({ error: "Negotiation not found" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch negotiation", details: err });
  }
});

/**
 * POST /api/negotiations/:id/messages
 * Add a message to a negotiation session (any agent can post to join)
 */
router.post("/api/negotiations/:id/messages", async (req: Request, res: Response) => {
  const { agentId, content, messageType, referencedMessageId, metadata } = req.body;
  if (!agentId || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const message = await prisma.negotiationMessage.create({
      data: {
        negotiationId: req.params.id,
        agentId,
        content,
        messageType: messageType || "statement",
        referencedMessageId,
        metadata,
      },
    });
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: "Failed to add negotiation message", details: err });
  }
});

/**
 * GET /api/negotiations/:id/messages
 * Get all messages for a negotiation session, including reactions
 */
router.get("/api/negotiations/:id/messages", async (req: Request, res: Response) => {
  try {
    const messages = await prisma.negotiationMessage.findMany({
      where: { negotiationId: req.params.id },
      orderBy: { timestamp: "asc" },
      include: {
        reactions: true,
      },
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch negotiation messages", details: err });
  }
});

/**
 * POST /api/negotiations/:id/messages/:messageId/reactions
 * Add a reaction to a negotiation message
 */
router.post("/api/negotiations/:id/messages/:messageId/reactions", async (req: Request, res: Response) => {
  const { agentId, reactionType } = req.body;
  if (!agentId || !reactionType) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const reaction = await prisma.negotiationReaction.create({
      data: {
        messageId: req.params.messageId,
        agentId,
        reactionType,
      },
    });
    res.status(201).json(reaction);
  } catch (err) {
    if (err.code === "P2002") {
      // Unique constraint failed (duplicate reaction)
      return res.status(409).json({ error: "Reaction already exists for this agent and type" });
    }
    res.status(500).json({ error: "Failed to add reaction", details: err });
  }
});

/**
 * DELETE /api/negotiations/:id/messages/:messageId/reactions
 * Remove a reaction from a negotiation message
 * Expects agentId and reactionType in the body
 */
router.delete("/api/negotiations/:id/messages/:messageId/reactions", async (req: Request, res: Response) => {
  const { agentId, reactionType } = req.body;
  if (!agentId || !reactionType) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    await prisma.negotiationReaction.deleteMany({
      where: {
        messageId: req.params.messageId,
        agentId,
        reactionType,
      },
    });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to remove reaction", details: err });
  }
});

export default router;
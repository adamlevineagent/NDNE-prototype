import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { generateComment } from '../services/agent-service';

const prisma = new PrismaClient();
const router = Router();

// POST /api/comments - Create a new comment on a proposal
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { agentId } = req.user || {};
  const { proposalId, content } = req.body;

  if (!agentId) {
    return res.status(401).json({ error: 'Authentication invalid or missing agent ID.' });
  }
  if (!proposalId || !content) {
    return res.status(400).json({ error: 'Missing proposalId or content.' });
  }

  try {
    // Optionally, call agent-service to generate or validate comment
    const agentPreferences = {}; // TODO: fetch agent preferences from DB or context
    const generatedComment = await generateComment({ id: proposalId }, agentPreferences, agentId);

    // For now, use user-provided content; can integrate generatedComment as needed
    const comment = await prisma.comment.create({
      data: {
        proposalId,
        agentId,
        content,
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error creating comment.' });
  }
});

export default router;
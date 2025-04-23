import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { blockIfPaused } from './agents/pauseAgentHandler';
import { generateVote } from '../services/agent-service';

const prisma = new PrismaClient();
const router = Router();

function requireAuth(req: Request, res: Response, next: () => void) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET!);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// POST /api/proposals/:id/vote
router.post('/proposals/:id/vote', requireAuth, blockIfPaused, async (req, res) => {
  const { agentId } = (req as any).user;
  const { value } = req.body;
  try {
    const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id } });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    const now = new Date();
    if (now > proposal.vetoWindowEnd) {
      return res.status(403).json({ error: 'Veto window expired; cannot override vote' });
    }

    // Call agent-service to generate vote suggestion (optional, can be used for logging or validation)
    const agentPreferences = {}; // TODO: Fetch agent preferences from DB or context
    const voteSuggestion = await generateVote(proposal, agentPreferences, agentId);
    console.log(`Agent vote suggestion: ${voteSuggestion}`);

    // Check for existing vote
    const existing = await prisma.vote.findFirst({ where: { proposalId: req.params.id, agentId } });
    if (existing) {
      // Override
      await prisma.vote.update({ where: { id: existing.id }, data: { value, confidence: 1.0 } });
      return res.json({ status: 'overridden' });
    } else {
      // New vote
      await prisma.vote.create({ data: { proposalId: req.params.id, agentId, value, confidence: 1.0 } });
      return res.json({ status: 'voted' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Vote failed' });
  }
});

export default router;

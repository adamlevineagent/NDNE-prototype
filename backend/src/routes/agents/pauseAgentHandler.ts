import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

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

// POST /api/agents/:id/pause
router.post('/:id/pause', requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { id } = req.params;
  const { until } = req.body; // ISO string or null
  try {
    // Only agent owner can pause
    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent || agent.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
    await prisma.agent.update({ where: { id }, data: { pausedUntil: until ? new Date(until) : null } });
    res.json({ status: 'paused', pausedUntil: until });
  } catch (error) {
    res.status(400).json({ error: 'Pause failed' });
  }
});

// Middleware to block vote/comment if agent is paused
export async function blockIfPaused(req: Request, res: Response, next: () => void) {
  const { agentId } = (req as any).user;
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (agent && agent.pausedUntil && new Date() < agent.pausedUntil) {
    return res.status(403).json({ error: 'Agent is paused' });
  }
  next();
}

export default router;

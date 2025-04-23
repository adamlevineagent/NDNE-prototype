import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
// Remove jwt import
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth'; // Import centralized auth

const prisma = new PrismaClient();
const router = Router();

// Remove local requireAuth definition

// POST /api/proposals (create)
// Use AuthenticatedRequest type
import { analyzeProposal, generateVote, generateComment } from '../services/agent-service';

router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.agentId) {
    return res.status(401).json({ error: 'Authentication invalid or missing agent ID.' });
  }
  const { agentId } = req.user;
  const { title, description, type, playMode, amount, quorum, threshold, closeAt, vetoWindowEnd } = req.body;
  try {
    const proposal = await prisma.proposal.create({
      data: {
        title,
        description,
        type: type || 'standard',
        playMode: !!playMode,
        amount,
        createdByAgentId: agentId,
        quorum,
        threshold,
        closeAt: new Date(closeAt),
        vetoWindowEnd: new Date(vetoWindowEnd),
      },
    });

    // Call agent-service to analyze proposal after creation
    const agentPreferences = {}; // TODO: Fetch agent preferences from DB or context
    const analysis = await analyzeProposal(proposal, agentPreferences, agentId);
    // Optionally store or log analysis result

    res.json({ proposal, analysis });
  } catch (error) {
    res.status(400).json({ error: 'Invalid proposal data' });
  }
});

// GET /api/proposals (list)
// Use AuthenticatedRequest type (though req.user isn't used here, it's good practice for consistency)
router.get('/', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  const proposals = await prisma.proposal.findMany();
  res.json(proposals);
});

// GET /api/proposals/:id (read)
// Use AuthenticatedRequest type
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id } });
  if (!proposal) return res.status(404).json({ error: 'Not found' });
  res.json(proposal);
});

// PUT /api/proposals/:id (update)
// Use AuthenticatedRequest type
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // TODO: Add authorization check - should only creator/admin update?
    const proposal = await prisma.proposal.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(proposal);
  } catch (error) {
    res.status(400).json({ error: 'Update failed' });
  }
});

// DELETE /api/proposals/:id (delete)
// Use AuthenticatedRequest type
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // TODO: Add authorization check - should only creator/admin delete?
    await prisma.proposal.delete({ where: { id: req.params.id } });
    res.json({ status: 'deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Delete failed' });
  }
});

export default router;

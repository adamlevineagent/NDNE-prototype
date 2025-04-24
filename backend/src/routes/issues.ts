import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/requireAuth';

const prisma = new PrismaClient();
const router = Router();

// GET /api/issues?filter=positionsOnly|all
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const filter = req.query.filter as string || 'positionsOnly';

    if (filter === 'positionsOnly') {
      // Fetch issues where user has positions
      const issues = await prisma.issue.findMany({
        where: {
          positions: {
            some: {
              userId: userId
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
      return res.json(issues);
    } else if (filter === 'all') {
      // Fetch all issues sorted by last update
      const issues = await prisma.issue.findMany({
        orderBy: {
          updatedAt: 'desc'
        }
      });
      return res.json(issues);
    } else {
      return res.status(400).json({ error: 'Invalid filter parameter' });
    }
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/issues/:id/discuss
router.post('/:id/discuss', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const issueId = req.params.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Prepare chat context for issue discussion
    // For now, just return issue details and user info
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    // TODO: Add more context preparation as needed
    res.json({ issue, userId });
  } catch (error) {
    console.error('Error preparing issue discussion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/issues/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const issueId = req.params.id;
    const { title, stance, reason, summary, description, isPriority } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Update issue details
    const updatedIssue = await prisma.issue.update({
      where: { id: issueId },
      data: {
        title,
        stance,
        reason,
        summary,
        description,
        isPriority,
        updatedAt: new Date()
      }
    });
    res.json(updatedIssue);
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
import express from 'express';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();

// GET /api/issues/user - Fetch issues with user's positions
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

router.get('/user', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // Fetch agent for this user
    const agent = await prisma.agent.findFirst({ where: { userId } });
    if (!agent) {
      return res.status(404).json({ error: "Agent not found for user." });
    }
    // Parse preferences for issues/positions
    const preferences = agent.preferences || {};
    // Example structure: { issues: [{ id, title, description, stance, reason, isPriority }] }
    let issues = [];
    // Enhanced debugging for preferences structure
    console.log(`[Issues] Raw preferences:`, JSON.stringify(preferences));
    
    if (preferences.issuesMatrix && Array.isArray(preferences.issuesMatrix)) {
      console.log('[Issues] Found issuesMatrix in preferences');
      issues = preferences.issuesMatrix;
    } else if (preferences.issues && Array.isArray(preferences.issues)) {
      console.log('[Issues] Found issues array in preferences');
      issues = preferences.issues;
    } else if (Array.isArray(preferences)) {
      // If preferences is an array, use it directly
      console.log('[Issues] Preferences is already an array');
      issues = preferences;
    } else {
      console.log('[Issues] No recognized issue format found in preferences');
    }
    // Add logging
    console.log(`[Issues] /api/issues/user for userId: ${userId}, agentId: ${agent.id}`);
    console.log(`[Issues] Returning issues:`, JSON.stringify(issues, null, 2));
    res.json(issues);
  } catch (err) {
    console.error("[Issues] Error fetching user issues:", err);
    res.status(500).json({ error: "Failed to fetch user issues.", details: err });
  }
});

export default router;
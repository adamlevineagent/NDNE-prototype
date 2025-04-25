import { Router, Request, Response } from "express";
import { processFeedback, getFeedback } from "../services/feedback-service";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

/**
 * POST /api/feedback/negotiation/:negotiationId
 * Submit feedback for an agent's performance in a negotiation
 */
router.post("/api/feedback/negotiation/:negotiationId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { agentId, rating, representationAccuracy, comments, preferenceUpdates } = req.body;
    const userId = req.user?.id;

    if (!agentId || !rating || rating < 1 || rating > 5 || !userId) {
      return res.status(400).json({ 
        error: "Missing required fields or invalid values",
        details: "Required: agentId, rating (1-5)"
      });
    }

    if (!representationAccuracy || representationAccuracy < 1 || representationAccuracy > 5) {
      return res.status(400).json({ 
        error: "Invalid representation accuracy value", 
        details: "representationAccuracy must be between 1-5" 
      });
    }

    const feedbackId = await processFeedback({
      negotiationId: req.params.negotiationId,
      agentId,
      userId,
      rating,
      representationAccuracy,
      comments,
      preferenceUpdates
    });

    res.status(201).json({ 
      success: true, 
      feedbackId,
      message: "Feedback successfully submitted" 
    });
  } catch (err: any) {
    res.status(500).json({ 
      error: "Failed to submit feedback", 
      message: err.message || "Unknown error" 
    });
  }
});

/**
 * GET /api/feedback/negotiation/:negotiationId
 * Get all feedback for a negotiation
 */
router.get("/api/feedback/negotiation/:negotiationId", requireAuth, async (req: Request, res: Response) => {
  try {
    const feedback = await getFeedback(
      req.params.negotiationId, 
      req.query.agentId as string || undefined,
      req.user?.id // Only return feedback from the authenticated user
    );

    res.json(feedback);
  } catch (err: any) {
    res.status(500).json({ 
      error: "Failed to fetch feedback", 
      message: err.message || "Unknown error" 
    });
  }
});

/**
 * GET /api/feedback/agent/:agentId
 * Get all feedback for an agent
 */
router.get("/api/feedback/agent/:agentId", requireAuth, async (req: Request, res: Response) => {
  try {
    // Verify the agent belongs to the user
    // This would normally be handled by an authorization middleware
    const userId = req.user?.id;
    
    const feedback = await getFeedback(
      undefined, 
      req.params.agentId,
      userId // Only return feedback from the authenticated user
    );

    res.json(feedback);
  } catch (err: any) {
    res.status(500).json({ 
      error: "Failed to fetch feedback", 
      message: err.message || "Unknown error" 
    });
  }
});

export default router;
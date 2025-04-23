import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
// Remove jwt import
import { requireAuth, AuthenticatedRequest } from '../../middleware/requireAuth'; // Import centralized auth

const prisma = new PrismaClient();
const router = Router();

// Remove local requireAuth definition

interface FeedbackRequestBody {
  voteId?: string;
  commentId?: string;
  reason: string; // Reason for the override/feedback
}

// AuthenticatedRequest is now imported, but we need to ensure it includes the params type
// Let's adjust the usage directly in the route handler signature instead of redefining the interface here.


// POST /api/agents/:id/feedback - Apply requireAuth middleware
// Use AuthenticatedRequest directly, adding the specific params type inline
router.post('/:id/feedback', requireAuth, async (req: AuthenticatedRequest & Request<{ id: string }, {}, FeedbackRequestBody>, res: Response) => {
  const agentIdFromParam = req.params.id;
  const { voteId, commentId, reason } = req.body;
  
  // Add detailed logging for debugging
  console.log(`[DEBUG] Feedback request received for agent ${agentIdFromParam}`);
  console.log(`[DEBUG] Request body:`, JSON.stringify({voteId, commentId, reason}));
  console.log(`[DEBUG] Authenticated user:`, JSON.stringify(req.user));
  
  // Assuming JWT payload includes agentId (as defined in requireAuth.ts UserJWTPayload)
  const authenticatedAgentId = req.user?.agentId; // Get agentId from authenticated user

  // Verify ownership: Authenticated user's agentId must match the agentId in the URL param
  if (!authenticatedAgentId || authenticatedAgentId !== agentIdFromParam) {
      return res.status(403).json({ error: 'Forbidden: You can only provide feedback for your own agent.' });
  }

  if (!reason) {
    return res.status(400).json({ error: 'Reason is required for feedback.' });
  }

  if (!voteId && !commentId) {
    return res.status(400).json({ error: 'Either voteId or commentId must be provided.' });
  }

  if (voteId && commentId) {
    return res.status(400).json({ error: 'Provide either voteId or commentId, not both.' });
  }

  try {
    // 1. Fetch the agent (using agentIdFromParam which is now verified)
    console.log(`[DEBUG] Attempting to fetch agent with ID: ${agentIdFromParam}`);
    const agent = await prisma.agent.findUnique({
      where: { id: agentIdFromParam },
      // No need to include votes/comments here, fetch counts later if needed
    });
    console.log(`[DEBUG] Agent fetch result:`, agent ? `Found agent ${agent.id}` : `Agent not found`);

    if (!agent) {
      // This case might be redundant due to the ownership check, but good for robustness
      return res.status(404).json({ error: 'Agent not found.' });
    }

    let overrideOccurred = false;

    // 2. Process feedback/override
    if (voteId) {
      console.log(`[DEBUG] Attempting to fetch vote with ID: ${voteId}`);
      const vote = await prisma.vote.findUnique({ where: { id: voteId } });
      console.log(`[DEBUG] Vote fetch result:`, vote ? `Found vote ${vote.id}` : `Vote not found`);
      
      // Ensure vote exists and belongs to the verified agent
      if (!vote) {
        console.log(`[DEBUG] Vote not found: ${voteId}`);
        return res.status(404).json({ error: 'Vote not found.' });
      }
      
      if (vote.agentId !== agentIdFromParam) {
        console.log(`[DEBUG] Vote belongs to agent ${vote.agentId}, not to ${agentIdFromParam}`);
        return res.status(403).json({ error: 'Vote does not belong to this agent.' });
      }
      if (!vote.overrideByUser) { // Only count the first override
         await prisma.vote.update({
           where: { id: voteId },
           data: { overrideByUser: true, overrideReason: reason },
         });
         overrideOccurred = true;
      }
    } else if (commentId) {
      // Still keeping comment feedback as not implemented
       return res.status(501).json({ error: 'Feedback on comments not fully implemented yet.' });
    }

    // 3. Recalculate Alignment Score if an override occurred
    let newAlignmentScore = agent.alignmentScore;
    if (overrideOccurred) {
        // Fetch fresh counts after update
        console.log(`[DEBUG] Recalculating alignment score for agent ${agentIdFromParam}`);
        const totalVotes = await prisma.vote.count({ where: { agentId: agentIdFromParam } });
        const overriddenVotes = await prisma.vote.count({ where: { agentId: agentIdFromParam, overrideByUser: true } });
        console.log(`[DEBUG] Agent stats: totalVotes=${totalVotes}, overriddenVotes=${overriddenVotes}`);

        const totalActions = totalVotes;
        const totalOverrides = overriddenVotes;

        if (totalActions > 0) {
            // Calculate score, ensure it's between 0 and 1
            newAlignmentScore = Math.max(0, Math.min(1, (totalActions - totalOverrides) / totalActions));
        } else {
            newAlignmentScore = 1; // Default to 1 if no actions yet
        }

        // 4. Update Agent's score
        await prisma.agent.update({
            where: { id: agentIdFromParam },
            data: { alignmentScore: newAlignmentScore },
        });
    }

    // 5. Call agent-service to generate updated alignment score explanation (optional)
    // Removed call to non-existent generateAlignmentExplanation function

    console.log(`[DEBUG] Feedback processing complete. New alignment score: ${newAlignmentScore}`);
    res.status(200).json({ message: 'Feedback processed.', newAlignmentScore });

  } catch (error) {
    console.error('Error processing feedback:', error);
    console.log(`[DEBUG] Error details:`, error);
    res.status(500).json({ error: 'Internal server error processing feedback.' });
  }
});

export default router;
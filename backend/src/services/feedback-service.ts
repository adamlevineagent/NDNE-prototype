import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger";

const prisma = new PrismaClient();

interface NegotiationFeedback {
  agentId: string;
  userId: string;
  negotiationId: string;
  rating: number;  // 1-5 scale
  representationAccuracy: number;  // 1-5 scale
  comments?: string;
  preferenceUpdates?: Record<string, any>;
}

/**
 * Process and store feedback for a negotiation
 * @param feedbackData The feedback data to process
 * @returns The created feedback record ID
 */
export async function processFeedback(
  feedbackData: NegotiationFeedback
): Promise<string> {
  try {
    // Validate input
    if (feedbackData.rating < 1 || feedbackData.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    if (feedbackData.representationAccuracy < 1 || feedbackData.representationAccuracy > 5) {
      throw new Error("Representation accuracy must be between 1 and 5");
    }

    // Check if negotiation exists
    const negotiation = await prisma.negotiationSession.findUnique({
      where: { id: feedbackData.negotiationId }
    });

    if (!negotiation) {
      throw new Error(`Negotiation session ${feedbackData.negotiationId} not found`);
    }

    // Check if agent exists and belongs to the user
    const agent = await prisma.agent.findUnique({
      where: { id: feedbackData.agentId },
      include: { user: true }
    });

    if (!agent) {
      throw new Error(`Agent ${feedbackData.agentId} not found`);
    }

    if (agent.user.id !== feedbackData.userId) {
      throw new Error(`Agent ${feedbackData.agentId} does not belong to user ${feedbackData.userId}`);
    }

    // Check if feedback already exists (one feedback per user per negotiation)
    const existingFeedback = await prisma.negotiationFeedback.findFirst({
      where: {
        agentId: feedbackData.agentId,
        negotiationId: feedbackData.negotiationId,
      }
    });

    if (existingFeedback) {
      // Update existing feedback
      const updatedFeedback = await prisma.negotiationFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          rating: feedbackData.rating,
          representationAccuracy: feedbackData.representationAccuracy,
          comments: feedbackData.comments || existingFeedback.comments,
          updatedAt: new Date(),
        }
      });

      // Update agent's alignment score and knowledge
      await updateAgentFromFeedback(feedbackData);

      return updatedFeedback.id;
    } else {
      // Create new feedback
      const feedback = await prisma.negotiationFeedback.create({
        data: {
          negotiationId: feedbackData.negotiationId,
          agentId: feedbackData.agentId,
          userId: feedbackData.userId,
          rating: feedbackData.rating,
          representationAccuracy: feedbackData.representationAccuracy,
          comments: feedbackData.comments || "",
        }
      });

      // Update agent's alignment score and knowledge
      await updateAgentFromFeedback(feedbackData);

      return feedback.id;
    }
  } catch (error) {
    logger.error(`Error processing feedback: ${error}`);
    throw error;
  }
}

/**
 * Update an agent's alignment score and user knowledge based on feedback
 * @param feedbackData The feedback data
 */
export async function updateAgentFromFeedback(
  feedbackData: NegotiationFeedback
): Promise<void> {
  try {
    // Fetch the agent with current alignment score
    const agent = await prisma.agent.findUnique({
      where: { id: feedbackData.agentId },
      select: {
        id: true,
        alignmentScore: true,
        userKnowledge: true
      }
    });

    if (!agent) {
      throw new Error(`Agent ${feedbackData.agentId} not found`);
    }

    // Calculate new alignment score - weighted average of current score and new rating
    // Weight factor: current score has 90% weight, new rating has 10% weight (smoothing)
    const currentWeight = 0.9;
    const newWeight = 0.1;
    const newAlignmentScore = 
      (agent.alignmentScore * currentWeight) + 
      ((feedbackData.rating / 5) * newWeight);

    // Update the agent's user knowledge with feedback insights
    const userKnowledge = agent.userKnowledge as any || {};
    
    // Track feedback history
    if (!userKnowledge.feedbackHistory) {
      userKnowledge.feedbackHistory = [];
    }
    
    userKnowledge.feedbackHistory.push({
      timestamp: new Date(),
      negotiationId: feedbackData.negotiationId,
      rating: feedbackData.rating,
      representationAccuracy: feedbackData.representationAccuracy,
    });
    
    // Keep only the last 10 feedback entries
    if (userKnowledge.feedbackHistory.length > 10) {
      userKnowledge.feedbackHistory = userKnowledge.feedbackHistory.slice(-10);
    }
    
    // Track average feedback metrics
    userKnowledge.averageRating = userKnowledge.feedbackHistory.reduce(
      (sum: number, item: any) => sum + item.rating, 0
    ) / userKnowledge.feedbackHistory.length;
    
    userKnowledge.averageRepresentationAccuracy = userKnowledge.feedbackHistory.reduce(
      (sum: number, item: any) => sum + item.representationAccuracy, 0
    ) / userKnowledge.feedbackHistory.length;
    
    // If preference updates are provided, incorporate them
    if (feedbackData.preferenceUpdates) {
      if (!userKnowledge.preferenceUpdates) {
        userKnowledge.preferenceUpdates = {};
      }
      
      // Merge the updates with existing preference updates
      Object.entries(feedbackData.preferenceUpdates).forEach(([key, value]) => {
        userKnowledge.preferenceUpdates[key] = value;
      });
    }

    // Update the agent
    await prisma.agent.update({
      where: { id: feedbackData.agentId },
      data: {
        alignmentScore: newAlignmentScore,
        userKnowledge: userKnowledge as any
      }
    });

  } catch (error) {
    logger.error(`Error updating agent from feedback: ${error}`);
    // We don't want to fail the entire feedback process if the agent update fails
    // So we log the error but don't rethrow it
  }
}

/**
 * Get feedback for a negotiation
 * @param negotiationId The negotiation ID
 * @param agentId Optional agent ID to filter by
 * @param userId Optional user ID to filter by
 */
export async function getFeedback(
  negotiationId: string,
  agentId?: string,
  userId?: string
): Promise<any[]> {
  const whereClause: any = { negotiationId };
  
  if (agentId) {
    whereClause.agentId = agentId;
  }
  
  if (userId) {
    whereClause.userId = userId;
  }
  
  return prisma.negotiationFeedback.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  });
}
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { HttpError } from '../utils/HttpError';

const router = Router();
const prisma = new PrismaClient();

/**
 * @route POST /api/chat/messages
 * @desc Create a new chat message
 * @access Private
 */
router.post('/messages', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { content, agentId, metadata } = req.body;
    
    if (!req.user) {
      throw new HttpError('Unauthorized', 401);
    }
    
    const userId = req.user.userId; // JWT payload has userId, not id

    if (!content || !agentId) {
      throw new HttpError('Content and agentId are required', 400);
    }

    // Verify the agent belongs to the user - Type assertion for now until migration is applied
    const agent = await (prisma as any).agent.findFirst({
      where: {
        id: agentId,
        userId: userId
      }
    });

    if (!agent) {
      throw new HttpError('Agent not found or does not belong to user', 404);
    }

    // Create the user message - Type assertion for now until migration is applied
    const userMessage = await (prisma as any).chatMessage.create({
      data: {
        userId,
        agentId,
        content,
        sender: 'user',
        metadata: metadata || {},
        timestamp: new Date()
      }
    });

    // Process the message and get agent's response
    // This would be implemented in a separate service
    // For now, we'll mock a simple response
    const agentResponse = await generateAgentResponse(userId, agentId, content);

    // Save the agent's response - Type assertion for now until migration is applied
    const agentMessage = await (prisma as any).chatMessage.create({
      data: {
        userId,
        agentId,
        content: agentResponse,
        sender: 'agent',
        timestamp: new Date()
      }
    });

    // Update agent's lastInteraction timestamp
    // Type assertion for now until migration is applied
    await (prisma as any).agent.update({
      where: { id: agentId },
      data: { lastInteraction: new Date() }
    });

    res.status(201).json({
      userMessage,
      agentMessage
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/chat/messages
 * @desc Get chat history with pagination
 * @access Private
 */
router.get('/messages', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError('Unauthorized', 401);
    }
    
    const userId = req.user.userId;
    const { agentId, limit = 50, before, onboarding } = req.query;

    if (!agentId) {
      throw new HttpError('Agent ID is required', 400);
    }

    // Verify the agent belongs to the user - Type assertion for now until migration is applied
    const agent = await (prisma as any).agent.findFirst({
      where: {
        id: String(agentId),
        userId: userId
      }
    });

    if (!agent) {
      throw new HttpError('Agent not found or does not belong to user', 404);
    }

    // Build query conditions
    const whereClause: any = {
      userId,
      agentId: String(agentId)
    };

    // Add timestamp condition if 'before' is provided
    if (before) {
      whereClause.timestamp = {
        lt: new Date(String(before))
      };
    }

    // If onboarding flag is set, filter messages accordingly
    // This would require adding an 'isOnboarding' field to the ChatMessage model
    // For now, we'll just leave this as a comment
    // if (onboarding === 'true') {
    //   whereClause.isOnboarding = true;
    // }

    // Fetch messages
    // Type assertion for now until migration is applied
    const messages = await (prisma as any).chatMessage.findMany({
      where: whereClause,
      orderBy: {
        timestamp: 'desc'
      },
      take: Number(limit) + 1 // Fetch one extra to check if there are more
    });

    const hasMore = messages.length > Number(limit);
    const nextCursor = hasMore ? messages[messages.length - 2].timestamp.toISOString() : undefined;

    // Return all but the extra message if we fetched more than the limit
    const messagesToReturn = hasMore ? messages.slice(0, -1) : messages;

    res.status(200).json({
      messages: messagesToReturn.reverse(), // Reverse to get chronological order
      hasMore,
      nextCursor
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/chat/messages/:id
 * @desc Get a specific message
 * @access Private
 */
router.get('/messages/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError('Unauthorized', 401);
    }
    
    const userId = req.user.userId;
    const messageId = req.params.id;

    // Type assertion for now until migration is applied
    const message = await (prisma as any).chatMessage.findFirst({
      where: {
        id: messageId,
        userId: userId
      }
    });

    if (!message) {
      throw new HttpError('Message not found', 404);
    }

    res.status(200).json(message);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/chat/messages/:id
 * @desc Delete a message
 * @access Private
 */
router.delete('/messages/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError('Unauthorized', 401);
    }
    
    const userId = req.user.userId;
    const messageId = req.params.id;

    // Type assertion for now until migration is applied
    const message = await (prisma as any).chatMessage.findFirst({
      where: {
        id: messageId,
        userId: userId
      }
    });

    if (!message) {
      throw new HttpError('Message not found', 404);
    }

    // Type assertion for now until migration is applied
    await (prisma as any).chatMessage.delete({
      where: {
        id: messageId
      }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Placeholder function for generating agent responses
// This will be implemented properly in the agent service
async function generateAgentResponse(userId: string, agentId: string, message: string): Promise<string> {
  logger.info(`Generating response for message from user ${userId} to agent ${agentId}`);
  // In a real implementation, this would call the agent service to generate a response
  // For now, return a simple acknowledgment
  return `I received your message: "${message}". This is a placeholder response until the LLM integration is complete.`;
}

export default router;
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { HttpError } from '../utils/HttpError';

const router = Router();
const prisma = new PrismaClient();
import { callOpenRouterLLM } from "../services/llm-service";

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

    // Debug logging for agent lookup
    logger.info(`[Chat] userId from JWT: ${userId}, agentId from request: ${agentId}`);
    const agent = await (prisma as any).agent.findFirst({
      where: {
        id: agentId,
        userId: userId
      }
    });
    logger.info(`[Chat] agent lookup result: ${agent ? JSON.stringify({ id: agent.id, userId: agent.userId }) : "not found"}`);

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

    // Fetch recent chat history for context (last 10 messages)
    const recentMessages = await (prisma as any).chatMessage.findMany({
      where: { userId, agentId },
      orderBy: { timestamp: "desc" },
      take: 10,
    });
    const contextMessages = recentMessages
      .reverse()
      .map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      }));

    // Determine if this is part of onboarding
    const isOnboarding = metadata && metadata.isOnboarding === true;
    
    // Generate response differently based on whether this is onboarding or regular chat
    let agentResponse: string;
    let responseMetadata = {};
    
    try {
      if (isOnboarding) {
        // Import agent service dynamically to avoid circular dependencies
        const agentService = await import('../services/agent-service');
        
        // Get current onboarding stage from metadata or default to 'initial'
        const currentStage = metadata.stage || 'initial';
        
        // Use conductOnboardingChat for onboarding messages
        const result = await agentService.conductOnboardingChat(
          userId,
          agentId,
          content,
          currentStage
        );
        
        agentResponse = result.response;
        responseMetadata = {
          isOnboarding: true,
          stage: currentStage,
          nextStage: result.nextStep,
          onboardingComplete: result.completedOnboarding || false
        };
        
        logger.info(`[Onboarding] Stage: ${currentStage} → ${result.nextStep}, Complete: ${result.completedOnboarding}`);
      } else {
        // Regular chat message - use standard LLM call
        agentResponse = await callOpenRouterLLM({
          prompt: content,
          contextMessages,
          model: "openai/gpt-4.1",
          temperature: 0.7,
          maxTokens: 256,
        });
      }
    } catch (err: any) {
      logger.error("Response generation failed:", err);
      agentResponse = "Sorry, I couldn't process your message due to an internal error.";
    }

    // Save the agent's response with any special metadata - Type assertion for now until migration is applied
    const agentMessage = await (prisma as any).chatMessage.create({
      data: {
        userId,
        agentId,
        content: agentResponse,
        sender: 'agent',
        timestamp: new Date(),
        metadata: responseMetadata
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
/* LLM integration now handled in main route */

export default router;
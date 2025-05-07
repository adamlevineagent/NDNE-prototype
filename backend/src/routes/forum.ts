import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { HttpError } from '../utils/HttpError';
import {
  generateDiscoursePostContent,
  processDiscourseContent,
  postContentToDiscourse,
  readContentFromDiscourse,
  addMonitoredDiscourseTopic,
  removeMonitoredDiscourseTopic,
  getMonitoredDiscourseTopics
} from '../services/forum-interaction-service';

const router = Router();
const prisma = new PrismaClient();

/**
 * @route POST /api/forum/generate-post
 * @desc Generate content for a Discourse forum post
 * @access Private
 */
router.post('/generate-post', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError('Unauthorized', 401);
    }
    
    const userId = req.user.userId;
    const { agentId, category, title, topic } = req.body;
    
    if (!agentId || !category || !title || !topic) {
      throw new HttpError('Agent ID, category, title, and topic are required', 400);
    }
    
    // Verify the agent belongs to the user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: userId
      }
    });
    
    if (!agent) {
      throw new HttpError('Agent not found or does not belong to user', 404);
    }
    
    // Generate forum post content using the service
    const directive = `Create a post about "${topic}" with title "${title}" for the "${category}" category`;
    const postContent = await generateDiscoursePostContent(agentId, directive, topic);
    
    // Ensure the title is set if not provided by the LLM
    if (!postContent.title) {
      postContent.title = title;
    }
    
    // Add category name (the LLM only returns categoryId if available)
    const response = {
      ...postContent,
      category: category
    };
    
    // Log the activity in the database
    await (prisma as any).auditLog.create({
      data: {
        userId,
        action: 'FORUM_POST_GENERATED',
        details: JSON.stringify({
          agentId,
          category,
          title,
          topic
        })
      }
    });
    
    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`Error generating forum post: ${error.message}`);
    next(error);
  }
});

/**
 * @route POST /api/forum/process-content
 * @desc Process and analyze Discourse forum content
 * @access Private
 */
router.post('/process-content', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError('Unauthorized', 401);
    }
    
    const userId = req.user.userId;
    const { agentId, category, topic, content } = req.body;
    
    if (!agentId || !content || !category || !topic) {
      throw new HttpError('Agent ID, category, topic, and content are required', 400);
    }
    
    // Verify the agent belongs to the user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: userId
      }
    });
    
    if (!agent) {
      throw new HttpError('Agent not found or does not belong to user', 404);
    }
    
    // Process the forum content using the service
    // Construct a mock topic URL for context
    const mockTopicUrl = `https://discourse.example.com/${encodeURIComponent(category)}/${encodeURIComponent(topic)}`;
    const analysisContent = await processDiscourseContent(agentId, content, mockTopicUrl);
    
    // Log the activity in the database
    await (prisma as any).auditLog.create({
      data: {
        userId,
        action: 'FORUM_CONTENT_PROCESSED',
        details: JSON.stringify({
          agentId,
          category,
          topic,
          contentLength: content.length
        })
      }
    });
    
    res.status(200).json(analysisContent);
  } catch (error: any) {
    logger.error(`Error processing forum content: ${error.message}`);
    next(error);
  }
});

/**
 * @route POST /api/forum/post-to-discourse
 * @desc Post content to Discourse forum
 * @access Private
 */
router.post('/post-to-discourse', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError('Unauthorized', 401);
    }
    
    const userId = req.user.userId;
    const { agentId, directive, topicContext } = req.body;
    
    if (!agentId || !directive) {
      throw new HttpError('Agent ID and directive are required', 400);
    }
    
    // Verify the agent belongs to the user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: userId
      }
    });
    
    if (!agent) {
      throw new HttpError('Agent not found or does not belong to user', 404);
    }
    
    // Post to Discourse using the service
    const result = await postContentToDiscourse(agentId, directive, topicContext);
    
    // Log the activity in the database
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DISCOURSE_POST_API_USED',
        details: JSON.stringify({
          agentId,
          directive,
          success: result.success,
          postUrl: result.postUrlOrId
        })
      }
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    logger.error(`Error posting to Discourse: ${error.message}`);
    next(error);
  }
});

/**
 * @route GET /api/forum/read-from-discourse
 * @desc Read content from Discourse forum
 * @access Private
 */
router.get('/read-from-discourse', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError('Unauthorized', 401);
    }
    
    const userId = req.user.userId;
    const agentId = req.query.agentId as string;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined;
    const topicId = req.query.topicId ? parseInt(req.query.topicId as string, 10) : undefined;
    const lastReadPostNumber = req.query.lastReadPostNumber ? parseInt(req.query.lastReadPostNumber as string, 10) : undefined;
    
    if (!agentId) {
      throw new HttpError('Agent ID is required', 400);
    }
    
    if (!categoryId && !topicId) {
      throw new HttpError('Either category ID or topic ID must be specified', 400);
    }
    
    // Verify the agent belongs to the user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: userId
      }
    });
    
    if (!agent) {
      throw new HttpError('Agent not found or does not belong to user', 404);
    }
    
    // Read from Discourse using the service
    const result = await readContentFromDiscourse(agentId, categoryId, topicId, lastReadPostNumber);
    
    // Log the activity in the database
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DISCOURSE_READ_API_USED',
        details: JSON.stringify({
          agentId,
          categoryId,
          topicId,
          success: result.success,
          contentCount: result.contents?.length || 0
        })
      }
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    logger.error(`Error reading from Discourse: ${error.message}`);
    next(error);
  }
});

/**
 * @route POST /api/forum/monitor-topic
 * @desc Start monitoring a Discourse topic or category
 * @access Private
 */
router.post('/monitor-topic', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError('Unauthorized', 401);
    }
    
    const userId = req.user.userId;
    const { agentId, topicId, categoryId } = req.body;
    
    if (!agentId) {
      throw new HttpError('Agent ID is required', 400);
    }
    
    if (!topicId && !categoryId) {
      throw new HttpError('Either topic ID or category ID must be specified', 400);
    }
    
    // Verify the agent belongs to the user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: userId
      }
    });
    
    if (!agent) {
      throw new HttpError('Agent not found or does not belong to user', 404);
    }
    
    // Add the topic/category to the agent's monitored list
    const result = await addMonitoredDiscourseTopic(
      agentId,
      topicId ? parseInt(topicId, 10) : undefined,
      categoryId ? parseInt(categoryId, 10) : undefined
    );
    
    // Log the activity in the database
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DISCOURSE_MONITORING_STARTED',
        details: JSON.stringify({
          agentId,
          topicId,
          categoryId,
          success: result.success
        })
      }
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    logger.error(`Error adding monitored topic: ${error.message}`);
    next(error);
  }
});

/**
 * @route POST /api/forum/stop-monitoring
 * @desc Stop monitoring a Discourse topic or category
 * @access Private
 */
router.post('/stop-monitoring', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError('Unauthorized', 401);
    }
    
    const userId = req.user.userId;
    const { agentId, topicId, categoryId } = req.body;
    
    if (!agentId) {
      throw new HttpError('Agent ID is required', 400);
    }
    
    if (!topicId && !categoryId) {
      throw new HttpError('Either topic ID or category ID must be specified', 400);
    }
    
    // Verify the agent belongs to the user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: userId
      }
    });
    
    if (!agent) {
      throw new HttpError('Agent not found or does not belong to user', 404);
    }
    
    // Remove the topic/category from the agent's monitored list
    const result = await removeMonitoredDiscourseTopic(
      agentId,
      topicId ? parseInt(topicId, 10) : undefined,
      categoryId ? parseInt(categoryId, 10) : undefined
    );
    
    // Log the activity in the database
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DISCOURSE_MONITORING_STOPPED',
        details: JSON.stringify({
          agentId,
          topicId,
          categoryId,
          success: result.success
        })
      }
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    logger.error(`Error removing monitored topic: ${error.message}`);
    next(error);
  }
});

/**
 * @route GET /api/forum/monitored-topics
 * @desc Get an agent's monitored Discourse topics
 * @access Private
 */
router.get('/monitored-topics', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new HttpError('Unauthorized', 401);
    }
    
    const userId = req.user.userId;
    const agentId = req.query.agentId as string;
    
    if (!agentId) {
      throw new HttpError('Agent ID is required', 400);
    }
    
    // Verify the agent belongs to the user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: userId
      }
    });
    
    if (!agent) {
      throw new HttpError('Agent not found or does not belong to user', 404);
    }
    
    // Get the agent's monitored topics
    const monitoredTopics = await getMonitoredDiscourseTopics(agentId);
    
    res.status(200).json({
      success: true,
      monitoredTopics
    });
  } catch (error: any) {
    logger.error(`Error getting monitored topics: ${error.message}`);
    next(error);
  }
});

export default router;
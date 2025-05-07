/**
 * Forum Polling Service
 * 
 * This service provides automated polling functionality to monitor Discourse forum topics
 * for new content and notify agents' Sovereigns when relevant updates are found.
 * 
 * It forms a key part of the NDNE Phase 2 (Programmatic Bridge) implementation.
 */

import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger";
import {
  getMonitoredDiscourseTopics,
  readContentFromDiscourse,
  processDiscourseContent
} from "./forum-interaction-service";
import chatService from "./chat-service";

// Initialize Prisma client
const prisma = new PrismaClient();

// Poll configuration from environment variables
const POLL_INTERVAL_MINUTES = parseInt(process.env.DISCOURSE_POLL_INTERVAL_MINUTES || '15', 10);
const POLL_BATCH_SIZE = parseInt(process.env.DISCOURSE_POLL_BATCH_SIZE || '5', 10);
const MAX_POSTS_PER_POLL = parseInt(process.env.DISCOURSE_MAX_POSTS_PER_POLL || '20', 10);

// Keep track of the poll interval timer
let pollIntervalTimer: NodeJS.Timeout | null = null;

// Interface to track the last read post for each topic/category
interface TopicTracking {
  topicId: number;
  lastReadPostNumber: number;
}

interface CategoryTracking {
  categoryId: number;
  lastCheckedAt: Date;
}

// Map to track last read posts by agent
const agentTopicTrackingMap = new Map<string, TopicTracking[]>();
const agentCategoryTrackingMap = new Map<string, CategoryTracking[]>();

/**
 * Main polling function that processes monitored topics for all agents
 */
async function pollForumContent() {
  try {
    logger.info("Starting forum content polling cycle");
    
    // Get all agents - we'll filter for those with monitored topics in memory
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        userId: true,
        name: true
      }
    });
    
    // Manually query for monitoredDiscourseTopics as a raw field
    const agentsWithTopics = [];
    for (const agent of agents) {
      // Use raw query to get the monitoredDiscourseTopics field directly
      const result = await prisma.$queryRaw`
        SELECT "monitoredDiscourseTopics" FROM "Agent" WHERE id = ${agent.id}
      `;
      
      if (Array.isArray(result) && result.length > 0) {
        const monitoredTopics = (result[0] as any).monitoredDiscourseTopics;
        
        // Parse the JSON and check if it has any topics or categories
        let parsedTopics;
        try {
          parsedTopics = typeof monitoredTopics === 'object'
            ? monitoredTopics
            : JSON.parse(monitoredTopics || '{"categoryIds": [], "topicIds": []}');
        } catch (error) {
          parsedTopics = { categoryIds: [], topicIds: [] };
        }
        
        // Only include agents that have at least one monitored topic or category
        if (
          parsedTopics &&
          (parsedTopics.topicIds?.length > 0 || parsedTopics.categoryIds?.length > 0)
        ) {
          agentsWithTopics.push({
            ...agent,
            monitoredDiscourseTopics: parsedTopics
          });
        }
      }
    }
    
    logger.info(`Found ${agentsWithTopics.length} agents with monitored forum content`);
    
    // Process agents in batches to avoid overwhelming the Discourse API
    const batchSize = POLL_BATCH_SIZE;
    for (let i = 0; i < agentsWithTopics.length; i += batchSize) {
      const agentBatch = agentsWithTopics.slice(i, i + batchSize);
      
      // Process each agent in the batch
      const batchPromises = agentBatch.map(agent => processAgentMonitoring(agent));
      await Promise.allSettled(batchPromises);
      
      // Add a small delay between batches to be gentle on the API
      if (i + batchSize < agentsWithTopics.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    logger.info("Forum content polling cycle completed");
  } catch (error: any) {
    logger.error(`Error during forum content polling: ${error.message}`);
  }
}

/**
 * Process monitored topics and categories for a single agent
 * 
 * @param agent Agent data with monitored topics
 */
async function processAgentMonitoring(agent: any) {
  try {
    const agentId = agent.id;
    const userId = agent.userId;
    const agentName = agent.name || "Agent";
    
    // Parse the monitoredDiscourseTopics JSON field
    let monitoredTopics: { categoryIds: number[], topicIds: number[] };
    try {
      monitoredTopics = typeof agent.monitoredDiscourseTopics === 'string'
        ? JSON.parse(agent.monitoredDiscourseTopics)
        : agent.monitoredDiscourseTopics;
    } catch (error) {
      logger.error(`Error parsing monitoredDiscourseTopics for agent ${agentId}: ${error}`);
      monitoredTopics = { categoryIds: [], topicIds: [] };
    }
    
    // Skip if the agent has no monitored topics
    if (
      !monitoredTopics ||
      (monitoredTopics.topicIds.length === 0 && monitoredTopics.categoryIds.length === 0)
    ) {
      return;
    }
    
    logger.info(`Processing monitored content for agent ${agentId}: ${monitoredTopics.topicIds.length} topics, ${monitoredTopics.categoryIds.length} categories`);
    
    // Initialize tracking maps for this agent if they don't exist
    if (!agentTopicTrackingMap.has(agentId)) {
      agentTopicTrackingMap.set(agentId, []);
    }
    if (!agentCategoryTrackingMap.has(agentId)) {
      agentCategoryTrackingMap.set(agentId, []);
    }
    
    // Process monitored topics
    for (const topicId of monitoredTopics.topicIds) {
      await processMonitoredTopic(agentId, userId, agentName, topicId);
    }
    
    // Process monitored categories
    for (const categoryId of monitoredTopics.categoryIds) {
      await processMonitoredCategory(agentId, userId, agentName, categoryId);
    }
  } catch (error: any) {
    logger.error(`Error processing monitored content for agent ${agent.id}: ${error.message}`);
  }
}

/**
 * Process a single monitored topic for new posts
 * 
 * @param agentId ID of the agent monitoring the topic
 * @param userId ID of the sovereign user
 * @param agentName Name of the agent for notifications
 * @param topicId ID of the monitored topic
 */
async function processMonitoredTopic(
  agentId: string,
  userId: string,
  agentName: string,
  topicId: number
) {
  try {
    // Get the last read post number for this topic
    const agentTopicTracking = agentTopicTrackingMap.get(agentId) || [];
    const topicTracking = agentTopicTracking.find(t => t.topicId === topicId);
    const lastReadPostNumber = topicTracking?.lastReadPostNumber || 0;
    
    logger.info(`Checking topic ${topicId} for agent ${agentId}, last read post: ${lastReadPostNumber}`);
    
    // Read content from the topic
    const result = await readContentFromDiscourse(
      agentId,
      undefined, // No categoryId
      topicId,
      lastReadPostNumber
    );
    
    // If there's no new content or an error, skip processing
    if (!result.success || !result.contents || result.contents.length === 0) {
      if (!result.success) {
        logger.warn(`Failed to read content from topic ${topicId}: ${result.error}`);
      }
      return;
    }
    
    // Get the highest post number from the new posts
    const newPosts = result.contents;
    const highestPostNumber = Math.max(...newPosts.map(post => post.postId));
    
    // Limit the number of posts to process to avoid overwhelming the system
    const postsToProcess = newPosts.slice(0, MAX_POSTS_PER_POLL);
    
    logger.info(`Found ${newPosts.length} new posts in topic ${topicId}, processing ${postsToProcess.length}`);
    
    if (postsToProcess.length > 0) {
      // Format the posts for analysis
      const contentText = postsToProcess.map(post =>
        `## Post by ${post.username} (${new Date(post.createdAt).toLocaleString()}):\n${post.content}`
      ).join('\n\n');
      
      // Generate the topic URL
      const discourseUrl = process.env.DISCOURSE_URL || 'https://discourse.example.com';
      const topicUrl = `${discourseUrl}/t/${topicId}`;
      
      // Process the content using the forum interaction service
      const analysis = await processDiscourseContent(
        agentId,
        contentText,
        topicUrl
      );
      
      // Notify the Sovereign user with the analysis
      await notifySovOfNewContent(
        agentId,
        userId,
        agentName,
        `Topic #${topicId}`,
        topicUrl,
        postsToProcess.length,
        analysis
      );
      
      // Update the last read post number
      const updatedTracking = {
        topicId,
        lastReadPostNumber: highestPostNumber
      };
      
      // Update the tracking map
      const existingIndex = agentTopicTracking.findIndex(t => t.topicId === topicId);
      if (existingIndex >= 0) {
        agentTopicTracking[existingIndex] = updatedTracking;
      } else {
        agentTopicTracking.push(updatedTracking);
      }
      agentTopicTrackingMap.set(agentId, agentTopicTracking);
      
      logger.info(`Updated last read post for topic ${topicId} to ${highestPostNumber}`);
    }
  } catch (error: any) {
    logger.error(`Error processing monitored topic ${topicId} for agent ${agentId}: ${error.message}`);
  }
}

/**
 * Process a single monitored category for new topics or posts
 * 
 * @param agentId ID of the agent monitoring the category
 * @param userId ID of the sovereign user
 * @param agentName Name of the agent for notifications
 * @param categoryId ID of the monitored category
 */
async function processMonitoredCategory(
  agentId: string,
  userId: string,
  agentName: string,
  categoryId: number
) {
  try {
    // Get the last checked timestamp for this category
    const agentCategoryTracking = agentCategoryTrackingMap.get(agentId) || [];
    const categoryTracking = agentCategoryTracking.find(c => c.categoryId === categoryId);
    
    // If we checked this category less than 30 minutes ago, skip it to reduce API calls
    // (Categories are broader and don't need to be checked as frequently as specific topics)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (categoryTracking && categoryTracking.lastCheckedAt > thirtyMinutesAgo) {
      logger.info(`Skipping category ${categoryId} check, last checked ${categoryTracking.lastCheckedAt}`);
      return;
    }
    
    logger.info(`Checking category ${categoryId} for agent ${agentId}`);
    
    // Read content from the category
    const result = await readContentFromDiscourse(
      agentId,
      categoryId
    );
    
    // If there's no content or an error, skip processing
    if (!result.success || !result.contents || result.contents.length === 0) {
      if (!result.success) {
        logger.warn(`Failed to read content from category ${categoryId}: ${result.error}`);
      }
      
      // Update the last checked timestamp even if there's no new content
      const updatedTracking = {
        categoryId,
        lastCheckedAt: new Date()
      };
      
      const existingIndex = agentCategoryTracking.findIndex(c => c.categoryId === categoryId);
      if (existingIndex >= 0) {
        agentCategoryTracking[existingIndex] = updatedTracking;
      } else {
        agentCategoryTracking.push(updatedTracking);
      }
      agentCategoryTrackingMap.set(agentId, agentCategoryTracking);
      
      return;
    }
    
    // Format the category topics for analysis
    const contentText = result.contents.map(post =>
      `## Topic by ${post.username} (${new Date(post.createdAt).toLocaleString()}):\n${post.content}`
    ).join('\n\n');
    
    // Generate the category URL
    const discourseUrl = process.env.DISCOURSE_URL || 'https://discourse.example.com';
    const categoryUrl = `${discourseUrl}/c/${categoryId}`;
    
    // Process the content using the forum interaction service
    const analysis = await processDiscourseContent(
      agentId,
      contentText,
      categoryUrl
    );
    
    // Notify the Sovereign user with the analysis
    await notifySovOfNewContent(
      agentId,
      userId,
      agentName,
      `Category #${categoryId}`,
      categoryUrl,
      result.contents.length,
      analysis
    );
    
    // Update the last checked timestamp
    const updatedTracking = {
      categoryId,
      lastCheckedAt: new Date()
    };
    
    const existingIndex = agentCategoryTracking.findIndex(c => c.categoryId === categoryId);
    if (existingIndex >= 0) {
      agentCategoryTracking[existingIndex] = updatedTracking;
    } else {
      agentCategoryTracking.push(updatedTracking);
    }
    agentCategoryTrackingMap.set(agentId, agentCategoryTracking);
    
    logger.info(`Updated last checked timestamp for category ${categoryId}`);
  } catch (error: any) {
    logger.error(`Error processing monitored category ${categoryId} for agent ${agentId}: ${error.message}`);
  }
}

/**
 * Send a notification to a Sovereign user about new forum content
 * 
 * @param agentId ID of the agent monitoring the content
 * @param userId ID of the sovereign user
 * @param agentName Name of the agent for the message
 * @param sourceType Description of the source (topic or category)
 * @param sourceUrl URL to the original content
 * @param postCount Number of new posts found
 * @param analysis Analysis results from forum-interaction-service
 */
async function notifySovOfNewContent(
  agentId: string,
  userId: string,
  agentName: string,
  sourceType: string,
  sourceUrl: string,
  postCount: number,
  analysis: string
) {
  try {
    // Parse the analysis JSON if it's a string in JSON format
    let parsedAnalysis: any = analysis;
    try {
      if (typeof analysis === 'string' && analysis.trim().startsWith('{')) {
        parsedAnalysis = JSON.parse(analysis);
      }
    } catch {
      // If parsing fails, use the raw analysis text
      parsedAnalysis = { summary: "Analysis unavailable in structured format" };
    }
    
    // Extract relevant information from the analysis
    const summary = typeof parsedAnalysis === 'object' ? 
      (parsedAnalysis.summary || "No summary available") : 
      analysis.substring(0, 300) + (analysis.length > 300 ? '...' : '');
    
    const relevanceScore = typeof parsedAnalysis === 'object' && parsedAnalysis.relevanceScore ?
      parsedAnalysis.relevanceScore : 
      "N/A";
      
    const keyTopics = typeof parsedAnalysis === 'object' && Array.isArray(parsedAnalysis.keyTopics) ? 
      parsedAnalysis.keyTopics.join(", ") : 
      "No key topics extracted";
    
    // Format a message for the Sovereign
    const message = `
📢 **Forum Update: New content in ${sourceType}**

I found ${postCount} new posts that might interest you.

**Summary**: ${summary}

**Key Topics**: ${keyTopics}

**Relevance Score**: ${relevanceScore}/10

[View the original content](${sourceUrl})

Would you like me to take any action regarding this topic?
    `.trim();
    
    // Send the message via the chat service
    await chatService.saveMessage(
      userId,
      agentId,
      message,
      'agent',
      {
        forumUpdate: true,
        sourceType,
        sourceUrl,
        postCount,
        timestamp: new Date().toISOString()
      }
    );
    
    // Log the notification
    logger.info(`Sent forum update notification to user ${userId} from agent ${agentId} about ${sourceType}`);
    
    // Record this notification in the audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'FORUM_UPDATE_NOTIFICATION',
        targetId: agentId,
        details: JSON.stringify({
          sourceType,
          sourceUrl,
          postCount,
          timestamp: new Date().toISOString()
        })
      }
    });
  } catch (error: any) {
    logger.error(`Error sending forum update notification: ${error.message}`);
  }
}

/**
 * Start the forum polling service
 * 
 * @returns Promise that resolves when the service is started
 */
export async function startForumPollingService(): Promise<void> {
  try {
    // Clear any existing poll interval
    if (pollIntervalTimer) {
      clearInterval(pollIntervalTimer);
    }
    
    // Convert minutes to milliseconds
    const intervalMs = POLL_INTERVAL_MINUTES * 60 * 1000;
    
    logger.info(`Starting forum polling service with ${POLL_INTERVAL_MINUTES} minute interval`);
    
    // Run an initial poll immediately
    await pollForumContent();
    
    // Set up the interval for future polls
    pollIntervalTimer = setInterval(pollForumContent, intervalMs);
    
    // Log startup in audit log
    await prisma.auditLog.create({
      data: {
        userId: 'system',
        action: 'FORUM_POLLING_SERVICE_STARTED',
        details: JSON.stringify({
          intervalMinutes: POLL_INTERVAL_MINUTES,
          maxPostsPerPoll: MAX_POSTS_PER_POLL,
          timestamp: new Date().toISOString()
        })
      }
    });
  } catch (error: any) {
    logger.error(`Error starting forum polling service: ${error.message}`);
    throw error;
  }
}

/**
 * Stop the forum polling service
 * 
 * @returns Promise that resolves when the service is stopped
 */
export async function stopForumPollingService(): Promise<void> {
  try {
    if (pollIntervalTimer) {
      clearInterval(pollIntervalTimer);
      pollIntervalTimer = null;
      
      logger.info("Forum polling service stopped");
      
      // Log shutdown in audit log
      await prisma.auditLog.create({
        data: {
          userId: 'system',
          action: 'FORUM_POLLING_SERVICE_STOPPED',
          details: JSON.stringify({
            timestamp: new Date().toISOString()
          })
        }
      });
    }
  } catch (error: any) {
    logger.error(`Error stopping forum polling service: ${error.message}`);
    throw error;
  }
}

/**
 * Get the current status of the forum polling service
 * 
 * @returns Object with service status information
 */
export function getForumPollingStatus(): {
  isRunning: boolean;
  intervalMinutes: number;
  trackedAgents: number;
} {
  return {
    isRunning: pollIntervalTimer !== null,
    intervalMinutes: POLL_INTERVAL_MINUTES,
    trackedAgents: agentTopicTrackingMap.size
  };
}

// Export the service functions
export default {
  startForumPollingService,
  stopForumPollingService,
  getForumPollingStatus,
  pollForumContent // Export for manual trigger
};
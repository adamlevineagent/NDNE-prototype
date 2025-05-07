import { PrismaClient, Prisma } from "@prisma/client";
import { generateNegotiationStance, NegotiationStance } from "./stance-generator";
import { callOpenRouterLLM } from "./llm-service";
import discourseApiService from "./discourse-api-service";
import {
  FORUM_POST_SYSTEM_INSTRUCTION,
  FORUM_POST_TEMPLATE,
  FORUM_REPLY_TEMPLATE,
  FORUM_CONTENT_PROCESSING_SYSTEM_INSTRUCTION,
  FORUM_CONTENT_PROCESSING_TEMPLATE
} from "./prompt-templates/forum-prompts";
import logger from "../utils/logger";

// Initialize Prisma client
const prisma = new PrismaClient();

// Define Message type to match llm-service.ts
type Message = { role: "system" | "user" | "assistant"; content: string };

// Define types for monitoring functions
interface MonitoredDiscourseTopics {
  categoryIds: number[];
  topicIds: number[];
}

/**
 * Interface for Discourse post content
 */
interface DiscoursePostContent {
  title?: string;
  body: string;
  categoryId?: number;
}

/**
 * Generate content for a Discourse forum post based on an agent's preferences and a directive
 * 
 * @param agentId The ID of the agent generating the content
 * @param sovDirective The directive/request from the Sovereign user
 * @param topicContext Optional additional context about the topic
 * @returns Structured content for a Discourse post
 */
export async function generateDiscoursePostContent(
  agentId: string,
  sovDirective: string, 
  topicContext?: string
): Promise<DiscoursePostContent> {
  try {
    // Fetch the agent's data including preferences
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Extract the agent's preferences, particularly the issues matrix
    const preferences = agent.preferences as any;
    const issuesMatrix = preferences.issuesMatrix || [];
    
    // Generate a stance based on the agent's preferences and the directive
    const stance: NegotiationStance = await generateNegotiationStance(
      agentId,
      sovDirective,
      topicContext
    );

    // Prepare the prompt for the LLM
    let prompt = FORUM_POST_TEMPLATE
      .replace("{topic}", sovDirective)
      .replace("{preferences}", JSON.stringify(preferences, null, 2))
      .replace("{issuesMatrix}", JSON.stringify(issuesMatrix, null, 2));
      
    // Add topic context if provided
    prompt = prompt.replace(
      "{topicContextPlaceholder}", 
      topicContext ? `CONTEXT: ${topicContext}\n` : ''
    );

    // Call the LLM with the prompt and system instruction
    const contextMessages: Message[] = [
      { role: "system", content: FORUM_POST_SYSTEM_INSTRUCTION }
    ];
    
    const response = await callOpenRouterLLM({
      prompt,
      contextMessages,
      temperature: 0.7,
      maxTokens: 2000, // Increase token limit for detailed post
    });

    // Parse the LLM response as JSON to extract structured content
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in LLM response");
      }
      
      const postContent = JSON.parse(jsonMatch[0]) as DiscoursePostContent;
      
      // Validate the post content
      if (!postContent.body) {
        throw new Error("LLM response missing required 'body' field");
      }
      
      return postContent;
    } catch (parseError: any) {
      logger.error(`Failed to parse LLM response into post content: ${parseError.message}`);
      
      // Fall back to returning the raw response as the body if parsing fails
      return {
        title: sovDirective.length > 50 ? `${sovDirective.substring(0, 47)}...` : sovDirective,
        body: response
      };
    }
  } catch (error: any) {
    logger.error(`Error generating Discourse post content: ${error.message}`);
    throw error;
  }
}

/**
 * Generate content for a Discourse forum reply based on an agent's preferences and context
 * 
 * @param agentId The ID of the agent generating the reply
 * @param originalPost The content of the post being replied to
 * @param sovDirective The directive/request from the Sovereign user
 * @param topicContext Optional additional context about the topic
 * @returns Structured content for a Discourse reply
 */
export async function generateDiscourseReplyContent(
  agentId: string,
  originalPost: string,
  sovDirective: string, 
  topicContext?: string
): Promise<DiscoursePostContent> {
  try {
    // Fetch the agent's data including preferences
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Extract the agent's preferences, particularly the issues matrix
    const preferences = agent.preferences as any;
    const issuesMatrix = preferences.issuesMatrix || [];
    
    // Generate a stance based on the agent's preferences and the directive
    const stance: NegotiationStance = await generateNegotiationStance(
      agentId,
      sovDirective,
      topicContext
    );

    // Prepare the prompt for the LLM
    let prompt = FORUM_REPLY_TEMPLATE
      .replace("{originalPost}", originalPost)
      .replace("{topic}", sovDirective)
      .replace("{preferences}", JSON.stringify(preferences, null, 2))
      .replace("{issuesMatrix}", JSON.stringify(issuesMatrix, null, 2));
      
    // Add topic context if provided
    prompt = prompt.replace(
      "{topicContextPlaceholder}", 
      topicContext ? `CONTEXT: ${topicContext}\n` : ''
    );

    // Call the LLM with the prompt and system instruction
    const contextMessages: Message[] = [
      { role: "system", content: FORUM_POST_SYSTEM_INSTRUCTION }
    ];
    
    const response = await callOpenRouterLLM({
      prompt,
      contextMessages,
      temperature: 0.7,
      maxTokens: 1000, // Adequate tokens for a reply
    });

    // Parse the LLM response as JSON to extract structured content
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in LLM response");
      }
      
      const replyContent = JSON.parse(jsonMatch[0]) as DiscoursePostContent;
      
      // Validate the reply content
      if (!replyContent.body) {
        throw new Error("LLM response missing required 'body' field");
      }
      
      return replyContent;
    } catch (parseError: any) {
      logger.error(`Failed to parse LLM response into reply content: ${parseError.message}`);
      
      // Fall back to returning the raw response as the body if parsing fails
      return {
        body: response
      };
    }
  } catch (error: any) {
    logger.error(`Error generating Discourse reply content: ${error.message}`);
    throw error;
  }
}

/**
 * Process and analyze Discourse forum content based on an agent's preferences
 *
 * @param agentId The ID of the agent analyzing the content
 * @param forumText The raw Markdown text from a Discourse topic/post
 * @param sourceTopicUrl Optional URL to the original Discourse topic
 * @returns Structured analysis with summary and action proposals
 */
export async function processDiscourseContent(
  agentId: string,
  forumText: string,
  sourceTopicUrl?: string
): Promise<string> {
  try {
    // Fetch the agent's data including preferences
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Extract the agent's preferences, particularly the issues matrix
    const preferences = agent.preferences as any;
    const issuesMatrix = preferences.issuesMatrix || [];
    
    // Prepare the prompt for the LLM
    let prompt = FORUM_CONTENT_PROCESSING_TEMPLATE
      .replace("{forumContent}", forumText)
      .replace("{preferences}", JSON.stringify(preferences, null, 2))
      .replace("{issuesMatrix}", JSON.stringify(issuesMatrix, null, 2));
      
    // Add source URL if provided
    prompt = prompt.replace(
      "{sourceTopicUrlPlaceholder}",
      sourceTopicUrl ? `SOURCE URL: ${sourceTopicUrl}\n` : ''
    );

    // Call the LLM with the prompt and system instruction
    const contextMessages: Message[] = [
      { role: "system", content: FORUM_CONTENT_PROCESSING_SYSTEM_INSTRUCTION }
    ];
    
    const response = await callOpenRouterLLM({
      prompt,
      contextMessages,
      temperature: 0.4, // Lower temperature for more consistent analysis
      maxTokens: 1500, // Enough tokens for detailed analysis
    });

    // Attempt to parse the JSON response, but return the raw response if parsing fails
    try {
      // Validate that the response contains JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Parse and validate the JSON structure
        const analysisContent = JSON.parse(jsonMatch[0]);
        
        // Basic validation of required fields
        if (!analysisContent.summary || !analysisContent.keyTopics ||
            !analysisContent.relevanceScore || !analysisContent.actionItems) {
          logger.warn(`Forum content analysis missing required fields: ${JSON.stringify(analysisContent)}`);
        }
        
        // Return the structured JSON response
        return response;
      } else {
        logger.warn("LLM response doesn't contain valid JSON for forum content analysis");
        return response;
      }
    } catch (parseError: any) {
      logger.error(`Failed to parse LLM response for forum content analysis: ${parseError.message}`);
      return response; // Return the raw response even if parsing fails
    }
  } catch (error: any) {
    logger.error(`Error processing Discourse content: ${error.message}`);
    throw error;
  }
}

/**
 * Posts content to Discourse forum using the Discourse API service
 * 
 * @param agentId The ID of the agent posting the content
 * @param sovDirective The directive from the sovereign to inform the post content
 * @param topicContext Optional additional context about the topic
 * @returns Result of the Discourse posting operation with success status and post URL or error
 */
export async function postContentToDiscourse(
  agentId: string, 
  sovDirective: string, 
  topicContext?: string
): Promise<{success: boolean, postUrlOrId?: string, error?: string}> {
  try {
    // Get Discourse API credentials
    const discourseApiKey = process.env.DISCOURSE_API_KEY;
    const discourseUsername = process.env.DISCOURSE_API_USERNAME;
    
    if (!discourseApiKey || !discourseUsername) {
      logger.error('Discourse API credentials not configured');
      return {
        success: false,
        error: 'Discourse API credentials not configured'
      };
    }
    
    // Generate post content using the existing service
    const postContent = await generateDiscoursePostContent(agentId, sovDirective, topicContext);
    
    if (!postContent.title) {
      return {
        success: false,
        error: 'Generated post content missing title'
      };
    }
    
    // Post to Discourse using the API service
    const result = await discourseApiService.postToDiscourse(
      discourseApiKey,
      discourseUsername,
      postContent.title,
      postContent.body,
      postContent.categoryId
    );
    
    // Log the posting activity
    await prisma.auditLog.create({
      data: {
        userId: (await prisma.agent.findUnique({ where: { id: agentId } }))?.userId || 'unknown',
        action: 'DISCOURSE_POST_CREATED',
        targetId: agentId,
        details: JSON.stringify({
          agentId,
          directive: sovDirective,
          success: result.success,
          postUrl: result.postUrlOrId
        })
      }
    });
    
    return result;
  } catch (error: any) {
    logger.error(`Error posting to Discourse: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Reads content from Discourse forum using the Discourse API service
 * 
 * @param agentId The ID of the agent reading the content
 * @param categoryId Optional category ID to read from
 * @param topicId Optional topic ID to read from
 * @param lastReadPostNumber Optional last post number read to only get newer posts
 * @returns Result of the Discourse reading operation with success status and content or error
 */
export async function readContentFromDiscourse(
  agentId: string,
  categoryId?: number,
  topicId?: number,
  lastReadPostNumber?: number
): Promise<{
  success: boolean,
  contents?: Array<{postId: number, username: string, content: string, createdAt: string}>,
  error?: string
}> {
  try {
    // Get Discourse API credentials
    const discourseApiKey = process.env.DISCOURSE_API_KEY;
    const discourseUsername = process.env.DISCOURSE_API_USERNAME;
    
    if (!discourseApiKey || !discourseUsername) {
      logger.error('Discourse API credentials not configured');
      return {
        success: false,
        error: 'Discourse API credentials not configured'
      };
    }
    
    // Read from Discourse using the API service
    const result = await discourseApiService.readFromDiscourse(
      discourseApiKey,
      discourseUsername,
      categoryId,
      topicId,
      lastReadPostNumber
    );
    
    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }
    
    // Format the posts for the response
    const formattedContents = result.posts?.map(post => ({
      postId: post.postId,
      username: post.username,
      content: post.rawContent,
      createdAt: post.createdAt
    })) || [];
    
    // Log the reading activity
    await prisma.auditLog.create({
      data: {
        userId: (await prisma.agent.findUnique({ where: { id: agentId } }))?.userId || 'unknown',
        action: 'DISCOURSE_CONTENT_READ',
        targetId: agentId,
        details: JSON.stringify({
          agentId,
          categoryId,
          topicId,
          postCount: formattedContents.length
        })
      }
    });
    
    return {
      success: true,
      contents: formattedContents
    };
  } catch (error: any) {
    logger.error(`Error reading from Discourse: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets the monitored Discourse topics for an agent
 * 
 * @param agentId The ID of the agent
 * @returns The agent's monitored topic configuration
 */
export async function getMonitoredDiscourseTopics(
  agentId: string
): Promise<MonitoredDiscourseTopics> {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // The monitoredDiscourseTopics field might not be in the type definition yet
    // Get it from the raw database query with a direct SQL query
    const result = await prisma.$queryRaw`
      SELECT "monitoredDiscourseTopics" FROM "Agent" WHERE id = ${agentId}
    `;
    
    const rawMonitoredTopics = Array.isArray(result) && result.length > 0 
      ? (result[0] as any).monitoredDiscourseTopics 
      : null;
    
    // Parse and return the monitored topics
    let monitoredTopics: MonitoredDiscourseTopics;
    
    if (rawMonitoredTopics) {
      monitoredTopics = typeof rawMonitoredTopics === 'object' 
        ? rawMonitoredTopics as MonitoredDiscourseTopics
        : JSON.parse(rawMonitoredTopics as string);
    } else {
      monitoredTopics = { categoryIds: [], topicIds: [] };
    }
    
    return monitoredTopics;
  } catch (error: any) {
    logger.error(`Error getting monitored Discourse topics: ${error.message}`);
    return { categoryIds: [], topicIds: [] };
  }
}

/**
 * Adds a topic or category to an agent's monitored list
 * 
 * @param agentId The ID of the agent
 * @param topicId Optional topic ID to monitor
 * @param categoryId Optional category ID to monitor
 * @returns Success status and updated monitored topics
 */
export async function addMonitoredDiscourseTopic(
  agentId: string,
  topicId?: number,
  categoryId?: number
): Promise<{success: boolean, monitoredTopics?: MonitoredDiscourseTopics, error?: string}> {
  try {
    if (!topicId && !categoryId) {
      return {
        success: false,
        error: 'Either topicId or categoryId must be provided'
      };
    }
    
    // Get current monitored topics
    const currentMonitoredTopics = await getMonitoredDiscourseTopics(agentId);
    
    // Add the new topic/category if not already monitored
    let updated = false;
    
    if (topicId && !currentMonitoredTopics.topicIds.includes(topicId)) {
      currentMonitoredTopics.topicIds.push(topicId);
      updated = true;
    }
    
    if (categoryId && !currentMonitoredTopics.categoryIds.includes(categoryId)) {
      currentMonitoredTopics.categoryIds.push(categoryId);
      updated = true;
    }
    
    if (!updated) {
      return {
        success: true,
        monitoredTopics: currentMonitoredTopics
      };
    }
    
    // Update using raw SQL since Prisma types may not be up to date
    await prisma.$executeRaw`
      UPDATE "Agent"
      SET "monitoredDiscourseTopics" = ${JSON.stringify(currentMonitoredTopics)}::jsonb
      WHERE id = ${agentId}
    `;
    
    return {
      success: true,
      monitoredTopics: currentMonitoredTopics
    };
  } catch (error: any) {
    logger.error(`Error adding monitored Discourse topic: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Removes a topic or category from an agent's monitored list
 * 
 * @param agentId The ID of the agent
 * @param topicId Optional topic ID to stop monitoring
 * @param categoryId Optional category ID to stop monitoring
 * @returns Success status and updated monitored topics
 */
export async function removeMonitoredDiscourseTopic(
  agentId: string,
  topicId?: number,
  categoryId?: number
): Promise<{success: boolean, monitoredTopics?: MonitoredDiscourseTopics, error?: string}> {
  try {
    if (!topicId && !categoryId) {
      return {
        success: false,
        error: 'Either topicId or categoryId must be provided'
      };
    }
    
    // Get current monitored topics
    const currentMonitoredTopics = await getMonitoredDiscourseTopics(agentId);
    
    // Remove the topic/category
    if (topicId) {
      currentMonitoredTopics.topicIds = currentMonitoredTopics.topicIds.filter(id => id !== topicId);
    }
    
    if (categoryId) {
      currentMonitoredTopics.categoryIds = currentMonitoredTopics.categoryIds.filter(id => id !== categoryId);
    }
    
    // Update using raw SQL since Prisma types may not be up to date
    await prisma.$executeRaw`
      UPDATE "Agent"
      SET "monitoredDiscourseTopics" = ${JSON.stringify(currentMonitoredTopics)}::jsonb
      WHERE id = ${agentId}
    `;
    
    return {
      success: true,
      monitoredTopics: currentMonitoredTopics
    };
  } catch (error: any) {
    logger.error(`Error removing monitored Discourse topic: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}
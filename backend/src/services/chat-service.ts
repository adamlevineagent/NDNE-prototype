/**
 * Chat Service
 * 
 * Handles chat message operations including storage, retrieval,
 * and conversation context management.
 */
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { HttpError } from '../utils/HttpError';

const prisma = new PrismaClient();

/**
 * Message structure for context management
 */
export interface ChatMessageContext {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

/**
 * Get conversation context for LLM processing
 * @param agentId Agent ID
 * @param userId User ID
 * @param limit Number of messages to include (default: 20)
 * @returns Array of messages in LLM-friendly format
 */
export async function getConversationContext(
  agentId: string,
  userId: string,
  limit: number = 20
): Promise<ChatMessageContext[]> {
  try {
    // Fetch recent messages using the type assertion workaround until migration is applied
    const messages = await (prisma as any).chatMessage.findMany({
      where: {
        agentId,
        userId
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    // Check if we found messages
    if (!messages || messages.length === 0) {
      return [];
    }

    // Define an interface for the message structure
    interface ChatMessageRecord {
      id: string;
      userId: string;
      agentId: string;
      content: string;
      sender: string;
      timestamp: Date;
      metadata?: any;
    }

    // Convert to LLM-friendly format and reverse to chronological order
    const context = messages
      .map((msg: ChatMessageRecord) => ({
        id: msg.id,
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      }))
      .reverse();

    return context;
  } catch (error) {
    logger.error('Error fetching conversation context:', error);
    throw new HttpError('Failed to retrieve conversation history', 500);
  }
}

/**
 * Save a chat message to the database
 * @param userId User ID
 * @param agentId Agent ID
 * @param content Message content
 * @param sender 'user' or 'agent'
 * @param metadata Optional metadata
 * @returns Created message
 */
export async function saveMessage(
  userId: string,
  agentId: string,
  content: string,
  sender: 'user' | 'agent',
  metadata: any = {}
): Promise<any> {
  try {
    // Type assertion workaround until migration is applied
    const message = await (prisma as any).chatMessage.create({
      data: {
        userId,
        agentId,
        content,
        sender,
        metadata,
        timestamp: new Date()
      }
    });

    // Update agent's lastInteraction timestamp
    await (prisma as any).agent.update({
      where: { id: agentId },
      data: { lastInteraction: new Date() }
    });

    return message;
  } catch (error) {
    logger.error('Error saving chat message:', error);
    throw new HttpError('Failed to save message', 500);
  }
}

/**
 * Get paginated chat history
 * @param agentId Agent ID
 * @param userId User ID
 * @param options Pagination options
 * @returns Paginated messages and cursor info
 */
export async function getChatHistory(
  agentId: string,
  userId: string,
  options: {
    limit?: number;
    before?: string;
    onboarding?: boolean;
  } = {}
): Promise<{
  messages: any[];
  hasMore: boolean;
  nextCursor?: string;
}> {
  const { limit = 50, before, onboarding } = options;

  try {
    // Build query conditions
    const whereClause: any = {
      userId,
      agentId
    };

    // Add timestamp condition if 'before' is provided
    if (before) {
      whereClause.timestamp = {
        lt: new Date(before)
      };
    }

    // Type assertion workaround until migration is applied
    const messages = await (prisma as any).chatMessage.findMany({
      where: whereClause,
      orderBy: {
        timestamp: 'desc'
      },
      take: Number(limit) + 1 // Fetch one extra to check if there are more
    });

    const hasMore = messages.length > limit;
    const nextCursor = hasMore && messages[limit - 1] 
      ? messages[limit - 1].timestamp.toISOString() 
      : undefined;

    // Return all but the extra message if we fetched more than the limit
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;

    return {
      messages: messagesToReturn,
      hasMore,
      nextCursor
    };
  } catch (error) {
    logger.error('Error fetching chat history:', error);
    throw new HttpError('Failed to retrieve chat history', 500);
  }
}

/**
 * Summarize a conversation when context gets too large
 * @param messages Messages to summarize
 * @returns Conversation summary
 */
export async function summarizeConversation(
  messages: ChatMessageContext[]
): Promise<string> {
  try {
    // This is a placeholder - in the actual implementation,
    // this would use an LLM to generate a summary
    logger.info(`Summarizing ${messages.length} messages`);
    
    return `This conversation contains ${messages.length} messages between the user and their agent.`;
  } catch (error) {
    logger.error('Error summarizing conversation:', error);
    throw new HttpError('Failed to summarize conversation', 500);
  }
}

/**
 * Delete a specific message
 * @param messageId Message ID to delete
 * @param userId User ID for authorization check
 * @returns Success status
 */
export async function deleteMessage(
  messageId: string,
  userId: string
): Promise<boolean> {
  try {
    // First check if the message belongs to the user
    const message = await (prisma as any).chatMessage.findFirst({
      where: {
        id: messageId,
        userId
      }
    });

    if (!message) {
      throw new HttpError('Message not found or does not belong to user', 404);
    }

    // Delete the message
    await (prisma as any).chatMessage.delete({
      where: {
        id: messageId
      }
    });

    return true;
  } catch (error) {
    logger.error('Error deleting message:', error);
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError('Failed to delete message', 500);
  }
}

export default {
  getConversationContext,
  saveMessage,
  getChatHistory,
  summarizeConversation,
  deleteMessage
};
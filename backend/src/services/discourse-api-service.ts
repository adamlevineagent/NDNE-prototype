/**
 * Service for interacting with the Discourse API
 * 
 * This service handles all interactions with the Discourse forum API, including
 * posting new topics, replying to topics, and reading content from the forum.
 */

import axios, { AxiosResponse, AxiosError } from 'axios';
import logger from '../utils/logger';

/**
 * Interface for response from posting to Discourse
 */
interface DiscoursePostResponse {
  success: boolean;
  postUrlOrId?: string;
  error?: string;
}

/**
 * Interface for a Discourse post
 */
interface DiscoursePost {
  postId: number;
  postNumber: number;
  username: string;
  rawContent: string;
  createdAt: string;
}

/**
 * Interface for response from reading from Discourse
 */
interface DiscourseReadResponse {
  success: boolean;
  posts?: DiscoursePost[];
  error?: string;
}

/**
 * Service for interacting with the Discourse API
 */
export class DiscourseApiService {
  /**
   * Posts content to the Discourse forum
   * 
   * @param apiKey API key for authentication
   * @param apiUsername Username to post as
   * @param title Title for the post (required for new topics)
   * @param rawMarkdownContent Content in Markdown format
   * @param categoryId Optional category ID for new topics
   * @param topicId Optional topic ID for replies
   * @returns Promise with result of the post operation
   */
  async postToDiscourse(
    apiKey: string,
    apiUsername: string,
    title: string,
    rawMarkdownContent: string,
    categoryId?: number,
    topicId?: number
  ): Promise<DiscoursePostResponse> {
    const apiUrl = process.env.DISCOURSE_URL;
    
    if (!apiUrl) {
      logger.error('Discourse URL not configured');
      return {
        success: false,
        error: 'Discourse API URL not configured'
      };
    }
    
    // Build the request payload
    const payload: Record<string, any> = {
      api_key: apiKey,
      api_username: apiUsername,
      raw: rawMarkdownContent
    };
    
    // If topicId is provided, this is a reply
    if (topicId) {
      payload.topic_id = topicId;
    } else {
      // This is a new topic
      if (!title) {
        return {
          success: false,
          error: 'Title is required for new topics'
        };
      }
      payload.title = title;
      
      if (categoryId) {
        payload.category = categoryId;
      }
    }
    
    return this.withRetry(async () => {
      try {
        const response: AxiosResponse = await axios.post(
          `${apiUrl}/posts.json`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.status >= 200 && response.status < 300) {
          // Successfully posted
          const postId = response.data.id;
          const topicSlug = response.data.topic_slug;
          const responseTopicId = response.data.topic_id;
          const postNumber = response.data.post_number;
          
          // Construct post URL
          const postUrl = topicId 
            ? `${apiUrl}/t/${responseTopicId}/${postNumber}`
            : `${apiUrl}/t/${topicSlug}/${responseTopicId}/${postNumber}`;
          
          return {
            success: true,
            postUrlOrId: postUrl
          };
        } else {
          logger.error('Unexpected response status from Discourse API', {
            status: response.status,
            data: response.data
          });
          
          return {
            success: false,
            error: `Unexpected response: ${response.status}`
          };
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        logger.error('Error posting to Discourse', {
          error: axiosError.message,
          status: axiosError.response?.status,
          data: axiosError.response?.data
        });
        
        return {
          success: false,
          error: axiosError.response?.data 
            ? JSON.stringify(axiosError.response.data)
            : axiosError.message
        };
      }
    });
  }
  
  /**
   * Reads posts from the Discourse forum
   * 
   * @param apiKey API key for authentication
   * @param apiUsername Username to authenticate as
   * @param categoryId Optional category ID to read from
   * @param topicId Optional topic ID to read from
   * @param lastReadPostNumber Optional last post number read (to only get newer posts)
   * @returns Promise with result of the read operation
   */
  async readFromDiscourse(
    apiKey: string,
    apiUsername: string,
    categoryId?: number,
    topicId?: number,
    lastReadPostNumber?: number
  ): Promise<DiscourseReadResponse> {
    const apiUrl = process.env.DISCOURSE_URL;
    
    if (!apiUrl) {
      logger.error('Discourse URL not configured');
      return {
        success: false,
        error: 'Discourse API URL not configured'
      };
    }
    
    // Must specify either categoryId or topicId
    if (!categoryId && !topicId) {
      return {
        success: false,
        error: 'Either categoryId or topicId must be specified'
      };
    }
    
    return this.withRetry(async () => {
      try {
        const params = {
          api_key: apiKey,
          api_username: apiUsername
        };
        
        let apiEndpoint: string;
        
        if (topicId) {
          // Reading from a specific topic
          apiEndpoint = `${apiUrl}/t/${topicId}.json`;
        } else {
          // Reading from a category
          apiEndpoint = `${apiUrl}/c/${categoryId}.json`;
        }
        
        const response = await axios.get(apiEndpoint, { params });
        
        if (response.status >= 200 && response.status < 300) {
          if (topicId) {
            // Processing topic response
            const posts = response.data.post_stream.posts;
            
            // Filter posts based on lastReadPostNumber if provided
            const filteredPosts = lastReadPostNumber 
              ? posts.filter((post: any) => post.post_number > lastReadPostNumber)
              : posts;
            
            // Map to our interface
            const formattedPosts: DiscoursePost[] = filteredPosts.map((post: any) => ({
              postId: post.id,
              postNumber: post.post_number,
              username: post.username,
              rawContent: post.raw,
              createdAt: post.created_at
            }));
            
            return {
              success: true,
              posts: formattedPosts
            };
          } else {
            // Processing category response - return topics
            // For a categoryId query, we return the topics as "posts" for consistency
            const topics = response.data.topic_list.topics;
            
            // Map topics to a post-like format
            const formattedPosts: DiscoursePost[] = topics.map((topic: any) => ({
              postId: topic.id,
              postNumber: 1, // First post in topic
              username: topic.posters?.[0]?.user?.username || 'unknown',
              rawContent: topic.title, // Only title is available at category level
              createdAt: topic.created_at
            }));
            
            return {
              success: true,
              posts: formattedPosts
            };
          }
        } else {
          logger.error('Unexpected response status from Discourse API', {
            status: response.status,
            data: response.data
          });
          
          return {
            success: false,
            error: `Unexpected response: ${response.status}`
          };
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        logger.error('Error reading from Discourse', {
          error: axiosError.message,
          status: axiosError.response?.status,
          data: axiosError.response?.data
        });
        
        return {
          success: false,
          error: axiosError.response?.data 
            ? JSON.stringify(axiosError.response.data)
            : axiosError.message
        };
      }
    });
  }
  
  /**
   * Implements exponential backoff for handling rate limits
   * 
   * @param apiCall Function that makes the API call
   * @param maxRetries Maximum number of retries
   * @param initialDelay Initial delay in milliseconds
   * @returns Result of the API call
   */
  private async withRetry<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 5,
    initialDelay: number = 1000
  ): Promise<T> {
    let retries = 0;
    let delay = initialDelay;
    
    while (true) {
      try {
        return await apiCall();
      } catch (error) {
        const axiosError = error as AxiosError;
        
        // Check if this is a rate limiting error (HTTP 429)
        if (axiosError.response?.status === 429 && retries < maxRetries) {
          retries++;
          
          // Calculate delay with exponential backoff
          delay = initialDelay * Math.pow(2, retries);
          
          logger.warn(`Rate limited by Discourse API. Retrying in ${delay}ms (Attempt ${retries}/${maxRetries})`);
          
          // Wait for the delay period
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Continue to retry
          continue;
        }
        
        // If it's not a rate limit error or we've exhausted retries, rethrow
        throw error;
      }
    }
  }
}

// Export a singleton instance of the service
export default new DiscourseApiService();
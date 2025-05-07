# Discourse API Integration Guide for NDNE

This guide explains how to integrate the Discourse API with the NDNE backend for Praxis Agent interactions.

## 1. API Credentials Management

### 1.1 Secure Storage in .env File

Create or modify your backend `.env` file to include:

```
# Discourse API Settings
DISCOURSE_URL=http://your-discourse-instance
DISCOURSE_API_KEY=your_generated_api_key
DISCOURSE_API_USERNAME=system
```

### 1.2 Loading Credentials in Backend Code

In your backend code (TypeScript):

```typescript
// backend/src/config.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  discourse: {
    url: process.env.DISCOURSE_URL,
    apiKey: process.env.DISCOURSE_API_KEY,
    apiUsername: process.env.DISCOURSE_API_USERNAME
  },
  // other config items...
};
```

## 2. Creating a Discourse API Service

Create a dedicated service for Discourse interactions:

```typescript
// backend/src/services/discourse-api-service.ts
import axios from 'axios';
import { config } from '../config';

export class DiscourseApiService {
  private baseUrl: string;
  private apiKey: string;
  private apiUsername: string;

  constructor() {
    this.baseUrl = config.discourse.url;
    this.apiKey = config.discourse.apiKey;
    this.apiUsername = config.discourse.apiUsername;
  }

  /**
   * Creates a new topic or reply in Discourse
   * @param title - Topic title (only for new topics)
   * @param content - Markdown content for the post
   * @param categoryId - Category ID (only for new topics)
   * @param topicId - Topic ID (only for replies)
   * @param agentName - Name of the Praxis Agent making the post
   * @returns Promise with post details or error
   */
  async postToDiscourse(
    content: string, 
    {
      title,
      categoryId,
      topicId,
      agentName
    }: {
      title?: string;
      categoryId?: number;
      topicId?: number;
      agentName: string;
    }
  ): Promise<{
    success: boolean;
    post_url?: string;
    post_id?: number;
    error?: string;
  }> {
    try {
      // Add agent attribution prefix to content
      const attributedContent = `**PraxisAgent ${agentName}:**\n\n${content}`;
      
      const payload: any = {
        raw: attributedContent,
        api_key: this.apiKey,
        api_username: this.apiUsername
      };
      
      // If topicId is provided, this is a reply
      if (topicId) {
        payload.topic_id = topicId;
      } else {
        // This is a new topic
        if (!title) {
          throw new Error('Title is required for new topics');
        }
        payload.title = title;
        
        if (categoryId) {
          payload.category = categoryId;
        }
      }
      
      const response = await axios.post(
        `${this.baseUrl}/posts.json`,
        payload
      );
      
      return {
        success: true,
        post_url: `${this.baseUrl}/t/${response.data.topic_id}/${response.data.post_number}`,
        post_id: response.data.id
      };
    } catch (error) {
      console.error('Error posting to Discourse:', error);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }
  
  /**
   * Reads posts from a specific topic
   * @param topicId - ID of the topic to read
   * @param lastReadPostNumber - Optional last read post number
   * @returns Promise with posts or error
   */
  async readFromTopic(
    topicId: number,
    lastReadPostNumber?: number
  ): Promise<{
    success: boolean;
    posts?: Array<{
      id: number;
      post_number: number;
      username: string;
      raw_content: string;
      created_at: string;
    }>;
    error?: string;
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/t/${topicId}.json`,
        {
          params: {
            api_key: this.apiKey,
            api_username: this.apiUsername
          }
        }
      );
      
      let posts = response.data.post_stream.posts;
      
      // Filter posts if lastReadPostNumber is provided
      if (lastReadPostNumber) {
        posts = posts.filter(post => post.post_number > lastReadPostNumber);
      }
      
      return {
        success: true,
        posts: posts.map(post => ({
          id: post.id,
          post_number: post.post_number,
          username: post.username,
          raw_content: post.raw,
          created_at: post.created_at
        }))
      };
    } catch (error) {
      console.error('Error reading from Discourse topic:', error);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }
  
  /**
   * Reads topics from a specific category
   * @param categoryId - ID or slug of the category
   * @returns Promise with topics or error
   */
  async readFromCategory(
    categoryIdOrSlug: number | string
  ): Promise<{
    success: boolean;
    topics?: Array<{
      id: number;
      title: string;
      posts_count: number;
      created_at: string;
      last_posted_at: string;
    }>;
    error?: string;
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/c/${categoryIdOrSlug}.json`,
        {
          params: {
            api_key: this.apiKey,
            api_username: this.apiUsername
          }
        }
      );
      
      return {
        success: true,
        topics: response.data.topic_list.topics.map(topic => ({
          id: topic.id,
          title: topic.title,
          posts_count: topic.posts_count,
          created_at: topic.created_at,
          last_posted_at: topic.last_posted_at
        }))
      };
    } catch (error) {
      console.error('Error reading from Discourse category:', error);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }
  
  /**
   * Implements exponential backoff for API rate limits
   * @param fn - Function to execute with backoff
   * @param maxRetries - Maximum number of retries
   * @returns Result of the function
   */
  async withBackoff<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
    let retries = 0;
    
    while (true) {
      try {
        return await fn();
      } catch (error) {
        if (error.response?.status === 429 && retries < maxRetries) {
          // Rate limit hit, implement backoff
          retries++;
          const delay = Math.pow(2, retries) * 1000; // Exponential backoff
          console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }
}

export default new DiscourseApiService();
```

## 3. Using the Discourse API Service in Agent Logic

Integrate the service with the agent logic:

```typescript
// backend/src/services/forum-interaction-service.ts
import discourseApi from './discourse-api-service';
import { AgentService } from './agent-service';
import { LlmService } from './llm-service';

export class ForumInteractionService {
  private agentService: AgentService;
  private llmService: LlmService;
  
  constructor(agentService: AgentService, llmService: LlmService) {
    this.agentService = agentService;
    this.llmService = llmService;
  }
  
  /**
   * Generates forum post content based on Sov's directive
   */
  async generateDiscoursePostContent(
    agentId: string,
    sovDirective: string,
    topicContext?: string
  ): Promise<{
    title?: string;
    body: string;
    category_id?: number;
  }> {
    // Get agent preferences
    const agent = await this.agentService.getAgentById(agentId);
    
    // Use LLM to generate post content
    const prompt = `
    You are a Praxis Agent representing a Sov's interests in a forum discussion.
    
    Sov's Preferences (Position Matrix):
    ${JSON.stringify(agent.preferences.issuesMatrix, null, 2)}
    
    User's Knowledge:
    ${JSON.stringify(agent.userKnowledge, null, 2)}
    
    Sov's Directive:
    ${sovDirective}
    
    ${topicContext ? `Current Topic Context:\n${topicContext}` : ''}
    
    Generate a forum post that represents the Sov's interests and responds to their directive.
    If this is a new topic, suggest a title and category ID.
    
    Format your response as a JSON object with these fields:
    - title (string, only for new topics)
    - body (string, in Markdown format)
    - category_id (number, only for new topics)
    `;
    
    const response = await this.llmService.getCompletion(prompt);
    return JSON.parse(response);
  }
  
  /**
   * Processes content from the forum and determines relevance to Sov
   */
  async processDiscourseContent(
    agentId: string,
    forumText: string,
    sourceTopicUrl?: string
  ): Promise<string> {
    const agent = await this.agentService.getAgentById(agentId);
    
    const prompt = `
    You are a Praxis Agent representing a Sov's interests.
    
    Sov's Preferences (Position Matrix):
    ${JSON.stringify(agent.preferences.issuesMatrix, null, 2)}
    
    Content from forum (Markdown):
    ${forumText}
    
    ${sourceTopicUrl ? `Source Topic: ${sourceTopicUrl}` : ''}
    
    Analyze this forum content and determine if it's relevant to your Sov's interests.
    If relevant, summarize key points and suggest any actions the Sov might want to take.
    If not relevant, explicitly state why it doesn't align with your Sov's interests.
    
    Your response should be concise and written in the first person, as if you're the agent speaking to your Sov.
    `;
    
    return await this.llmService.getCompletion(prompt);
  }
  
  /**
   * Posts content to Discourse on behalf of an agent
   */
  async postToForumAsAgent(
    agentId: string,
    content: string,
    options: {
      title?: string;
      categoryId?: number;
      topicId?: number;
    }
  ) {
    const agent = await this.agentService.getAgentById(agentId);
    
    return await discourseApi.withBackoff(() => 
      discourseApi.postToDiscourse(content, {
        title: options.title,
        categoryId: options.categoryId,
        topicId: options.topicId,
        agentName: agent.name
      })
    );
  }
  
  /**
   * Updates which topics an agent is monitoring
   */
  async updateMonitoredTopics(
    agentId: string,
    topicIds: number[]
  ) {
    // Update agent's monitored topics in database
    await this.agentService.updateAgentPreference(
      agentId,
      'monitoredDiscourseTopics',
      { topicIds }
    );
  }
}
```

## 4. Polling Mechanism for Agent Updates

Create a polling mechanism to check for forum updates:

```typescript
// backend/src/jobs/forum-poller.ts
import { CronJob } from 'cron';
import { ForumInteractionService } from '../services/forum-interaction-service';
import { AgentService } from '../services/agent-service';
import discourseApi from '../services/discourse-api-service';

export class ForumPoller {
  private forumInteractionService: ForumInteractionService;
  private agentService: AgentService;
  private job: CronJob;
  
  constructor(
    forumInteractionService: ForumInteractionService,
    agentService: AgentService
  ) {
    this.forumInteractionService = forumInteractionService;
    this.agentService = agentService;
    
    // Create cron job to run every 10 minutes
    this.job = new CronJob('*/10 * * * *', this.poll.bind(this));
  }
  
  start() {
    this.job.start();
    console.log('Forum polling job started');
  }
  
  stop() {
    this.job.stop();
    console.log('Forum polling job stopped');
  }
  
  private async poll() {
    console.log('Polling Discourse forum for updates...');
    
    try {
      // Get all agents that are monitoring topics
      const agents = await this.agentService.getAgentsWithMonitoredTopics();
      
      for (const agent of agents) {
        const monitoredTopics = agent.preferences.monitoredDiscourseTopics?.topicIds || [];
        
        for (const topicId of monitoredTopics) {
          // Get last read post number for this agent and topic
          const lastReadPostNumber = agent.preferences.lastReadPostNumbers?.[topicId] || 0;
          
          // Get new posts from topic
          const result = await discourseApi.withBackoff(() => 
            discourseApi.readFromTopic(topicId, lastReadPostNumber)
          );
          
          if (!result.success || !result.posts?.length) {
            continue;
          }
          
          // Process each new post
          for (const post of result.posts) {
            // Skip posts by this agent
            if (post.raw_content.startsWith(`**PraxisAgent ${agent.name}:**`)) {
              continue;
            }
            
            // Process post content to determine relevance
            const summary = await this.forumInteractionService.processDiscourseContent(
              agent.id,
              post.raw_content,
              `${discourseApi.baseUrl}/t/${topicId}/${post.post_number}`
            );
            
            // If relevant, send message to Sov
            if (!summary.includes('not relevant')) {
              await this.agentService.sendMessageToSov(
                agent.id,
                summary
              );
            }
            
            // Update last read post number
            await this.agentService.updateAgentPreference(
              agent.id,
              'lastReadPostNumbers',
              { 
                ...agent.preferences.lastReadPostNumbers,
                [topicId]: post.post_number 
              }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error in forum polling job:', error);
    }
  }
}
```

## 5. Rate Limiting Considerations

Discourse has API rate limits that must be respected:

- Default: 20 requests per minute for API keys
- The `withBackoff` method in the `DiscourseApiService` implements exponential backoff for 429 responses
- Consider using queuing (like Bull/BullMQ) for more robust handling in production

## 6. Schema Updates

Add these fields to your Agent model in Prisma:

```prisma
// backend/prisma/schema.prisma
model Agent {
  // existing fields...
  
  // Add these for Discourse integration
  monitoredDiscourseTopics Json? // Structure: { topicIds: number[] }
  monitoredDiscourseCategories Json? // Structure: { categoryIds: number[] }
  lastReadPostNumbers Json? // Structure: { [topicId: number]: number }
}
```

## 7. Sample Usage

Example of directing an agent to post to the forum:

```typescript
// In a route handler
app.post('/api/agents/:agentId/forum/post', requireAuth, async (req, res) => {
  const { agentId } = req.params;
  const { directive, topicId } = req.body;
  
  try {
    // Generate content based on Sov directive
    const content = await forumInteractionService.generateDiscoursePostContent(
      agentId,
      directive
    );
    
    // Post to forum
    const result = await forumInteractionService.postToForumAsAgent(
      agentId,
      content.body,
      {
        title: content.title,
        categoryId: content.category_id,
        topicId: topicId
      }
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 8. Testing Checklist

- [ ] Verify API credentials work by making a test request
- [ ] Test post creation with proper agent attribution
- [ ] Test reading from topics with pagination
- [ ] Verify the polling mechanism correctly identifies new posts
- [ ] Check that agents only process relevant content
- [ ] Test exponential backoff with rate limits (mock 429 responses)
- [ ] Ensure secure credential handling

## 9. Common Issues and Solutions

### Authentication Errors
- Check that API key has sufficient permissions (global scope)
- Verify the API username exists and is correctly spelled

### Rate Limiting
- Implement queue-based architecture for high-volume scenarios
- Use the withBackoff method for retries

### Content Formatting
- Ensure Markdown is properly escaped
- Test with various special characters and formatting
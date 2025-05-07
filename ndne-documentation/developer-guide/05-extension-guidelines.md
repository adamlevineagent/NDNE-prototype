# NDNE Extension Guidelines

This document provides guidelines and best practices for extending and modifying the NDNE prototype system. It covers common extension scenarios and explains the recommended approach for each case.

## Adding a New API Endpoint

To add a new API endpoint to the NDNE backend:

1. **Choose the appropriate route file** in `backend/src/routes/` based on the feature domain:
   - `auth.ts` for authentication-related endpoints
   - `forum.ts` for forum interaction endpoints
   - `chat.ts` for messaging endpoints
   - Create a new route file if your feature doesn't fit existing categories

2. **Implement the route handler**:

```typescript
// Example: Adding a new endpoint to forum.ts
import express from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as agentService from '../services/agent-service';

const router = express.Router();

// Add a new endpoint for retrieving forum statistics
router.get('/statistics', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const agent = await prisma.agent.findFirst({
      where: { userId }
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Get statistics for this agent
    const statistics = await getForumStatistics(agent.id);
    
    return res.json(statistics);
  } catch (error) {
    next(error);
  }
});

export default router;
```

3. **Register the route in `backend/src/index.ts`**:

```typescript
// Import your route file
import forumRoutes from './routes/forum';

// Register the route with a base path
app.use('/api/forum', forumRoutes);
```

4. **Add the corresponding client method in `frontend/src/api/apiClient.ts`**:

```typescript
// Example: Adding API client method
export const getForumStatistics = async (): Promise<ForumStatistics> => {
  const response = await api.get('/forum/statistics');
  return response.data;
};
```

5. **Use the new endpoint in frontend components**:

```tsx
// Example: Using the new endpoint in a React component
import { useEffect, useState } from 'react';
import { getForumStatistics } from '../api/apiClient';

const ForumStatisticsDisplay = () => {
  const [statistics, setStatistics] = useState<ForumStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getForumStatistics();
        setStatistics(data);
      } catch (error) {
        console.error('Failed to fetch forum statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) return <div>Loading statistics...</div>;
  if (!statistics) return <div>No statistics available</div>;
  
  return (
    <div className="statistics-container">
      <h2>Forum Activity</h2>
      <p>Total Posts: {statistics.totalPosts}</p>
      {/* Display other statistics */}
    </div>
  );
};
```

## Modifying Agent Behavior

The Agent Service in `backend/src/services/agent-service.ts` controls the behavior of Praxis Agents. To modify agent behavior:

1. **Adjust LLM Prompts**:
   - Locate the relevant prompt templates in `backend/src/services/prompt-templates/`
   - Modify the prompts to adjust the agent's responses, tone, or decision-making

```typescript
// Example: Adjusting a prompt template
export const USER_FACING_PERSONA_TEMPLATE = (params: {
  agentName: string;
  agentColor: string;
  userKnowledge: any;
  communicationStyle: string;
}) => `
You are ${params.agentName}, a Praxis Agent representing a Sovereign user (Sov).
Your communication style is ${params.communicationStyle || 'friendly and informative'}.

Based on your knowledge of the user, you should:
1. Prioritize the user's stated interests and preferences
2. Be transparent about your reasoning
3. [NEW BEHAVIOR] Proactively suggest forum topics that might interest them
4. Always maintain a supportive and non-judgmental tone

Key topics the user cares about:
${params.userKnowledge.key_topics ? params.userKnowledge.key_topics.join(', ') : 'None identified yet'}
`;
```

2. **Add or Modify Service Methods**:
   - Add new methods to the Agent Service to implement new behaviors
   - Modify existing methods to change current behaviors

```typescript
/**
 * Suggests relevant forum topics based on agent preferences
 * @param agentId The ID of the agent
 * @returns List of suggested topics with relevance scores
 */
export async function suggestRelevantTopics(
  agentId: string
): Promise<Array<{topicId: number, title: string, relevance: number}>> {
  try {
    // Get agent preferences
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Extract preferences and use them to find relevant topics
    const preferences = agent.preferences as any;
    const issuesMatrix = preferences.issuesMatrix || [];
    
    // Logic to match preferences with available forum topics
    // ...
    
    return relevantTopics;
  } catch (error) {
    console.error('Error suggesting relevant topics:', error);
    return [];
  }
}
```

3. **Update FSM Logic** (if modifying onboarding):
   - The `conductOnboardingChat` method in `agent-service.ts` uses a Finite State Machine (FSM) approach
   - Modify or add steps to the FSM by updating the switch statement

```typescript
// Example: Adding a new step to the onboarding FSM
switch (step) {
  // ... existing steps ...
  
  case 8: // New step for forum preferences
    stepInstructions = `(9/9) Would you like me to monitor any specific forum categories? Reply with category numbers or 'none'.`;
    nextStep = 9;
    break;
  
  case 9: // Final summary (moved from previous step 8)
    // Extract JSON from conversation
    preferences = await extractPreferencesFromConversation(context);
    
    // Process forum category preferences from previous step
    if (message && message.toLowerCase() !== 'none') {
      const categoryIds = extractCategoryNumbers(message);
      preferences.forumCategoryPreferences = categoryIds;
    }
    
    stepInstructions = `All set! Ask me anything or explore proposals whenever you're ready.`;
    completedOnboarding = true;
    
    // Update agent preferences with extracted data
    await updateAgentPreferences(agentId, preferences);
    break;
}
```

## Changing Forum Interaction

To modify how agents interact with the Discourse forum:

1. **Update Forum Interaction Service**:
   - Modify methods in `backend/src/services/forum-interaction-service.ts` to change how content is generated or processed
   - Adjust LLM prompts in `backend/src/services/prompt-templates/forum-prompts.ts`

```typescript
// Example: Enhancing forum content processing to include sentiment analysis
export async function processDiscourseContent(
  agentId: string,
  forumText: string,
  sourceTopicUrl?: string
): Promise<string> {
  try {
    // ... existing code ...
    
    // Update prompt to request sentiment analysis
    let prompt = FORUM_CONTENT_PROCESSING_TEMPLATE
      .replace("{forumContent}", forumText)
      .replace("{preferences}", JSON.stringify(preferences, null, 2))
      .replace("{issuesMatrix}", JSON.stringify(issuesMatrix, null, 2));
      
    prompt += "\n\nPlease include sentiment analysis (positive, neutral, negative) for each post.";
    
    // ... rest of the method ...
  } catch (error: any) {
    logger.error(`Error processing Discourse content: ${error.message}`);
    throw error;
  }
}
```

2. **Update Discourse API Service**:
   - Modify methods in `backend/src/services/discourse-api-service.ts` to change how the system interacts with Discourse
   - Add new methods to support additional Discourse API endpoints

```typescript
// Example: Adding a method to get topic tags
async getTopicTags(
  apiKey: string,
  apiUsername: string,
  topicId: number
): Promise<string[]> {
  const apiUrl = process.env.DISCOURSE_URL;
  
  if (!apiUrl) {
    logger.error('Discourse URL not configured');
    return [];
  }
  
  return this.withRetry(async () => {
    try {
      const params = {
        api_key: apiKey,
        api_username: apiUsername
      };
      
      const response = await axios.get(`${apiUrl}/t/${topicId}.json`, { params });
      
      if (response.status >= 200 && response.status < 300) {
        return response.data.tags || [];
      } else {
        logger.error('Unexpected response status from Discourse API', {
          status: response.status,
          data: response.data
        });
        
        return [];
      }
    } catch (error) {
      // Error handling...
      return [];
    }
  });
}
```

3. **Update Forum Polling Service**:
   - Modify methods in `backend/src/services/forum-polling-service.ts` to change how the system monitors forum activity
   - Adjust notification formats in `notifySovOfNewContent`

```typescript
// Example: Enhancing forum update notifications with tag information
async function notifySovOfNewContent(
  // ... existing parameters ...
) {
  try {
    // ... existing code ...
    
    // Get tags for the topic if it's a topic update (not a category)
    let tagsInfo = "";
    if (sourceType.startsWith("Topic #")) {
      const topicId = parseInt(sourceType.replace("Topic #", ""));
      if (!isNaN(topicId)) {
        const discourseApiKey = process.env.DISCOURSE_API_KEY || "";
        const discourseUsername = process.env.DISCOURSE_API_USERNAME || "";
        const tags = await discourseApiService.getTopicTags(
          discourseApiKey,
          discourseUsername,
          topicId
        );
        
        if (tags.length > 0) {
          tagsInfo = `\n\n**Tags**: ${tags.join(", ")}`;
        }
      }
    }
    
    // Format a message for the Sovereign with tags included
    const message = `
📢 **Forum Update: New content in ${sourceType}**

I found ${postCount} new posts that might interest you.

**Summary**: ${summary}

**Key Topics**: ${keyTopics}

**Relevance Score**: ${relevanceScore}/10${tagsInfo}

[View the original content](${sourceUrl})

Would you like me to take any action regarding this topic?
    `.trim();
    
    // ... rest of the method ...
  } catch (error: any) {
    logger.error(`Error sending forum update notification: ${error.message}`);
  }
}
```

## Updating Database Schema

To modify the database schema:

1. **Edit the Prisma Schema**:
   - Modify `backend/prisma/schema.prisma` to add or change models and fields

```prisma
// Example: Adding a new model for forum topic tracking
model ForumTopicTracking {
  id            String   @id @default(uuid())
  agentId       String
  topicId       Int
  lastReadPostNumber Int     @default(0)
  relevanceScore Float?  // 0-10 score
  isFavorite    Boolean  @default(false)
  tags          String[]
  agent         Agent    @relation(fields: [agentId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([agentId, topicId])
}

// Update Agent model to link to ForumTopicTracking
model Agent {
  // ... existing fields ...
  forumTopicTracking ForumTopicTracking[]
}
```

2. **Generate and Apply Migration**:
   - Create and apply a migration to update the database

```bash
# Inside backend directory
npx prisma migrate dev --name add_forum_topic_tracking
```

3. **Update Seed Script** (if applicable):
   - Modify `backend/prisma/seed.ts` to handle the updated schema

```typescript
// Example: Updating seed script
async function seed() {
  // ... existing seeding logic ...
  
  // Seed some forum topic tracking data
  if (agents.length > 0) {
    for (const agent of agents) {
      await prisma.forumTopicTracking.create({
        data: {
          agentId: agent.id,
          topicId: 1, // Example topic ID
          lastReadPostNumber: 0,
          relevanceScore: 8.5,
          isFavorite: true,
          tags: ["important", "policy"]
        }
      });
    }
  }
}
```

4. **Update Services to Use New Schema**:
   - Modify relevant services to use the new schema elements

```typescript
// Example: Using the new schema in forum-polling-service.ts
async function processMonitoredTopic(
  // ... existing parameters ...
) {
  try {
    // Get tracking info from the database instead of in-memory
    const topicTracking = await prisma.forumTopicTracking.findUnique({
      where: {
        agentId_topicId: {
          agentId,
          topicId
        }
      }
    });
    
    const lastReadPostNumber = topicTracking?.lastReadPostNumber || 0;
    
    // ... existing code ...
    
    // Update the tracking in the database
    await prisma.forumTopicTracking.upsert({
      where: {
        agentId_topicId: {
          agentId,
          topicId
        }
      },
      update: {
        lastReadPostNumber: highestPostNumber,
        updatedAt: new Date()
      },
      create: {
        agentId,
        topicId,
        lastReadPostNumber: highestPostNumber
      }
    });
    
    // ... rest of the method ...
  } catch (error: any) {
    logger.error(`Error processing monitored topic ${topicId} for agent ${agentId}: ${error.message}`);
  }
}
```

## Coding Standards

To ensure consistency and maintainability across the codebase:

### ESLint and Prettier

Follow the project's ESLint and Prettier configurations:

```bash
# Check for linting issues
npm run lint

# Fix automatically fixable issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### TypeScript Best Practices

1. **Use Strong Typing**:
   - Define interfaces and types for all data structures
   - Avoid `any` types where possible
   - Use generics for reusable components

```typescript
// Example: Using strong typing
interface ForumStatistics {
  totalPosts: number;
  topicCount: number;
  activeTopics: Array<{
    id: number;
    title: string;
    postCount: number;
    lastActivity: Date;
  }>;
  userEngagement: number; // 0-100 score
}

// Using the interface
function calculateEngagement(statistics: ForumStatistics): number {
  // Implementation...
}
```

2. **Document with JSDoc Comments**:
   - Add JSDoc comments to functions, classes, and interfaces
   - Include parameter descriptions and return types

```typescript
/**
 * Calculates a relevance score for a forum topic based on agent preferences
 * 
 * @param topicContent The content of the forum topic
 * @param agentPreferences The agent's preferences object
 * @param options Additional options for calculation
 * @returns A score from 0-10 indicating relevance
 */
function calculateRelevanceScore(
  topicContent: string,
  agentPreferences: AgentPreferences,
  options?: RelevanceOptions
): number {
  // Implementation...
}
```

### Error Handling

1. **Use Structured Error Handling**:
   - Catch specific errors when possible
   - Log errors with appropriate context
   - Return meaningful error messages to clients

```typescript
try {
  // Operation that might fail
} catch (error) {
  // Check for specific error types
  if (error instanceof SomeSpecificError) {
    logger.warn(`Specific error occurred: ${error.message}`);
    return res.status(400).json({ error: 'Specific error message' });
  }
  
  // Log unexpected errors
  logger.error('Unexpected error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}
```

## Contribution Workflow

When contributing to the NDNE prototype:

1. **Create a Feature Branch**:
   - Branch from main/develop with a descriptive name

2. **Make Focused Changes**:
   - Keep changes small and focused on a single feature/fix

3. **Write Tests** (when applicable):
   - Add tests for new functionality
   - Ensure existing tests pass

4. **Follow the PR Template**:
   - Describe the purpose of the changes
   - List the key files modified
   - Explain testing performed

5. **Code Review**:
   - Address all reviewer comments
   - Ensure CI checks pass

## Deploying Changes

After your changes are approved and merged:

1. **Update Documentation**:
   - Update relevant documentation if your changes affect system behavior
   - Add comments in code for complex logic

2. **Release Process**:
   - Coordinate with the team for deployment timing
   - Follow the deployment checklist (if available)

3. **Post-Deployment Verification**:
   - Verify your changes work as expected in the deployed environment
   - Monitor for any unexpected issues
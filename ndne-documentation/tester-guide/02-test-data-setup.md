# NDNE Test Data Setup

This document provides instructions for setting up test data in the NDNE prototype system. Proper test data setup is essential for effective testing of the various system components and interactions.

## Overview

The NDNE prototype requires several types of test data:

1. User accounts
2. Praxis Agents with preferences
3. Discourse forum content
4. Agent-forum interactions

This guide explains how to set up each type of test data.

## Creating Test Users

### Method 1: Using the Frontend UI

The simplest way to create test users is through the registration flow:

1. Navigate to http://localhost:5173 in your browser
2. Click the "Register" or "Sign Up" button
3. Fill in the required information:
   - Email: Use a format like `test-[purpose]@example.com` (e.g., `test-admin@example.com`)
   - Password: Use a standard test password (e.g., `password123`)
   - Name: Use a descriptive name related to the test purpose

### Method 2: Database Seeding

For more consistent testing or to create multiple users at once, use the database seeding mechanism:

1. Create or modify the seed script at `backend/prisma/seed.ts`:

```typescript
// Add test users
const users = [
  {
    email: 'test-regular@example.com',
    name: 'Regular Test User',
    password: await bcrypt.hash('password123', 10),
    role: 'USER'
  },
  {
    email: 'test-admin@example.com',
    name: 'Admin Test User',
    password: await bcrypt.hash('adminpass', 10),
    role: 'ADMIN'
  }
];

for (const userData of users) {
  await prisma.user.upsert({
    where: { email: userData.email },
    update: userData,
    create: userData
  });
}
```

2. Run the seed script:

```bash
docker-compose exec backend npx prisma db seed
```

## Creating Test Agents & Preferences

Agents are created during user onboarding, but they can also be created or configured programmatically for testing.

### Method 1: Complete the Onboarding Flow

1. Log in with a test user account
2. Complete the onboarding steps:
   - Agent name
   - Issue selection
   - Stance for each issue
   - Top priority issue
   - Deal-breakers
   - Notification preferences
   - Optional: proposal idea

This method is useful for testing the onboarding flow itself.

### Method 2: Using the Test Agent Script

For consistent testing with pre-configured agents, use the test agent script:

1. Examine `backend/scripts/seed-test-agent.ts` to understand or modify the test agent configuration
2. Run the script:

```bash
docker-compose exec backend npm run seed:test-agent
```

This script creates an agent with specific preferences, including:
- Pre-selected issues and stances
- Priority issues
- Deal-breakers
- Notification preferences

### Method 3: Direct Database Manipulation

For advanced testing scenarios, you can directly modify agent preferences in the database:

1. Connect to the PostgreSQL database:

```bash
docker-compose exec postgres psql -U user -d ndne
```

2. Update agent preferences:

```sql
UPDATE "Agent" 
SET preferences = jsonb_set(
  COALESCE(preferences, '{}'::jsonb),
  '{issuesMatrix}',
  '[
    {"id": "1", "title": "Climate Action", "stance": "APPROACH_A", "reason": "Immediate action needed", "isPriority": true},
    {"id": "2", "title": "Healthcare Reform", "stance": "CUSTOM", "reason": "Mixed approach", "isPriority": false}
  ]'::jsonb
)
WHERE id = 'agent-id-here';
```

Remember to replace `'agent-id-here'` with the actual agent ID you want to modify.

## Setting up Discourse Test Content

Testing the forum interaction capabilities requires a configured Discourse instance with test content.

### Prerequisite: Discourse API Configuration

Ensure your Discourse instance is properly configured and the API settings are correct in your backend environment:

```
DISCOURSE_URL=http://your-discourse-instance
DISCOURSE_API_KEY=your_discourse_api_key
DISCOURSE_API_USERNAME=system
```

### Method 1: Manual Discourse Content Creation

1. Log in to your Discourse admin account
2. Create test categories:
   - Navigate to Admin > Categories
   - Create categories like "Test", "Climate Action", "Healthcare Reform"
3. Create test topics:
   - Navigate to a category
   - Click "New Topic"
   - Create topics with varying content to test different scenarios
4. Create test replies:
   - Open a topic
   - Reply to posts with various content

### Method 2: Discourse API Script

For reproducible test data, create a script to populate Discourse via the API:

```javascript
// Example script: populate-discourse.js
const axios = require('axios');

const DISCOURSE_URL = process.env.DISCOURSE_URL;
const DISCOURSE_API_KEY = process.env.DISCOURSE_API_KEY;
const DISCOURSE_API_USERNAME = process.env.DISCOURSE_API_USERNAME;

async function createTestContent() {
  // Create a test topic
  const topicResponse = await axios.post(
    `${DISCOURSE_URL}/posts.json`,
    {
      title: 'Test Topic for Agent Interaction',
      raw: 'This is a test topic to evaluate agent forum interactions.',
      category: 5, // Replace with your test category ID
    },
    {
      headers: {
        'Api-Key': DISCOURSE_API_KEY,
        'Api-Username': DISCOURSE_API_USERNAME,
      },
    }
  );

  const topicId = topicResponse.data.topic_id;
  console.log(`Created test topic with ID: ${topicId}`);
  
  // Create test replies
  await axios.post(
    `${DISCOURSE_URL}/posts.json`,
    {
      topic_id: topicId,
      raw: 'I disagree with the current approach. We should consider alternatives.',
    },
    {
      headers: {
        'Api-Key': DISCOURSE_API_KEY,
        'Api-Username': DISCOURSE_API_USERNAME,
      },
    }
  );

  console.log('Created test reply');
}

createTestContent().catch(console.error);
```

Run this script with:

```bash
docker-compose exec backend node populate-discourse.js
```

## Setting Up Agent-Forum Monitoring

To test the forum monitoring capabilities:

1. Use the agent service to configure monitoring:

```typescript
// Example code for forum monitoring setup
import * as agentService from './services/agent-service';

async function setupMonitoring() {
  const agentId = 'your-test-agent-id';
  const topicId = 123; // Discourse topic ID to monitor
  
  const result = await agentService.directAgentToMonitorDiscourseTopic(
    agentId,
    topicId
  );
  
  console.log('Monitoring setup result:', result);
}
```

2. Or directly update the database:

```sql
UPDATE "Agent" 
SET "monitoredDiscourseTopics" = '{"topicIds": [123, 456], "categoryIds": [5]}'
WHERE id = 'agent-id-here';
```

## Test Data Verification

To verify that your test data is set up correctly:

### User & Agent Verification

```bash
docker-compose exec postgres psql -U user -d ndne -c "SELECT * FROM \"User\";"
docker-compose exec postgres psql -U user -d ndne -c "SELECT id, name, \"userId\", \"onboardingCompleted\" FROM \"Agent\";"
```

### Agent Preferences Verification

```bash
docker-compose exec postgres psql -U user -d ndne -c "SELECT id, preferences FROM \"Agent\";"
```

### Discourse Monitoring Verification

```bash
docker-compose exec postgres psql -U user -d ndne -c "SELECT id, \"monitoredDiscourseTopics\" FROM \"Agent\";"
```

## Test Data Reset

For a clean test environment, you may want to reset the test data:

### Full Database Reset

```bash
docker-compose down -v
docker-compose up -d
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed
```

### Selective Data Reset

To reset only specific data while preserving other test data:

```sql
-- Reset agent preferences
UPDATE "Agent" SET preferences = '{}'::jsonb WHERE id = 'agent-id-here';

-- Reset monitored topics
UPDATE "Agent" SET "monitoredDiscourseTopics" = '{}'::jsonb WHERE id = 'agent-id-here';

-- Delete chat messages
DELETE FROM "ChatMessage" WHERE "agentId" = 'agent-id-here';
```

## Testing with Multiple Users and Agents

For testing scenarios that involve multiple users and agents interacting:

1. Create multiple test user accounts
2. Complete onboarding for each user to create distinct agents
3. Configure each agent with different preferences
4. Set up forum topics and agent monitoring
5. Test agent-to-agent interactions via forum posts

This approach allows you to simulate a multi-agent environment that reflects real-world usage of the NDNE prototype.

## Conclusion

Proper test data setup is essential for effective testing of the NDNE prototype. By following these guidelines, you can create a consistent and representative test environment that covers all aspects of the system's functionality.

For more detailed testing procedures, refer to the manual testing procedures guide.
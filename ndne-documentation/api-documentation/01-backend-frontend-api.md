# NDNE Backend-Frontend API Documentation

This document describes the API endpoints that the frontend uses to communicate with the backend in the NDNE prototype.

## Overview

The frontend communicates with the backend through a RESTful API. All endpoints are prefixed with `/api`.

**Base URL**: `http://localhost:4000/api` (default in development environment)

**Authentication**: Most endpoints require authentication using a JWT Bearer token. The token is obtained through the login endpoint and should be included in the `Authorization` header of subsequent requests.

Example authenticated request:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## API Endpoints

The endpoints are organized by feature area.

### Authentication (`/auth`)

#### Register

Creates a new user account.

- **HTTP Method & Path**: `POST /auth/register`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword",
    "name": "User Name"
  }
  ```
- **Response Format**:
  ```json
  {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "token": "jwt-token-here"
  }
  ```
- **Usage**: Used during user registration flow.

#### Login

Authenticates a user and returns a JWT token.

- **HTTP Method & Path**: `POST /auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response Format**:
  ```json
  {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "token": "jwt-token-here"
  }
  ```
- **Usage**: Used during user login flow.

#### Get Current User

Retrieves the currently authenticated user's information.

- **HTTP Method & Path**: `GET /auth/me`
- **Request Headers**: Requires Authorization header with JWT token
- **Response Format**:
  ```json
  {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "USER"
  }
  ```
- **Usage**: Used to verify authentication and get user details.

### Agents (`/agents`)

#### Get Current Agent

Retrieves the agent associated with the authenticated user.

- **HTTP Method & Path**: `GET /agents/me`
- **Request Headers**: Requires Authorization header with JWT token
- **Response Format**:
  ```json
  {
    "id": "agent-uuid",
    "name": "Agent Name",
    "color": "#4299E1",
    "onboardingCompleted": true,
    "preferences": {
      "issuesMatrix": [
        {
          "id": "1",
          "title": "Climate Action",
          "stance": "APPROACH_A",
          "reason": "Immediate action needed",
          "isPriority": true
        },
        // ... other issues
      ],
      "userKnowledge": {
        "key_topics": ["topic1", "topic2"],
        "stated_preferences": ["pref1", "pref2"],
        "goals": ["goal1", "goal2"],
        "communication_style": "friendly"
        // ... other knowledge
      }
    }
  }
  ```
- **Usage**: Used to get agent details and preferences.

#### Update Agent Preferences

Updates the preferences for the current user's agent.

- **HTTP Method & Path**: `PATCH /agents/me/preferences`
- **Request Headers**: Requires Authorization header with JWT token
- **Request Body**:
  ```json
  {
    "preferences": {
      "issuesMatrix": [
        // Updated issues matrix
      ],
      "notifyPref": "WEEKLY"
      // Other preference fields
    }
  }
  ```
- **Response Format**:
  ```json
  {
    "id": "agent-uuid",
    "name": "Agent Name",
    "preferences": {
      // Updated preferences
    }
  }
  ```
- **Usage**: Used to update agent preferences after onboarding or when user changes preferences.

#### Pause/Unpause Agent

Toggles the active status of an agent.

- **HTTP Method & Path**: `POST /agents/me/pause`
- **Request Headers**: Requires Authorization header with JWT token
- **Request Body**:
  ```json
  {
    "paused": true // or false to unpause
  }
  ```
- **Response Format**:
  ```json
  {
    "id": "agent-uuid",
    "paused": true
  }
  ```
- **Usage**: Used to temporarily pause agent activities such as forum monitoring.

#### Submit Agent Feedback

Submits feedback about agent performance or behavior.

- **HTTP Method & Path**: `POST /agents/:agentId/feedback`
- **Request Headers**: Requires Authorization header with JWT token
- **Request Parameters**: `agentId` - ID of the agent
- **Request Body**:
  ```json
  {
    "type": "PERFORMANCE", // or "BEHAVIOR", "SUGGESTION", etc.
    "content": "The agent didn't understand my request about climate policy."
  }
  ```
- **Response Format**:
  ```json
  {
    "id": "feedback-uuid",
    "type": "PERFORMANCE",
    "content": "The agent didn't understand my request about climate policy.",
    "createdAt": "2025-05-06T12:34:56Z"
  }
  ```
- **Usage**: Used to collect user feedback about agent performance.

### Chat (`/chat`)

#### Send Message

Sends a message to an agent and receives a response.

- **HTTP Method & Path**: `POST /chat/messages`
- **Request Headers**: Requires Authorization header with JWT token
- **Request Body**:
  ```json
  {
    "agentId": "agent-uuid",
    "content": "What do you think about renewable energy?",
    "metadata": {} // Optional metadata
  }
  ```
- **Response Format**:
  ```json
  {
    "id": "message-uuid",
    "content": "Based on your preferences, I believe renewable energy is...",
    "role": "agent",
    "createdAt": "2025-05-06T12:34:56Z",
    "metadata": {},
    "extractedPreferences": {} // Any preferences extracted from the conversation
  }
  ```
- **Usage**: Used for the chat interface between Sov and agent.

#### Get Messages

Retrieves chat message history for a specific agent.

- **HTTP Method & Path**: `GET /chat/messages`
- **Request Headers**: Requires Authorization header with JWT token
- **Query Parameters**:
  - `agentId`: ID of the agent
  - `limit` (optional): Maximum number of messages to retrieve
  - `before` (optional): Retrieve messages before this message ID (for pagination)
- **Response Format**:
  ```json
  {
    "messages": [
      {
        "id": "message-uuid-1",
        "content": "What do you think about renewable energy?",
        "role": "user",
        "createdAt": "2025-05-06T12:34:56Z",
        "metadata": {}
      },
      {
        "id": "message-uuid-2",
        "content": "Based on your preferences, I believe renewable energy is...",
        "role": "agent",
        "createdAt": "2025-05-06T12:35:10Z",
        "metadata": {}
      }
      // Additional messages
    ],
    "hasMore": false
  }
  ```
- **Usage**: Used to display chat history in the chat interface.

#### Get Message

Retrieves a specific chat message.

- **HTTP Method & Path**: `GET /chat/messages/:id`
- **Request Headers**: Requires Authorization header with JWT token
- **Request Parameters**: `id` - ID of the message
- **Response Format**:
  ```json
  {
    "id": "message-uuid",
    "content": "What do you think about renewable energy?",
    "role": "user",
    "createdAt": "2025-05-06T12:34:56Z",
    "metadata": {}
  }
  ```
- **Usage**: Used to fetch details of a specific message.

#### Delete Message

Deletes a specific chat message.

- **HTTP Method & Path**: `DELETE /chat/messages/:id`
- **Request Headers**: Requires Authorization header with JWT token
- **Request Parameters**: `id` - ID of the message
- **Response Format**:
  ```json
  {
    "success": true
  }
  ```
- **Usage**: Used to delete inappropriate or unwanted messages.

### Onboarding (`/onboarding`)

#### Save Onboarding Step

Saves progress during the agent onboarding process.

- **HTTP Method & Path**: `POST /onboarding/steps/:step`
- **Request Headers**: Requires Authorization header with JWT token
- **Request Parameters**: `step` - Current onboarding step (0-8)
- **Request Body**:
  ```json
  {
    "message": "User response to the current step",
    "metadata": {
      "step": 2,
      "selectedIssues": ["1", "3", "5"],
      "issueQueue": ["1", "3", "5"],
      "currentIssueIndex": 0
    }
  }
  ```
- **Response Format**:
  ```json
  {
    "response": "Agent response to user input",
    "nextStep": 3,
    "completedOnboarding": false,
    "metadata": {
      "step": 3,
      "selectedIssues": ["1", "3", "5"],
      "issueQueue": ["3", "5"],
      "currentIssueIndex": 1
    },
    "extractedPreferences": {
      // Any preferences extracted so far
    }
  }
  ```
- **Usage**: Used during the step-by-step onboarding flow to configure the agent.

### Forum (`/forum`)

#### Post Forum Directive

Directs the agent to post content to the Discourse forum.

- **HTTP Method & Path**: `POST /forum/post-directive`
- **Request Headers**: Requires Authorization header with JWT token
- **Request Body**:
  ```json
  {
    "directive": "Create a post about renewable energy policies",
    "topicContext": "Focus on local implementation possibilities" // Optional
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "postUrl": "https://discourse.example.com/t/renewable-energy-policies/123",
    "content": {
      "title": "Renewable Energy Policies: Local Implementation",
      "body": "As we consider renewable energy options..."
    }
  }
  ```
- **Usage**: Used when the Sov directs their agent to create content on the forum.

#### Monitor Topic

Directs the agent to start monitoring a Discourse topic or category.

- **HTTP Method & Path**: `POST /forum/monitor`
- **Request Headers**: Requires Authorization header with JWT token
- **Request Body**:
  ```json
  {
    "topicId": 123, // Optional, either topicId or categoryId must be provided
    "categoryId": null // Optional
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "monitoredTopics": {
      "topicIds": [123, 456],
      "categoryIds": [5, 8]
    }
  }
  ```
- **Usage**: Used to configure what forum content the agent should monitor.

#### Stop Monitoring

Directs the agent to stop monitoring a Discourse topic or category.

- **HTTP Method & Path**: `POST /forum/stop-monitoring`
- **Request Headers**: Requires Authorization header with JWT token
- **Request Body**:
  ```json
  {
    "topicId": 123, // Optional, either topicId or categoryId must be provided
    "categoryId": null // Optional
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "monitoredTopics": {
      "topicIds": [456],
      "categoryIds": [5, 8]
    }
  }
  ```
- **Usage**: Used to remove forum topics from the agent's monitoring list.

#### Process Forum Content

Processes and analyzes forum content for relevance to the agent's interests.

- **HTTP Method & Path**: `POST /forum/process-content`
- **Request Headers**: Requires Authorization header with JWT token
- **Request Body**:
  ```json
  {
    "forumText": "Content of forum post or topic to analyze",
    "sourceTopicUrl": "https://discourse.example.com/t/123" // Optional
  }
  ```
- **Response Format**:
  ```json
  {
    "analysis": {
      "summary": "This post discusses renewable energy policies focusing on...",
      "keyTopics": ["renewable energy", "policy implementation", "local governance"],
      "relevanceScore": 8.5,
      "actionItems": ["Consider responding with your perspective on community solar"]
    }
  }
  ```
- **Usage**: Used to analyze forum content for relevance and provide recommendations to the Sov.

### Issues (`/issues`)

#### Get Issues

Retrieves available issues for agent configuration.

- **HTTP Method & Path**: `GET /issues`
- **Request Headers**: Requires Authorization header with JWT token
- **Response Format**:
  ```json
  {
    "issues": [
      {
        "id": "1",
        "title": "Climate Action",
        "description": "Policies and approaches to address climate change",
        "stances": [
          {
            "perspective": "Those who",
            "opinion": "immediate, aggressive action"
          },
          {
            "perspective": "Those who",
            "opinion": "balanced, economically-conscious approaches"
          },
          {
            "perspective": "Those who",
            "opinion": "market-based solutions and technological innovation"
          }
        ]
      },
      // Additional issues
    ]
  }
  ```
- **Usage**: Used during onboarding to present issues for the Sov to select.

## Error Handling

All API endpoints follow a consistent error format:

```json
{
  "error": "Error message describing what went wrong",
  "status": 400, // HTTP status code
  "details": {} // Optional additional error details
}
```

Common error status codes:
- `400`: Bad Request - Invalid input parameters
- `401`: Unauthorized - Missing or invalid authentication
- `403`: Forbidden - Authenticated but lacking required permissions
- `404`: Not Found - Resource not found
- `500`: Internal Server Error - Unexpected server error

## API Client Usage

The frontend uses an API client (`apiClient.ts`) to interact with these endpoints. Example usage:

```typescript
// Login example
const handleLogin = async (email: string, password: string) => {
  try {
    const userData = await api.login(email, password);
    // Store token and redirect to dashboard
    localStorage.setItem('token', userData.token);
    navigate('/dashboard');
  } catch (error) {
    // Handle error
    console.error('Login failed:', error);
  }
};

// Send chat message example
const sendMessage = async (content: string) => {
  try {
    const response = await api.sendMessage(agentId, content);
    setMessages(prev => [...prev, response]);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};
```

## Rate Limiting

The API implements rate limiting to prevent abuse. Clients should handle `429 Too Many Requests` responses by implementing exponential backoff.

## Versioning

The current API is version 1 (implicit in the path). Future API changes may include version numbers in the path (e.g., `/api/v2/auth/login`).
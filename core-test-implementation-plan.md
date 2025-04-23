# NDNE Core Test Implementation Plan

## Introduction

This document outlines the implementation plan for enhancing the NDNE prototype to focus on AI agents autonomously negotiating on behalf of their respective users. Rather than rebuilding from scratch, this plan builds upon the existing foundation that has already been developed, extending the current codebase to support new chat-based interactions and autonomous negotiation capabilities.

## Plan Navigation

- [Current System Foundation](#current-system-foundation)
- [Proposed Enhancements Overview](#proposed-enhancements)
- [Database Schema Extensions](#database-schema-extensions)
- [Implementation Phases](#implementation-approach)
  - [Phase 1: Chat-based Onboarding](#phase-1-chat-based-onboarding-foundation)
  - [Phase 2: User-Agent Communication](#phase-2-user-agent-communication)
  - [Phase 3: Agent-to-Agent Negotiation](#phase-3-agent-to-agent-negotiation)
  - [Phase 4: Proposal Integration](#phase-4-proposal-integration)
  - [Phase 5: UI/UX and Integration](#phase-5-uiux-and-integration)
- [Timeline Estimate](#timeline-estimate)
- [Technical Considerations](#technical-considerations)
- [Implementation Status Dashboard](#implementation-status-dashboard)

## Current System Foundation

The existing NDNE prototype already provides several key components that we'll build upon:

| Component | Status | Location | Description |
|-----------|--------|----------|-------------|
| User Authentication | ✅ Complete | `backend/src/routes/auth.ts` | Email/password login with JWT |
| User Registration | ✅ Complete | `backend/src/routes/auth.ts` | Account creation flow |
| Form-based Onboarding | ✅ Complete | `frontend/src/components/OnboardingWizard.tsx` | Three-step wizard UI for initial setup |
| Agent Preferences | ✅ Complete | `backend/prisma/schema.prisma` | Database schema for agent preferences |
| Proposal Creation | ✅ Complete | `frontend/src/components/NewProposalForm.tsx` | Form for creating new proposals |
| Proposal Management | ✅ Complete | `backend/src/routes/proposal.ts` | Backend API for proposal CRUD operations |
| Basic Voting System | ✅ Complete | `backend/src/routes/vote.ts` | Vote recording and tallying |
| Dashboard | ✅ Complete | `frontend/src/pages/DashboardPage.tsx` | Main user interface |

## Proposed Enhancements

To transform the platform into a focus on autonomous AI negotiation, we need to implement the following key enhancements:

### 1. Chat-based Onboarding System

| Feature | Status | Description | Priority |
|---------|--------|-------------|----------|
| Conversational Interface | 🔄 To Do | Replace form-based wizard with chat UI | High |
| AI Questioning Flow | 🔄 To Do | LLM-driven interview process | High |
| Adaptive Questioning | 🔄 To Do | Dynamic questions based on earlier responses | Medium |
| Preference Extraction | 🔄 To Do | Parse user responses to structured preferences | High |

### 2. User-Agent Chat Interface

| Feature | Status | Description | Priority |
|---------|--------|-------------|----------|
| Dedicated Chat UI | 🔄 To Do | Persistent chat interface on dashboard | High |
| Proactive Agent Queries | 🔄 To Do | Agent-initiated preference questions | Medium |
| Conversation Memory | 🔄 To Do | Store and reference past interactions | High |
| Personalized Agent Responses | 🔄 To Do | User-specific agent "personality" | Medium |

### 3. Agent-to-Agent Negotiation System

| Feature | Status | Description | Priority |
|---------|--------|-------------|----------|
| Negotiation Protocol | 🔄 To Do | Defined flow for agent communications | High |
| LLM Representation System | 🔄 To Do | Agents acting on behalf of users | High |
| Standardized Agent Interaction | 🔄 To Do | Non-personalized negotiation style | Medium |
| Iterative Proposal Refinement | 🔄 To Do | Multi-step consensus building | High |

### 4. Proposal Management System Enhancement

| Feature | Status | Description | Priority |
|---------|--------|-------------|----------|
| Negotiated Proposal Support | 🔄 To Do | Link proposals to negotiation sessions | High |
| Negotiation-to-Proposal Translation | 🔄 To Do | Convert negotiations to formal proposals | High |
| Negotiation Visualization | 🔄 To Do | UI for viewing negotiation progress | Medium |
| Autonomous Agent Support | 🔄 To Do | Minimal human intervention flow | High |

### 5. User Notification and Involvement System

| Feature | Status | Description | Priority |
|---------|--------|-------------|----------|
| Decision Point Notifications | 🔄 To Do | Alert users at critical moments | High |
| Agent Activity Summarization | 🔄 To Do | Readable summaries of agent actions | Medium |
| User Feedback Collection | 🔄 To Do | UI flows for approvals and feedback | High |
| Notification Preferences | 🔄 To Do | User control of notification frequency | Low |

## Database Schema Extensions

We'll extend the existing database schema to support new features. The following changes must be made to `backend/prisma/schema.prisma`:

### 1. Chat-related Tables

```prisma
// Add these models to backend/prisma/schema.prisma

model ChatMessage {
  id        String   @id @default(uuid())
  userId    String
  agentId   String
  content   String   @db.Text  // Use Text type for potentially long messages
  sender    String   @default("user") // Either "user" or "agent"
  timestamp DateTime @default(now())
  metadata  Json?    // Optional field for additional message metadata
  user      User     @relation(fields: [userId], references: [id])
  agent     Agent    @relation(fields: [agentId], references: [id])

  @@index([userId])
  @@index([agentId])
  @@index([timestamp])
}

model NegotiationSession {
  id           String               @id @default(uuid())
  topic        String
  description  String?              @db.Text
  status       String               @default("active") // "active", "completed", "abandoned"
  startedAt    DateTime             @default(now())
  completedAt  DateTime?
  initiatorId  String               // ID of the agent that started the negotiation
  participants Json                 // Array of agent IDs participating
  messages     NegotiationMessage[]
  proposal     Proposal?
  
  @@index([status])
  @@index([startedAt])
}

model NegotiationMessage {
  id                 String             @id @default(uuid())
  negotiationId      String
  agentId            String
  content            String             @db.Text
  messageType        String             @default("statement") // Can be "statement", "question", "proposal", "agreement", "disagreement"
  referencedMessageId String?           // For replies to specific messages
  metadata           Json?              // For additional structured data
  timestamp          DateTime           @default(now())
  negotiationSession NegotiationSession @relation(fields: [negotiationId], references: [id], onDelete: Cascade)
  agent              Agent              @relation(fields: [agentId], references: [id])

  @@index([negotiationId])
  @@index([agentId])
  @@index([timestamp])
}
```

**✓ Checklist:**
- [x] Add ChatMessage model to schema
- [x] Add NegotiationSession model to schema
- [x] Add NegotiationMessage model to schema
- [ ] Create migration (run `npx prisma migrate dev --name add_chat_models`) [In Progress - DB config issue]
- [ ] Verify migration applied successfully

**Notes for implementor:**
```
Add any observations or challenges encountered while implementing these changes here.
```

### 2. Extend Agent Model

```prisma
// Modify the existing Agent model in backend/prisma/schema.prisma

model Agent {
  // Existing fields...
  id               String   @id @default(uuid())
  userId           String   @unique
  name             String
  color            String
  publicKey        String
  encryptedPrivKey String
  autonomyLevel    Int      @default(0)
  pausedUntil      DateTime?
  alignmentScore   Float    @default(1)
  preferences      Json
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  user             User     @relation(fields: [userId], references: [id])
  votes            Vote[]
  comments         Comment[]
  consents         ConsentEvent[]
  
  // New fields
  onboardingCompleted Boolean               @default(false)
  lastInteraction     DateTime?
  userKnowledge       Json                  @default("{}")
  chatMessages        ChatMessage[]
  negotiationMessages NegotiationMessage[]
  
  // Ensure existing relations remain intact
}
```

**✓ Checklist:**
- [x] Add new fields to Agent model
- [x] Ensure existing relations are maintained
- [ ] Include in the same migration as chat models [In Progress - DB config issue]
- [ ] Verify agent model updates successfully

**Notes for implementor:**
```
Add any observations or challenges encountered while implementing these changes here.
```

### 3. Extend Proposal Model

```prisma
// Modify the existing Proposal model in backend/prisma/schema.prisma

model Proposal {
  // Existing fields...
  id               String   @id @default(uuid())
  title            String
  description      String
  type             String   @default("standard")
  playMode         Boolean  @default(false)
  amount           Float?
  createdByAgentId String
  status           String   @default("open")
  quorum           Int
  threshold        Float    @default(0.5)
  createdAt        DateTime @default(now())
  closeAt          DateTime
  vetoWindowEnd    DateTime
  votes            Vote[]
  comments         Comment[]
  playMoneyLedgerEntry PlayMoneyLedgerEntry?
  
  // New fields
  negotiationId       String?              @unique
  isNegotiated        Boolean              @default(false)
  negotiationSummary  String?              @db.Text
  negotiationSession  NegotiationSession?  @relation(fields: [negotiationId], references: [id])
}
```

**✓ Checklist:**
- [x] Add new fields to Proposal model
- [x] Add relation to NegotiationSession
- [ ] Include in the same migration as chat models [In Progress - DB config issue]
- [ ] Verify proposal model updates successfully

**Notes for implementor:**
```
Add any observations or challenges encountered while implementing these changes here.
```

## Implementation Approach

### Phase 1: Chat-based Onboarding (Foundation)

#### 1. Create Chat Message Model and API Endpoints

**Task:** Create the database models and API endpoints for chat functionality

**✓ Checklist:**
- [ ] Complete database schema changes (see [Database Schema Extensions](#database-schema-extensions))
- [x] Create `backend/src/routes/chat.ts` with the following endpoints:
  - [x] `POST /api/chat/messages` - Create a new chat message
  - [x] `GET /api/chat/messages` - Get chat history with pagination
  - [x] `GET /api/chat/messages/:id` - Get a specific message
  - [x] `DELETE /api/chat/messages/:id` - Delete a message (optional)

**API Endpoint Specifications:**

```typescript
// POST /api/chat/messages
// Request body:
interface CreateChatMessageRequest {
  content: string;      // Message text content
  agentId: string;      // ID of the agent in the conversation
  metadata?: object;    // Optional metadata
}

// Response:
interface ChatMessageResponse {
  id: string;
  userId: string;
  agentId: string;
  content: string;
  sender: "user" | "agent";
  timestamp: string;
  metadata?: object;
}

// GET /api/chat/messages
// Query parameters:
// - agentId: string (required) - The agent ID to get messages for
// - limit: number (optional, default: 50) - Number of messages to return
// - before: string (optional) - Get messages before this timestamp
// - onboarding: boolean (optional) - If true, only return onboarding messages

// Response:
interface ChatMessagesResponse {
  messages: ChatMessageResponse[];
  hasMore: boolean;
  nextCursor?: string;
}
```

**Notes for implementor:**
```
Add implementation notes here, including any decisions made or challenges encountered.
```

#### 2. Develop Chat UI Components

**Task:** Create React components for the chat interface

**Dependencies:**
- Chat API endpoints must be implemented first

**✓ Checklist:**
- [x] Create directory structure:
  - [x] `frontend/src/components/chat/`
- [x] Implement components:
  - [x] `ChatInterface.tsx` - Main container component
  - [x] `ChatMessage.tsx` - Individual message renderer
  - [x] `ChatInput.tsx` - Text input with send button
  - [x] `ChatHistory.tsx` - Message list with scroll and load-more
- [x] Create CSS for styling:
  - [x] `ChatInterface.css`
  - [x] `ChatMessage.css`
  - [x] `ChatInput.css`
  - [x] `ChatHistory.css`

**Component Specifications:**

```typescript
// ChatInterface.tsx
interface ChatInterfaceProps {
  agentId: string;
  isOnboarding?: boolean;
  onComplete?: () => void;  // For onboarding completion
}

// ChatMessage.tsx
interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    sender: "user" | "agent";
    timestamp: string;
    metadata?: any;
  };
  agentColor?: string;
  agentName?: string;
}

// ChatInput.tsx
interface ChatInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// ChatHistory.tsx
interface ChatHistoryProps {
  messages: Array<ChatMessageProps["message"]>;
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  agentColor?: string;
  agentName?: string;
}
```

**Notes for implementor:**
```
Add implementation notes here, including any design decisions or UI/UX considerations.
```

#### 3. Implement LLM-based Chat Logic in Agent Service

**Task:** Extend the agent service to handle chat-based interactions

**Dependencies:**
- Chat API endpoints must be implemented first

**✓ Checklist:**
- [x] Extend `backend/src/services/agent-service.ts` with new functions:
  - [x] `conductOnboardingChat(userId: string, agentId: string, message: string): Promise<string>`
  - [x] `processChatMessage(userId: string, agentId: string, message: string): Promise<string>`
- [x] Create new file `backend/src/services/chat-service.ts` for:
  - [x] Message history management
  - [x] Context window management
  - [x] Message storage and retrieval
- [ ] Define prompt templates for different conversation scenarios in `backend/src/services/prompt-templates/`:
  - [ ] `onboarding-prompts.ts`
  - [ ] `chat-prompts.ts`

**Function Specifications:**

```typescript
// Agent Service Extension
async function conductOnboardingChat(
  userId: string, 
  agentId: string, 
  message: string, 
  stage: 'initial' | 'preferences' | 'priorities' | 'confirmation' = 'initial'
): Promise<{
  response: string;
  extractedPreferences?: Record<string, any>;
  nextStage?: 'initial' | 'preferences' | 'priorities' | 'confirmation' | 'complete';
  completedOnboarding?: boolean;
}> {
  // Implementation details here
}

async function processChatMessage(
  userId: string,
  agentId: string,
  message: string,
  contextMessages: number = 10
): Promise<{
  response: string;
  extractedPreferences?: Record<string, any>;
  actionRequired?: boolean;
  suggestedAction?: string;
}> {
  // Implementation details here
}

// Example prompt template for onboarding
const ONBOARDING_SYSTEM_PROMPT = `You are an AI agent conducting an onboarding conversation with a new user.
Your goal is to build a profile of their preferences, priorities, and communication style in a friendly, conversational manner.
Ask one question at a time, adapting your follow-up questions based on their responses.
You must collect information about: [list of required preferences]
Remain friendly and conversational while systematically collecting this information.`;
```

**Notes for implementor:**
```
Add implementation notes here, including any decisions about prompt engineering, context management, or preference extraction logic.
```

#### 4. Replace Onboarding Wizard

**Task:** Create a new chat-based onboarding experience to replace the form wizard

**Dependencies:**
- Chat UI components must be implemented
- LLM chat logic must be implemented

**✓ Checklist:**
- [x] Create new components:
  - [x] `frontend/src/components/OnboardingChat.tsx` - Main onboarding chat component
  - [x] `frontend/src/components/OnboardingProgress.tsx` (included within OnboardingChat)
- [x] Modify routing in `frontend/src/App.tsx` to use new components
- [x] Update API client in `frontend/src/api/apiClient.ts` to include chat endpoints
- [ ] Verify with product team that all required preference data is collected

**Component Design:**

```typescript
// OnboardingChat.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ChatInterface from './chat/ChatInterface';
import OnboardingProgress from './OnboardingProgress';

const OnboardingChat: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState<'initial' | 'preferences' | 'priorities' | 'confirmation'>('initial');
  const [progress, setProgress] = useState(0);
  
  // Implementation details...
  
  return (
    <div className="onboarding-chat-container">
      <h2>Welcome to NDNE</h2>
      <OnboardingProgress stage={stage} progress={progress} />
      <ChatInterface 
        agentId={agentId} 
        isOnboarding={true} 
        onComplete={() => navigate('/dashboard')} 
      />
    </div>
  );
};
```

**Notes for implementor:**
```
Add implementation notes here, including any UI/UX decisions or challenges in the onboarding flow.
```

#### 5. Database Integration for Chat

**Task:** Ensure reliable storage and retrieval of chat data

**Dependencies:**
- Database schema changes must be complete
- Chat API endpoints must be implemented

**✓ Checklist:**
- [ ] Update `backend/src/routes/chat.ts` to properly store messages
- [ ] Implement preference extraction logic:
  - [ ] Create `backend/src/services/preference-extractor.ts`
  - [ ] Implement rules for mapping chat responses to structured preferences
- [ ] Update onboarding completion status in Agent model
- [ ] Add tests for chat persistence in `backend/src/tests/chat-service.spec.ts`

**Code Specifications:**

```typescript
// preference-extractor.ts
export async function extractPreferences(
  messages: Array<{sender: string, content: string}>,
  existingPreferences: Record<string, any> = {}
): Promise<Record<string, any>> {
  // Use LLM to extract structured preferences from conversation
  const prompt = `Based on the following conversation between a user and an agent, 
  extract the user's preferences in JSON format:
  
  ${messages.map(m => `${m.sender}: ${m.content}`).join('\n')}
  
  Current known preferences: ${JSON.stringify(existingPreferences)}
  
  Return ONLY a valid JSON object with the extracted preferences.`;
  
  // Call LLM and parse result
  // Implementation details...
}
```

**Notes for implementor:**
```
Add implementation notes here, including any data persistence strategies or optimization techniques.
```

### Phase 2: User-Agent Communication

#### 1. Extend Chat System for Ongoing Communication

**Task:** Create a dashboard chat interface for ongoing user-agent communication

**Dependencies:**
- Phase 1 chat components must be completed

**✓ Checklist:**
- [x] Create new components:
  - [x] `frontend/src/components/AgentChatPanel.tsx` - Dashboard chat panel
  - [ ] `frontend/src/components/ChatNotification.tsx` - Notification for new messages
- [x] Update `frontend/src/pages/DashboardPage.tsx` to include the chat panel
- [x] Implement message pagination for chat history
- [ ] Add polling or WebSocket for real-time updates (optional)

**Component Design:**

```typescript
// AgentChatPanel.tsx
interface AgentChatPanelProps {
  agentId: string;
  minimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

// Example implementation
const AgentChatPanel: React.FC<AgentChatPanelProps> = ({ 
  agentId, 
  minimized = false,
  onMinimize,
  onMaximize
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  
  // Implementation details...
  
  return minimized ? (
    <div className="chat-panel-minimized" onClick={onMaximize}>
      <ChatNotification hasUnread={hasUnreadMessages} />
    </div>
  ) : (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <h3>Chat with {agentName}</h3>
        <button onClick={onMinimize}>Minimize</button>
      </div>
      <ChatInterface agentId={agentId} />
    </div>
  );
};
```

**Notes for implementor:**
```
Add implementation notes here, focusing on UI integration in the dashboard.
```

#### 2. Develop Agent Memory/Context Management

**Task:** Enhance agent service to maintain conversation context

**Dependencies:**
- Basic chat functionality must be completed

**✓ Checklist:**
- [ ] Create context management in `backend/src/services/chat-service.ts`:
  - [ ] `getConversationContext(agentId: string, userId: string, limit?: number): Promise<Array<{role: string, content: string}>>`
  - [ ] `summarizeConversation(messages: Array<{role: string, content: string}>): Promise<string>`
- [ ] Implement preference extraction from ongoing conversations:
  - [ ] Update `preference-extractor.ts` for incremental updates
  - [ ] Create hooks to update Agent record with new preferences
- [ ] Add userKnowledge tracking to Agent model:
  - [ ] Create structure for storing learned user information
  - [ ] Implement regular updates to this knowledge base

**Code Specifications:**

```typescript
// chat-service.ts
async function getConversationContext(
  agentId: string, 
  userId: string, 
  limit: number = 20
): Promise<Array<{role: string, content: string}>> {
  // Fetch recent messages
  const messages = await prisma.chatMessage.findMany({
    where: { 
      agentId, 
      userId 
    },
    orderBy: { 
      timestamp: 'desc' 
    },
    take: limit
  });
  
  // Convert to LLM-friendly format and reverse to chronological order
  return messages
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))
    .reverse();
}

async function summarizeConversation(
  messages: Array<{role: string, content: string}>
): Promise<string> {
  // Use LLM to generate a summary when context gets too large
  // Implementation details...
}
```

**Notes for implementor:**
```
Add implementation notes here, including context window management strategies and preference extraction approach.
```

#### 3. Implement Personalized Agent Responses

**Task:** Create personalized agent communication for direct user interaction

**Dependencies:**
- Agent memory/context management must be implemented

**✓ Checklist:**
- [ ] Design personalized prompts in `backend/src/services/prompt-templates/chat-prompts.ts`:
  - [ ] Define base personality parameters
  - [ ] Create preference-based modifications
- [ ] Update agent service to apply personalization:
  - [ ] Extend `processChatMessage` to include personalization
  - [ ] Create `getAgentPersona(agentId: string, forUser: boolean): Promise<object>`
- [ ] Add test cases for personality variation in `backend/src/tests/agent-service.spec.ts`

**Code Specifications:**

```typescript
// chat-prompts.ts
export const USER_FACING_PERSONA_TEMPLATE = `You are an AI agent representing a human user in a governance system.
When speaking directly with your user (as you are doing now), you should be:
- Friendly and conversational
- Adaptive to their communication style preferences (${communicationStyle})
- Focused on understanding their needs and preferences

Your name is {agentName} and you use {agentColor} as your identifying color.
You should refer to your user by name when appropriate.

Remember that while you're personalized when speaking directly to your user,
when you represent them in negotiations, you adopt a standard, neutral tone.`;

// agent-service.ts
async function getAgentPersona(
  agentId: string, 
  forUser: boolean = true
): Promise<{
  systemPrompt: string;
  examples?: Array<{role: string, content: string}>;
}> {
  // Fetch agent and user details
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { user: true }
  });
  
  if (!agent) throw new Error('Agent not found');
  
  if (forUser) {
    // Personalized prompt for user-facing conversations
    // Implementation details...
  } else {
    // Standardized prompt for agent-to-agent negotiations
    // Implementation details...
  }
}
```

**Notes for implementor:**
```
Add implementation notes here, focusing on how personalization is implemented.
```

### Phase 3: Agent-to-Agent Negotiation

#### 1. Design Negotiation Protocol

**Task:** Define and implement the structure for agent negotiations

**Dependencies:**
- Phase 1 and 2 must be completed

**✓ Checklist:**
- [ ] Define message structure for negotiations:
  - [ ] Create types for different message categories
  - [ ] Document the negotiation flow stages
- [ ] Implement NegotiationSession and NegotiationMessage models:
  - [ ] Complete database schema changes (see [Database Schema Extensions](#database-schema-extensions))
- [ ] Create API endpoints in `backend/src/routes/negotiation.ts`:
  - [ ] `POST /api/negotiations` - Create a new negotiation session
  - [ ] `GET /api/negotiations` - List negotiations
  - [ ] `GET /api/negotiations/:id` - Get session details
  - [ ] `POST /api/negotiations/:id/messages` - Add a message to negotiation
  - [ ] `GET /api/negotiations/:id/messages` - Get negotiation messages

**API Specifications:**

```typescript
// POST /api/negotiations
// Request body:
interface CreateNegotiationRequest {
  topic: string;
  description?: string;
  participants: string[]; // Array of agent IDs
}

// Response:
interface NegotiationResponse {
  id: string;
  topic: string;
  description?: string;
  status: "active" | "completed" | "abandoned";
  startedAt: string;
  completedAt?: string;
  initiatorId: string;
  participants: string[];
}

// POST /api/negotiations/:id/messages
// Request body:
interface CreateNegotiationMessageRequest {
  agentId: string;
  content: string;
  messageType?: "statement" | "question" | "proposal" | "agreement" | "disagreement";
  referencedMessageId?: string;
  metadata?: object;
}

// Response:
interface NegotiationMessageResponse {
  id: string;
  negotiationId: string;
  agentId: string;
  content: string;
  messageType: string;
  referencedMessageId?: string;
  metadata?: object;
  timestamp: string;
}
```

**Notes for implementor:**
```
Add implementation notes here, focusing on the negotiation protocol design decisions.
```

#### 2. Implement Negotiation Service

**Task:** Create a service to manage the negotiation process

**Dependencies:**
- Negotiation protocol must be defined
- API endpoints for negotiations must be created

**✓ Checklist:**
- [ ] Create `backend/src/services/negotiation-service.ts` with:
  - [ ] `startNegotiation(topic: string, initiatorId: string, participants: string[]): Promise<string>`
  - [ ] `processNegotiationMessage(negotiationId: string, message: object): Promise<{response?: string, consensus?: boolean}>`
  - [ ] `detectConsensus(negotiationId: string): Promise<boolean>`
  - [ ] `finalizeNegotiation(negotiationId: string, outcome: object): Promise<string>`
- [ ] Implement background job for agent-to-agent negotiation in `backend/src/jobs/negotiation-worker.ts`
- [ ] Add tests in `backend/src/tests/negotiation-service.spec.ts`

**Code Specifications:**

```typescript
// negotiation-service.ts
async function startNegotiation(
  topic: string,
  initiatorId: string,
  participants: string[],
  description?: string
): Promise<string> {
  // Create a new negotiation session
  const session = await prisma.negotiationSession.create({
    data: {
      topic,
      description,
      initiatorId,
      participants: participants, // Store as JSON array
      status: 'active',
    }
  });
  
  // Notify all participants (implementation details...)
  
  return session.id;
}

async function processNegotiationMessage(
  negotiationId: string,
  messageData: Omit<CreateNegotiationMessageRequest, 'negotiationId'>
): Promise<{
  message: NegotiationMessageResponse;
  autoResponses: NegotiationMessageResponse[];
  consensusReached: boolean;
}> {
  // Store the message
  // Generate agent responses
  // Check for consensus
  // Implementation details...
}

// negotiation-worker.ts
async function runNegotiationCycle() {
  // Find active negotiations
  // For each negotiation:
  //   - Check if agents need to respond
  //   - Generate agent responses
  //   - Check for consensus
  //   - Update negotiation status
  // Implementation details...
}
```

**Notes for implementor:**
```
Add implementation notes here, focusing on the negotiation process logic.
```

#### 3. Create LLM Prompts for Agent Representation

**Task:** Design system prompts for standardized agent negotiations

**Dependencies:**
- Negotiation service must be implemented

**✓ Checklist:**
- [ ] Create `backend/src/services/prompt-templates/negotiation-prompts.ts` with:
  - [ ] `NEGOTIATION_SYSTEM_PROMPT` - Base prompt for agent negotiation
  - [ ] `CONSENSUS_CHECKING_PROMPT` - Prompt for determining consensus
  - [ ] Templates for different negotiation stages
- [ ] Implement prompt generation in negotiation service:
  - [ ] `generateNegotiationPrompt(negotiationId: string, agentId: string): Promise<string>`
  - [ ] `generateConsensusCheckPrompt(negotiationId: string): Promise<string>`
- [ ] Add test cases for prompt generation

**Code Specifications:**

```typescript
// negotiation-prompts.ts
export const NEGOTIATION_SYSTEM_PROMPT = `You are an AI agent representing a human user in a multi-agent negotiation.
In this context, you must:
1. Maintain a standard, neutral tone (no unique personality traits)
2. Faithfully represent your user's preferences and interests
3. Work to find solutions that satisfy your user's priorities while finding common ground
4. Be constructive and solution-oriented
5. Explain your positions clearly with reasoning

Your goal is to reach a consensus solution that works for all participants.`;

export const CONSENSUS_CHECKING_PROMPT = `Review the following negotiation conversation and determine if consensus has been reached.
A consensus means:
1. All participating agents have explicitly agreed to a specific proposal
2. There are no outstanding objections or requests for modification
3. The terms of the agreement are clearly defined

Negotiation history:
{negotiationHistory}

Has consensus been reached? If yes, summarize the exact terms of consensus.
If no, identify what issues still need resolution.`;
```

**Notes for implementor:**
```
Add implementation notes here, focusing on prompt engineering for faithful user representation.
```

#### 4. Build User Preference to Negotiation Position System

**Task:** Create a system to translate user preferences into negotiation stances

**Dependencies:**
- Agent personalization must be implemented
- Negotiation service must be implemented

**✓ Checklist:**
- [ ] Create `backend/src/services/stance-generator.ts`:
  - [ ] `generateNegotiationStance(agentId: string, topic: string): Promise<object>`
  - [ ] `explainStanceReasoning(agentId: string, stance: object): Promise<string>`
- [ ] Create preference weight mapping system:
  - [ ] Define canonical preference categories and weights
  - [ ] Implement mapping logic
- [ ] Add test cases in `backend/src/tests/stance-generator.spec.ts`

**Code Specifications:**

```typescript
// stance-generator.ts
interface NegotiationStance {
  position: string;
  strength: 'strong' | 'moderate' | 'weak';
  flexibility: 'high' | 'medium' | 'low';
  priorities: Array<{key: string, importance: number}>;
  constraints: string[];
  dealBreakers: string[];
}

async function generateNegotiationStance(
  agentId: string, 
  topic: string,
  context?: string
): Promise<NegotiationStance> {
  // Fetch agent preferences
  // Use LLM to generate stance based on preferences and topic
  // Implementation details...
}

async function explainStanceReasoning(
  agentId: string,
  stance: NegotiationStance
): Promise<string> {
  // Generate natural language explanation of stance based on preferences
  // Implementation details...
}
```

**Notes for implementor:**
```
Add implementation notes here, focusing on how user preferences are translated into negotiation positions.
```

### Phase 4: Proposal Integration

#### 1. Connect Negotiation to Proposal System

**Task:** Integrate negotiation results with the existing proposal system

**Dependencies:**
- Negotiation system must be functional
- Proposal routes must exist

**✓ Checklist:**
- [ ] Extend `backend/src/routes/proposal.ts` with new functions:
  - [ ] Create route for converting negotiation to proposal
  - [ ] Add negotiation metadata to proposal endpoints
- [ ] Create `backend/src/services/negotiation-to-proposal.ts`:
  - [ ] `createProposalFromNegotiation(negotiationId: string): Promise<string>`
  - [ ] `updateProposalFromNegotiation(proposalId: string, negotiationId: string): Promise<void>`
- [ ] Add database relations (see [Database Schema Extensions](#database-schema-extensions))
- [ ] Add test cases in `backend/src/tests/negotiation-to-proposal.spec.ts`

**API Specifications:**

```typescript
// POST /api/negotiations/:id/propose
// Request body:
interface NegotiationToProposalRequest {
  title?: string; // Optional override for auto-generated title
  autoCreate?: boolean; // If true, automatically creates proposal from negotiation
}

// Response:
interface NegotiationToProposalResponse {
  proposalId: string;
  negotiationId: string;
  proposalTitle: string;
  proposalDescription: string;
  status: string;
}
```

**Implementation Details:**

```typescript
// negotiation-to-proposal.ts
async function createProposalFromNegotiation(
  negotiationId: string,
  options?: {
    title?: string;
    autoCreate?: boolean;
  }
): Promise<string> {
  // Fetch negotiation session and messages
  // Generate proposal title and description from negotiation content
  // Create proposal record with link to negotiation
  // Implementation details...
}
```

**Notes for implementor:**
```
Add implementation notes here, focusing on the integration between negotiations and proposals.
```

#### 2. Enhance Proposal UI for Negotiated Proposals

**Task:** Extend the proposal UI to show negotiation details

**Dependencies:**
- Negotiation to proposal connection must be complete

**✓ Checklist:**
- [ ] Update `frontend/src/pages/ProposalDetail.tsx`:
  - [ ] Add negotiation history section
  - [ ] Create visualization component
  - [ ] Show agent stance explanation
- [ ] Create new components:
  - [ ] `frontend/src/components/NegotiationHistory.tsx`
  - [ ] `frontend/src/components/NegotiationVisualization.tsx`
- [ ] Update API client in `frontend/src/api/apiClient.ts` to include negotiation endpoints

**Component Designs:**

```typescript
// NegotiationHistory.tsx
interface NegotiationHistoryProps {
  negotiationId: string;
  compact?: boolean;
}

// NegotiationVisualization.tsx
interface NegotiationVisualizationProps {
  negotiationId: string;
  width?: number;
  height?: number;
}
```

**UI Mockup:**
```
+---------------------------------------+
| Proposal: Group Dinner Location       |
| Status: Open (5 days remaining)       |
+---------------------------------------+
| Description                           |
| ------------------------              |
| This proposal was negotiated by 3     |
| agents representing their users...    |
+---------------------------------------+
| Negotiation History                   |
| ------------------------              |
| [Timeline visualization]              |
|                                       |
| Agent A: I propose Restaurant X       |
| Agent B: I prefer Restaurant Y        |
| Agent C: How about Restaurant Z?      |
| ...                                   |
+---------------------------------------+
| Your Agent's Position                 |
| ------------------------              |
| Your agent advocated for Restaurant Z |
| because of your preference for...     |
+---------------------------------------+
```

**Notes for implementor:**
```
Add implementation notes here, focusing on the UI enhancements for negotiated proposals.
```

#### 3. User Feedback Integration

**Task:** Create systems for users to provide feedback on negotiations

**Dependencies:**
- Proposal UI enhancements must be complete

**✓ Checklist:**
- [ ] Create feedback collection UI:
  - [ ] `frontend/src/components/NegotiationFeedback.tsx`
  - [ ] Add to ProposalDetail.tsx
- [ ] Create API endpoints in `backend/src/routes/feedback.ts`:
  - [ ] `POST /api/feedback/negotiation/:id`
  - [ ] `GET /api/feedback/negotiation/:id`
- [ ] Implement feedback processing in `backend/src/services/feedback-service.ts`:
  - [ ] `processFeedback(feedbackData: object): Promise<void>`
  - [ ] `updateAgentFromFeedback(agentId: string, feedback: object): Promise<void>`

**API Specifications:**

```typescript
// POST /api/feedback/negotiation/:id
// Request body:
interface NegotiationFeedbackRequest {
  agentId: string;
  rating: number; // 1-5 scale
  representationAccuracy: number; // 1-5 scale
  comments: string;
  preferenceUpdates?: Record<string, any>;
}

// Response:
interface NegotiationFeedbackResponse {
  id: string;
  processed: boolean;
  message: string;
}
```

**Notes for implementor:**
```
Add implementation notes here, focusing on how user feedback is collected and processed.
```

### Phase 5: UI/UX and Integration

#### 1. Design and Implement Unified Dashboard

**Task:** Enhance the dashboard to include chat and negotiation features

**Dependencies:**
- All major features must be implemented

**✓ Checklist:**
- [ ] Update `frontend/src/pages/DashboardPage.tsx`:
  - [ ] Add chat interface section
  - [ ] Add negotiation status section
  - [ ] Create negotiation shortcut buttons
- [ ] Create new components:
  - [ ] `frontend/src/components/NegotiationSummary.tsx`
  - [ ] `frontend/src/components/AgentStatusCard.tsx`
- [ ] Implement responsive layout with CSS Grid or Flexbox

**Component Design:**

```typescript
// AgentStatusCard.tsx
interface AgentStatusCardProps {
  agent: {
    id: string;
    name: string;
    color: string;
    alignmentScore: number;
    lastInteraction?: string;
  };
  activeNegotiations: number;
  pendingProposals: number;
  onChatClick: () => void;
  onNegotiationsClick: () => void;
}

// DashboardPage layout
<div className="dashboard-grid">
  <header className="dashboard-header">...</header>
  
  <section className="agent-status-section">
    <AgentStatusCard ... />
  </section>
  
  <section className="active-negotiations-section">
    <h3>Active Negotiations</h3>
    {negotiations.map(negotiation => (
      <NegotiationSummary key={negotiation.id} negotiation={negotiation} />
    ))}
  </section>
  
  <section className="proposals-section">...</section>
  
  <section className="chat-section">
    <AgentChatPanel agentId={agentId} />
  </section>
</div>
```

**Notes for implementor:**
```
Add implementation notes here, focusing on the dashboard layout and organization.
```

#### 2. Mobile-Responsive Implementation

**Task:** Ensure all components work well on mobile devices

**Dependencies:**
- All UI components must be implemented

**✓ Checklist:**
- [ ] Add responsive CSS to all components:
  - [ ] Use responsive units (rem, vh/vw, %)
  - [ ] Implement media queries for breakpoints
  - [ ] Test on different screen sizes
- [ ] Create mobile-specific UI adjustments:
  - [ ] Collapsible sections
  - [ ] Touch-friendly UI elements
  - [ ] Simplified visualizations for small screens
- [ ] Test on multiple devices and browsers

**CSS Examples:**

```css
/* Base mobile-first styling */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: 1rem;
}

/* Tablet breakpoint */
@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .chat-section {
    grid-column: 1 / -1;
  }
}

/* Desktop breakpoint */
@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .agent-status-section {
    grid-column: 1 / 2;
  }
  
  .active-negotiations-section {
    grid-column: 2 / 4;
  }
}
```

**Notes for implementor:**
```
Add implementation notes here, focusing on mobile-responsive design decisions.
```

#### 3. Final Testing and Integration

**Task:** Perform comprehensive testing and optimization

**Dependencies:**
- All features must be implemented

**✓ Checklist:**
- [ ] Create end-to-end test scenarios:
  - [ ] `tests/e2e/onboarding.spec.ts`
  - [ ] `tests/e2e/chat.spec.ts`
  - [ ] `tests/e2e/negotiation.spec.ts`
  - [ ] `tests/e2e/proposal.spec.ts`
- [ ] Perform performance optimization:
  - [ ] Optimize database queries
  - [ ] Implement caching where appropriate
  - [ ] Reduce bundle size
- [ ] Cross-browser testing:
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge
- [ ] Accessibility testing:
  - [ ] Screen reader compatibility
  - [ ] Keyboard navigation
  - [ ] Color contrast

**Testing Framework Example:**

```typescript
// e2e/negotiation.spec.ts
describe('Agent Negotiation Flow', () => {
  before(() => {
    // Set up test users and agents
  });
  
  it('should allow starting a negotiation', () => {
    // Test implementation
  });
  
  it('should allow agents to exchange messages', () => {
    // Test implementation
  });
  
  it('should detect consensus and create a proposal', () => {
    // Test implementation
  });
  
  it('should allow users to provide feedback on negotiations', () => {
    // Test implementation
  });
});
```

**Notes for implementor:**
```
Add implementation notes here, focusing on testing strategies and performance optimizations.
```

## Timeline Estimate

| Phase | Task | Estimated Duration | Dependencies | Assigned To | Status |
|-------|------|-------------------|--------------|-------------|--------|
| **Phase 1** | Chat-based Onboarding | 1-2 weeks | None | | 🔄 To Do |
| **Phase 2** | User-Agent Communication | 1-2 weeks | Phase 1 | | 🔄 To Do |
| **Phase 3** | Agent-to-Agent Negotiation | 2-3 weeks | Phase 1, 2 | | 🔄 To Do |
| **Phase 4** | Proposal Integration | 1-2 weeks | Phase 3 | | 🔄 To Do |
| **Phase 5** | UI/UX and Integration | 1-2 weeks | Phase 1-4 | | 🔄 To Do |

**Total estimated development time:** 6-11 weeks depending on development resources.

## Technical Considerations

### 1. LLM Integration

- **OpenRouter API**: Continue using the existing integration in `backend/src/services/agent-service.ts`
- **Prompt Engineering**: 
  - Create modular, reusable prompt templates in `backend/src/services/prompt-templates/`
  - Use consistent role definitions (system, user, assistant)
  - Include clear instructions and constraints in system prompts
- **Context Management**:
  - Implement message summarization to handle long conversations
  - Use chunking for long context windows
  - Maintain conversation history in database for persistence

### 2. Real-time Updates

- **Options**:
  - WebSockets: More responsive, better for chat interfaces
  - Server-Sent Events (SSE): Simpler implementation
  - Long Polling: Fallback for environments where WebSockets aren't supported
- **Implementation Recommendations**:
  - Use WebSockets for chat and negotiation updates
  - Implement reconnection logic for dropped connections
  - Create a fallback to polling if WebSockets are not available

### 3. Scalability

- **Negotiation System**:
  - Design to handle multiple concurrent negotiations
  - Implement background processing for agent responses
  - Use database transactions for critical operations
- **Data Storage**:
  - Optimize queries with appropriate indexes
  - Consider data archiving for old chat histories
  - Use pagination for message fetching

### 4. Security

- **Authentication**:
  - Ensure JWT validation on all endpoints
  - Implement proper error handling for auth failures
- **Access Control**:
  - Verify agent ownership in all operations
  - Implement role-based access where needed
  - Sanitize user input to prevent injection attacks

## Implementation Status Dashboard

### Phase 1: Chat-based Onboarding

| Task | Status | Assigned To | Started | Completed | Notes |
|------|--------|-------------|---------|-----------|-------|
| Database Schema Changes | ⚠️ Partial | | 4/23/2025 | | Migration created but not applied due to config issue |
| Chat API Endpoints | ✅ Done | | 4/23/2025 | 4/23/2025 | Implemented in backend/src/routes/chat.ts |
| Chat UI Components | ✅ Done | | 4/23/2025 | 4/23/2025 | Created ChatInterface, ChatMessage, ChatInput, and ChatHistory components |
| LLM Chat Logic | ✅ Done | | 4/23/2025 | 4/23/2025 | Implemented in agent-service.ts |
| Onboarding Replacement | ✅ Done | | 4/23/2025 | 4/23/2025 | Created OnboardingChat component and updated routing |

### Phase 2: User-Agent Communication

| Task | Status | Assigned To | Started | Completed | Notes |
|------|--------|-------------|---------|-----------|-------|
| Dashboard Chat Interface | ✅ Done | | 4/23/2025 | 4/23/2025 | Implemented AgentChatPanel and integrated with DashboardPage |
| Context Management | ✅ Done | | 4/23/2025 | 4/23/2025 | Added to chat-service.ts |
| Personalized Responses | ⚠️ Partial | | 4/23/2025 | | Basic implementation in agent-service.ts |

### Phase 3: Agent-to-Agent Negotiation

| Task | Status | Assigned To | Started | Completed | Notes |
|------|--------|-------------|---------|-----------|-------|
| Negotiation Protocol | 🔄 To Do | | | | |
| Negotiation Service | 🔄 To Do | | | | |
| Agent Representation | 🔄 To Do | | | | |
| Preference Translation | 🔄 To Do | | | | |

### Phase 4: Proposal Integration

| Task | Status | Assigned To | Started | Completed | Notes |
|------|--------|-------------|---------|-----------|-------|
| Negotiation-Proposal Connection | 🔄 To Do | | | | |
| Proposal UI Enhancements | 🔄 To Do | | | | |
| User Feedback System | 🔄 To Do | | | | |

### Phase 5: UI/UX and Integration

| Task | Status | Assigned To | Started | Completed | Notes |
|------|--------|-------------|---------|-----------|-------|
| Unified Dashboard | 🔄 To Do | | | | |
| Mobile Responsiveness | 🔄 To Do | | | | |
| Final Testing | 🔄 To Do | | | | |

## Development Workflow

### 1. Task Assignment and Tracking

- Mark tasks as "In Progress" when starting work
- Update status to "Done" when completed
- Add notes about implementation decisions or challenges

### 2. Code Review Process

- Create pull requests for each major feature
- Ensure test coverage for new code
- Follow established code style guidelines
- Document API changes

### 3. Testing Requirements

- Write unit tests for all new services
- Create integration tests for API endpoints
- Add end-to-end tests for critical flows
- Test on multiple browsers and devices

### 4. Documentation

- Update API documentation as endpoints are added
- Document LLM prompts and reasoning
- Create usage examples for new components
- Maintain this implementation plan with actual progress

## Next Steps

1. Resolve the database migration issues to apply schema changes
2. Implement prompt templates in separate files for better organization
3. Complete the agent-to-agent negotiation system (Phase 3)
4. Connect negotiations to proposals (Phase 4)
5. Finalize UI/UX and integration (Phase 5)
6. Conduct comprehensive testing of the chat-based onboarding and agent chat features

## Progress Summary (as of 4/23/2025)

We have successfully implemented the core chat functionality for the NDNE prototype:

### Completed Components:
1. **Backend Components:**
   - Chat API endpoints in routes/chat.ts
   - Chat service (chat-service.ts) for message management
   - Extended agent service with chat functionality

2. **Frontend Components:**
   - Chat UI components (ChatMessage, ChatInput, ChatHistory, ChatInterface)
   - OnboardingChat component to replace the form-based wizard
   - AgentChatPanel for dashboard integration
   - Updated App.tsx and DashboardPage.tsx to use these new components

3. **Documentation:**
   - Updated implementation plan to track progress
   - Added detailed entry in TESTING_LOG.md about the chat system implementation

All changes have been committed to the core-test branch and are ready for further development and integration.
# Implementing User-Agent Communication Enhancements
Goal: Integrate the dashboard chat panel fully, implement context awareness based on the active tab, improve agent memory through conversation summarization and knowledge extraction.

## Relevant Files:

- frontend/src/pages/DashboardPage.tsx
- frontend/src/components/AgentChatPanel.tsx
- frontend/src/context/DashboardContext.tsx
- frontend/src/hooks/useChatContext.tsx
- backend/src/services/chat-service.ts
- backend/src/services/agent-service.ts
- backend/src/services/prompt-templates/chat-prompts.ts

## Implementation Steps:

### ✅ Implement Context Sharing (DashboardContext / useChatContext):
Files: DashboardContext.tsx, useChatContext.tsx, DashboardPage.tsx
- Action: Define a clear structure within DashboardContext to hold the currentTab (string) and currentTabData (object relevant to the tab, e.g., { issues: Issue[] } or { recentActions: RecentAction[] }).
- Action: Modify handleTabChange in DashboardPage.tsx to update both currentTab state and fetch/set the relevant currentTabData in the context.   
- Action: Refine useChatContext to potentially provide more structured access to the context relevant for chat prompts (e.g., const { activeIssueTitle } = useChatContext();).

**Implementation Notes:**
- Context is passed through React's Context API, making it accessible to any component in the tree
- The system handles multiple context types (positions, activity, proposals) with different data structures
- Future extensions should follow the pattern of adding new context types and their associated data to the shared context

### ✅ Enhance AgentChatPanel Context Consumption:
File: AgentChatPanel.tsx
- Action: Use the useDashboard hook to access currentTab and currentTabData.
- Action: Modify the handleSendMessage logic (or pass context to ChatInterface -> onSendMessage) to include relevant context (currentTab, specific data like issueId if discussing an issue) in the API call to POST /api/chat/messages. The backend (processChatMessage) should use this context to tailor the LLM prompt.
- Action: Implement the renderContextualHeader (or similar) to display dynamic information based on the chatContext (e.g., "Discussing Issue: [Title]").

**Implementation Notes:**
- The contextual header provides visual feedback about what context is active
- Context data is serialized and deserialized when passed to/from the backend
- Type safety is maintained by using appropriate type assertions on both ends
- Future UI enhancements could include more interactive context-specific controls

### ✅ Implement Conversation Summarization:
File: backend/src/services/chat-service.ts
- Action: Replace the placeholder summarizeConversation function. Implement logic that uses an LLM call with a dedicated summarization prompt to condense older messages when the context retrieved by getConversationContext exceeds a token threshold. The summary should then be prepended to the more recent messages passed to the main LLM call in agent-service.ts::processChatMessage.

**Implementation Notes:**
- Summarization uses a token-based threshold (default: 3000 tokens)
- A simple heuristic of ~4 chars per token is used for estimation
- When threshold is exceeded, older messages are summarized using an LLM
- The summary is prepended as a special 'system' message for context continuity
- The token threshold can be adjusted if needed for different LLM models
- Future improvements could include more sophisticated token counting or differential summarization based on message importance

### ✅ Implement User Knowledge Extraction & Storage:
File: backend/src/services/agent-service.ts (processChatMessage)
- Action: After receiving an LLM response in processChatMessage, make a secondary, non-blocking LLM call (or refine the main prompt) to specifically extract key facts, preferences, or user goals mentioned in the latest user message and agent response.
- Action: Define a structured format for the Agent.userKnowledge JSON field (e.g., { key_topics: [], stated_preferences: [], goals: [] }).
- Action: Implement logic to merge newly extracted knowledge into the existing Agent.userKnowledge JSON blob in the database asynchronously. Avoid overly frequent database updates; perhaps batch updates or update periodically.

**Implementation Notes:**
- Knowledge extraction occurs asynchronously to not impact chat responsiveness
- The userKnowledge structure has been defined with the following fields:
  - key_topics: Main subjects user discusses or cares about
  - stated_preferences: Explicit preferences user mentioned
  - goals: User's stated objectives or desired outcomes
  - communication_style: User's evident communication preference
  - relationships: People user mentions and their relations
  - facts: Factual information about the user
- The mergeUserKnowledge function prevents duplication and limits the amount of stored data
- The extraction process uses the existing conversation context to inform the LLM
- Had to use $executeRaw for User name updates due to schema type issues
- Future enhancements could include adding more structured knowledge categories or implementing a more sophisticated knowledge graph

### ✅ Refine Agent Personalization:
Files: backend/src/services/agent-service.ts (processChatMessage), backend/src/services/prompt-templates/chat-prompts.ts
- Action: Modify the USER_FACING_PERSONA_TEMPLATE to accept and utilize the userKnowledge JSON blob. Instruct the LLM to reference this knowledge subtly to make conversations feel more continuous and personalized.
- Action: Fetch and incorporate user communication style preferences (if stored) into the system prompt.

**Implementation Notes:**
- USER_FACING_PERSONA_TEMPLATE now accepts userKnowledge as a parameter
- The template includes the extracted knowledge with an instruction to incorporate it subtly
- The communication style is extracted from userKnowledge or uses a default value
- A fallback chain is implemented for preferences: explicit setting → detected style → default
- Prompt engineering was specifically crafted to avoid direct references to stored knowledge
- Future improvements could include more sophisticated personalization based on interaction history and explicit style preferences testing

## Key Technical Considerations:

1. **Context Management**
   - Token limits are carefully managed for optimal LLM performance
   - Older messages are summarized rather than truncated to preserve context
   - The approach balances context richness with token efficiency

2. **Knowledge Structure**
   - The userKnowledge object uses arrays and categorization for organized storage
   - Deduplication logic prevents redundant information accumulation
   - Size limits are enforced for each knowledge category to prevent unlimited growth

3. **Database Integration**
   - Custom SQL queries handle cases where Prisma types are out of sync with migration state
   - Knowledge updates are optimized to minimize database writes
   - JSON field manipulation follows best practices for consistency and type safety

4. **Security and Privacy**
   - Knowledge extracted about users is only stored in their agent's preferences
   - No PII is extracted by default, but the system could be extended with PII rules if needed
   - Context passing adheres to secure data handling practices

The implemented system provides a foundation for increasingly personalized agent interactions that improve over time as the agent learns more about the user's preferences, interests, and communication style.
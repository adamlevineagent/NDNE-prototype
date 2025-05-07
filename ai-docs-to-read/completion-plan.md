NDNE MVP Development Plan: Forum Bridge Strategy
Version: 1.1 (Updated with Forum Software Selection)
Date: May 6, 2025

1. Introduction & MVP Goal

This document outlines the development plan for the Minimum Viable Product (MVP) of the NDNE (Neither Dumb Nor Evil) ecosystem.

Core MVP Goal: To create a functional prototype demonstrating that AI Praxis Agents can:
a.  Capture and understand an individual human Sov's preferences and directives via a chat interface.
b.  Represent these interests by generating content suitable for an external, standard online forum.
c.  Process information from this external forum.
d.  Report relevant findings, opportunities, or consensus points back to their Sov via the chat interface.

This MVP focuses on the core loop of Sov intent -> Agent representation -> Inter-agent communication (simulated via forum) -> Agent reporting -> Sov discernment.

2. Guiding Principles & Strategy

Leverage Existing Assets: Maximize reuse of the current prototype's robust Sov-facing components (authentication, chat UI, onboarding, preference storage).

External Forum for Agent Interaction: Utilize Discourse as the "Agent Forum." Its mature API, authentication, and clear rate limits are well-suited for AI agent interaction. This offloads the complexity of building a custom multi-agent negotiation UI and protocol for the MVP.

Focus on AI Capabilities: The primary technical challenge is the Praxis Agent's AI logic to:

Translate Sov's preferences/directives into coherent forum posts suitable for Discourse.

Parse and understand content from Discourse topics.

Summarize and present relevant information back to the Sov.

Phased Implementation:

Phase 1 (Manual Bridge): Agent AI generates forum post content; human testers manually post/read from the Discourse forum. This tests the AI's content generation and processing logic with minimal integration overhead.

Phase 2 (Programmatic Bridge): Agent backend interacts with the Discourse forum via its API for posting and reading, automating the bridge.

Simplified Scope: Defer features like Steward AIs, blockchain integration, complex economic models, and sophisticated real-time multi-agent negotiation protocols.

3. Core System Components (MVP Focus)

A. Sov-Praxis Agent Interface (Chat Hub & Dashboard)

Function: Sov's primary interaction point for defining preferences, giving directives, and receiving updates from their Praxis Agent.

Existing Code: frontend/src/pages/DashboardPage.tsx, frontend/src/components/AgentChatPanel.tsx, frontend/src/components/chat/, frontend/src/components/OnboardingChat.tsx, frontend/src/components/IssuesMatrix.tsx. Backend routes: backend/src/routes/auth.ts, chat.ts, onboarding.ts, issues.ts.

MVP Action: Primarily reuse and ensure robustness. IssuesMatrix.tsx will be key for visualizing the Sov's "Position Matrix."

B. Praxis Agent Backend Logic

Function: The "brain" of the Praxis Agent. Manages Sov preferences, interacts with LLMs, formulates Discourse forum content, processes forum input, and prepares updates for the Sov.

Existing Code: backend/src/services/agent-service.ts, chat-service.ts, llm-service.ts, stance-generator.ts, prompt-templates/. Prisma models: User, Agent (especially preferences, userKnowledge, scenarioPreferences fields).

MVP Action: Significant extension and adaptation required, particularly for Discourse API interaction and content formatting.

C. Agent Forum (Discourse Instance)

Function: The Discourse platform where Praxis Agents (acting on behalf of their Sovs) will post messages, discuss topics, and where inter-agent communication occurs for the MVP.

Existing Code: N/A (will be a new setup of Discourse).

MVP Action: Install and configure a Discourse instance.

4. Detailed Task Breakdown & Checklist

Phase 0: Setup & Foundation Review (Est. 1-2 days)
Goal: Confirm readiness of existing components and set up the Discourse forum.

[ ] Backend: Review Core Models & Auth

Task: Verify User, Agent (with preferences, userKnowledge, scenarioPreferences JSON fields), and ChatMessage Prisma models are robust and meet MVP needs for storing Sov and Agent data.

Location: backend/prisma/schema.prisma

Task: Confirm user registration (auth.ts) and authentication (requireAuth.ts) are stable.

Location: backend/src/routes/auth.ts, backend/src/middleware/requireAuth.ts

[ ] Frontend: Review Sov Interface Components

Task: Confirm OnboardingChat.tsx and its FSM logic (agent-service.ts::conductOnboardingChat) effectively capture initial Sov preferences into Agent.preferences.issuesMatrix.

Location: frontend/src/components/OnboardingChat.tsx, backend/src/services/agent-service.ts

Task: Confirm ChatInterface.tsx provides a solid foundation for Sov-Agent communication.

Location: frontend/src/components/chat/ChatInterface.tsx

Task: Confirm IssuesMatrix.tsx can display the Sov's preferences/positions effectively.

Location: frontend/src/components/IssuesMatrix.tsx

Task: Confirm AgentChatPanel.tsx within DashboardPage.tsx is a suitable container for the Sov-Agent chat.

Location: frontend/src/components/AgentChatPanel.tsx, frontend/src/pages/DashboardPage.tsx

[ ] External Forum: Setup Discourse Instance

Task: Install Discourse on a test server. Refer to official Discourse installation guides.

Architectural Note: Discourse has specific hosting requirements (Ruby on Rails, PostgreSQL, Redis). Ensure the test environment meets these. While resource-intensive for large communities, a smaller instance should be manageable for MVP testing.

Task: Basic Discourse Configuration:

Disable Direct Messages (DMs) globally (Site Settings -> disable_private_messages).

Create a few test categories (e.g., "Local Park Improvement," "Lunch Options Discussion").

Create a set of generic user accounts on Discourse (e.g., "PraxisBotAlpha," "PraxisBotBeta") via the Discourse admin panel. These will be "operated" by the Praxis Agents.

API Access: Generate an All Users API Key and an API Username (typically "system" or a dedicated bot user) from the Discourse Admin panel (Admin -> API -> Keys). Securely store these credentials in the backend .env file.

Architectural Note (API Usage): The Discourse API is comprehensive. For the MVP, focus on documented endpoints for creating topics/posts (POST /posts.json) and reading topics/posts (GET /t/{topic_id}.json, GET /c/{category_slug_or_id}.json). Avoid undocumented or internal API endpoints to ensure stability.

Phase 1: Sov-Agent Interaction & Manual Forum Bridge (MVP v0.1) (Est. 1-2 weeks)
Goal: Enable Sovs to direct their agents to generate Discourse forum content, and for agents to process manually inputted Discourse forum content, updating the Sov.

[ ] Backend: Praxis Agent - Content Formulation for Discourse Forum

Task: Extend agent-service.ts (or create forum-interaction-service.ts). Create a function generateDiscoursePostContent(agentId: string, sov_directive: string, topic_context?: string): Promise<{title?: string, body: string, category_id?: number}>.

This function will use the agent's preferences (Position Matrix from Agent.preferences.issuesMatrix) and userKnowledge.

It will leverage stance-generator.ts to determine the agent's position.

It will use adapted prompts (from prompt-templates/negotiation-prompts.ts or new ones in prompt-templates/forum-prompts.ts) to instruct the LLM (llm-service.ts) to generate the title (if new topic) and body (Markdown format, as Discourse uses) for a Discourse topic or reply. A target category_id for new topics might also be determined.

The output should be structured (e.g., JSON with title, body, category_id) suitable for copy-pasting or later API use.

Relevant Files: backend/src/services/agent-service.ts, stance-generator.ts, llm-service.ts, prompt-templates/

[ ] Backend: Praxis Agent - Processing Manually Inputted Discourse Forum Content

Task: Extend agent-service.ts (or forum-interaction-service.ts). Create a function processDiscourseContent(agentId: string, forum_text: string, source_topic_url?: string): Promise<string>.

This function will take raw Markdown text (simulating content read from a Discourse topic).

It will use an LLM to summarize, extract key points, or identify if the content is relevant to the agent's Sov's interests (based on Agent.preferences).

The output should be a summary or action proposal to be presented to the Sov.

Relevant Files: backend/src/services/agent-service.ts, llm-service.ts, prompt-templates/

[ ] Frontend: Chat Hub - Sov Directives & Agent Reporting

Task: Enhance ChatInterface.tsx and its backend connection (chat.ts route, agent-service.ts::processChatMessage).

Allow Sovs to issue commands like: /discourse_post in category "Park Ideas" title "New Swing Set Proposal" using my preferences on "Playgrounds".

When such a command is detected, processChatMessage should call generateDiscoursePostContent. The resulting structured text (title, body, category_id) should be displayed to the Sov clearly marked (e.g., "Content to post on Discourse forum in category X:\nTitle: Y\nBody: Z").

Allow Sovs to input text like: /discourse_read from Park Ideas topic "New Swing Set Proposal": "...".

When such a command is detected, processChatMessage should call processDiscourseContent. The agent's processed summary/proposal should be displayed to the Sov as a normal agent chat message.

Task: Ensure IssuesMatrix.tsx (via DashboardPage.tsx and PositionsMatrixTab.tsx) accurately reflects the Sov's preferences as they are updated through chat or onboarding.

Relevant Files: frontend/src/components/chat/ChatInterface.tsx, backend/src/routes/chat.ts, backend/src/services/agent-service.ts

[ ] Testing & Validation (Manual Bridge)

Task: Testers act as Sovs, defining preferences via onboarding/chat.

Task: Testers issue /discourse_post commands. Copy the agent-generated title/body and manually post it to the external Discourse forum using one of the generic "PraxisBot" accounts in the appropriate category.

Task: Other testers (or the same tester using a different PraxisBot account) reply to these posts on the Discourse forum.

Task: Testers copy relevant Markdown replies/topics from Discourse and feed them to their agent using the /discourse_read command.

Validation:

Is the agent-generated Discourse content (Markdown) coherent and representative of Sov's stated interests?

Can the agent process inputted Discourse Markdown text and provide a useful summary or action point to the Sov?

Does the Sov's Position Matrix (Agent.preferences.issuesMatrix) get updated correctly based on their interactions?

Phase 2: Programmatic Discourse Forum Bridge & Basic Automation (MVP v0.2) (Est. 2-3 weeks)
Goal: Automate the agent's interaction with the Discourse forum using its API.

[ ] Backend: Praxis Agent - Discourse API Integration

Task: Create a new service, backend/src/services/discourse-api-service.ts.

Implement API client logic for Discourse using the stored API Key and API Username (from .env).

Function: postToDiscourse(discourse_api_key: string, discourse_api_username: string, title: string, raw_markdown_content: string, category_id?: number, topic_id?: number /* for reply */): Promise<{success: boolean, post_url_or_id?: string, error?: string}>. (Handles both new topics and replies).

Function: readFromDiscourse(discourse_api_key: string, discourse_api_username: string, category_id?: number, topic_id?: number, last_read_post_number?: number): Promise<{success: boolean, posts?: Array<{post_id: number, post_number: number, username: string, raw_content: string, created_at: string}>, error?: string}>.

Architectural Note (Rate Limits): Discourse has documented API rate limits (e.g., user API keys default to 20 reqs/min). The discourse-api-service.ts must be designed to respect these limits, potentially implementing a request queue or delay mechanism if frequent calls are anticipated. The backend should log any 429 (Too Many Requests) errors from Discourse and implement a basic exponential backoff retry strategy.

[ ] Backend: Praxis Agent - Automated Posting & Reading

Task: Modify agent-service.ts (or forum-interaction-service.ts).

When generateDiscoursePostContent produces content, it should now also call discourse-api-service.ts::postToDiscourse using the globally configured Discourse API key/username.

Architectural Decision: For MVP, a single system-wide API key/username will be used for all agent posts to Discourse. Individual agent attribution on Discourse will be by prefixing the post with "PraxisAgent [AgentName]:".

Implement a simple polling mechanism (e.g., a BullMQ job or a simple cron-like scheduler within the backend, configured via DIGEST_FREQUENCY_HOURS in .env but running more frequently for forum polling, e.g., every 5-10 minutes) that periodically calls discourse-api-service.ts::readFromDiscourse for categories/topics the agent is "monitoring."

Architectural Decision (Agent Monitoring): Each Agent in schema.prisma will need a new JSON field, e.g., monitoredDiscourseTopics: { categoryIds: number[], topicIds: number[] }. Sovs can tell their agent, "Monitor the 'Park Ideas' category" or "Watch the 'New Swing Set' topic." The agent backend updates this field. The poller uses this to fetch relevant updates. The agent will need to keep track of the last_read_post_number for each monitored topic (perhaps stored in Agent.preferences or a new table) to avoid reprocessing old messages.

[ ] Backend: Praxis Agent - Automated Sov Update Logic

Task: When new content is fetched by readFromDiscourse, each new post's raw_content should be passed to processDiscourseContent (from Phase 1).

Task: If processDiscourseContent determines the information is relevant and requires Sov attention, the agent should automatically send a message to the Sov via the Chat Hub (persisting it via ChatMessage model).

[ ] Frontend: Minor Adjustments (If Any)

Task: Remove the /discourse_post and /discourse_read manual commands from the chat interface if they are no longer needed. The agent should now more autonomously decide when to post (based on Sov directives like "make my case on the forum") or report back.

[ ] Testing & Validation (Programmatic Bridge)

Task: Sov directs agent to engage on a Discourse topic (e.g., "Agent, please argue for X on the 'Park Improvement' forum thread").

Task: Verify the agent correctly posts to the Discourse forum via API, prefixed with its name.

Task: Manually (or with another agent) post replies on the Discourse forum.

Task: Verify the agent reads these replies via API and, if relevant, informs the Sov via the Chat Hub.

Validation:

Does the end-to-end loop (Sov -> Agent -> Discourse -> Agent -> Sov) function with API automation?

Are Discourse API credentials managed securely (via .env and passed, not stored directly in agent records)?

Is forum reading/posting reliable and respectful of rate limits?

Phase 3: Refinement & MVP Release Candidate (Est. 1 week)
Goal: Polish the core loop, improve AI quality, and prepare for wider testing.

[ ] AI: Prompt Engineering & Logic Refinement

Task: Iterate on LLM prompts in prompt-templates/ for better quality Discourse posts (Markdown formatting, persuasive arguments, appropriate tone for public forum) and more insightful processing of forum content.

Task: Improve the agent's logic for deciding what topics/posts on Discourse are relevant to its Sov and when to update the Sov. This includes refining the summarization from processDiscourseContent.

[ ] UI/UX: Polish Chat Hub & Positions Matrix

Task: Ensure the Sov-Agent chat is clear and intuitive, especially when presenting information sourced from the forum.

Task: Ensure the IssuesMatrix.tsx (Positions Matrix) display is easy for the Sov to understand and accurately reflects their current preferences.

[ ] Testing: End-to-End Scenarios

Task: Define 3-5 key E2E scenarios representing common use cases (e.g., Sov wants to advocate for a specific feature, Sov wants to find out community sentiment on a topic, Sov is notified of a relevant discussion and decides to participate).

Task: Conduct thorough testing of these E2E scenarios.

[ ] Documentation: Basic Developer & Tester Guides

Task: Document the setup for the Discourse forum instance, including API key generation and category setup.

Task: Document how to run the MVP and test the core loop, including how agents monitor topics.

5. Key Code Locations (Primary Focus for MVP)

Sov-Agent Chat & Onboarding (Frontend):

frontend/src/components/OnboardingChat.tsx

frontend/src/components/chat/ChatInterface.tsx (and related ChatMessage.tsx, ChatInput.tsx, ChatHistory.tsx)

frontend/src/components/IssuesMatrix.tsx

frontend/src/pages/DashboardPage.tsx (as container)

frontend/src/context/AuthContext.tsx, DashboardContext.tsx, ChatContext.tsx

Sov-Agent Chat & Onboarding (Backend):

backend/src/routes/chat.ts

backend/src/routes/onboarding.ts

backend/src/routes/issues.ts (for displaying matrix)

backend/src/services/agent-service.ts (especially conductOnboardingChat, processChatMessage)

backend/src/services/chat-service.ts

backend/src/services/llm-service.ts

backend/src/services/prompt-templates/ (onboarding and chat prompts)

backend/prisma/schema.prisma (Models: User, Agent, ChatMessage, ExampleProposal, ExampleUserArchetype)

Praxis Agent Forum Interaction Logic (Backend - New & Extended):

backend/src/services/agent-service.ts (or new forum-interaction-service.ts)

backend/src/services/stance-generator.ts

backend/src/services/llm-service.ts

backend/src/services/prompt-templates/ (negotiation/forum prompts)

backend/src/services/discourse-api-service.ts (New - for Discourse API integration)

Polling mechanism (e.g., BullMQ job or cron-like scheduler)

Existing Negotiation/Proposal Logic (Primarily for Reference/Adaptation):

backend/src/routes/negotiation.ts & proposal.ts

backend/src/services/negotiation-service.ts, negotiation-to-proposal.ts

backend/prisma/schema.prisma (Models: NegotiationSession, NegotiationMessage, Proposal, Vote, Comment) - These define structures that might inform how agents should format their Discourse posts if simulating a structured debate.

6. Out of Scope for this MVP

Decentralized Steward AIs and complex governance protocols.

On-chain blockchain integration (identity, timestamping, tokens).

Sophisticated economic models (PRX/REP tokens).

Real-time, direct agent-to-agent messaging UI (Discourse forum is the proxy). WebSockets for NDNE backend to frontend for Sov notifications are also out of scope for MVP; Sovs will see updates when they interact with chat or the dashboard refreshes.

Advanced, proactive opportunity discovery by agents beyond basic topic/category monitoring.

Full implementation of all dashboard tabs (Activity Audit, Proposals tab beyond basic display). Focus is on Positions Matrix and Chat Hub.

Formalized "Business Suit" persona beyond prompt engineering for forum posts.

7. Areas of Ambiguity / Further Architectural Definition Required

Discourse API Stability for Agents: While generally robust, the development team should confirm that the specific API endpoints chosen for agent interaction are considered stable and public by Discourse, not internal-facing ones that might change. Decision: Stick to documented public API endpoints.

Discourse Rate Limit Nuances: While Discourse documents its rate limits, the practical impact on a fleet of AI agents (even in MVP scale) needs to be monitored. The discourse-api-service.ts should include robust error handling for 429 responses and potentially a backoff/retry strategy. Decision: Implement basic exponential backoff for 429s.

Agent "Monitoring" Strategy for Forum Topics: The initial plan suggests agents monitor hardcoded categories or categories based on broad Sov interests. A more sophisticated mechanism for how agents discover and decide to "watch" specific Discourse topics will be needed for future versions but is out of scope for this MVP. MVP Decision: Agent model in schema.prisma will store monitoredDiscourseCategoryIds: number[] and monitoredDiscourseTopicIds: number[]. Sovs instruct agents via chat to monitor/unmonitor. Backend updates these fields. Poller uses these.

Agent Identity on Discourse: While generic "PraxisBot" accounts will be used on Discourse, the NDNE system needs to know which Discourse account corresponds to which Praxis Agent if agents were to use individual Discourse accounts. MVP Decision: A single system-wide Discourse API Key/Username will be used. Posts made by NDNE agents will be programmatically prefixed with "PraxisAgent [AgentName]:" for attribution within the post body.

Webhook Usage (Post-MVP): Discourse offers native webhooks. While not critical for this MVP's polling approach, future iterations could leverage webhooks for more real-time updates from the forum to the NDNE backend, reducing polling load. This is an area for an architect agent to explore post-MVP. Decision: Polling is sufficient for MVP.

Error Handling for Forum Interactions: Define how the Praxis Agent reports failures in posting to or reading from Discourse back to the Sov. Decision: Agent should inform the Sov via chat if it fails to post to Discourse after retries, or if it encounters persistent errors reading from Discourse.

Scalability of Polling: For the MVP with a limited number of agents and monitored topics, direct polling by each agent's logic (or a central poller iterating through agents) is feasible. For larger scale, a more distributed or event-driven approach (like webhooks) would be necessary. Decision: Centralized poller in backend, iterating through agents and their monitored topics/categories, is sufficient for MVP.

This plan provides a clear path to a functional MVP that tests the core hypothesis of NDNE with a significantly reduced initial development burden.
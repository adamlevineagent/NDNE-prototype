# NDNE Phase 3 Documentation Plan

This plan outlines the structure and content for the comprehensive developer and tester documentation for the NDNE prototype.

## I. Overall Structure

The documentation will be organized into a main directory (e.g., `ndne-documentation/`) with subdirectories for each major guide:

```
ndne-documentation/
├── README.md                   (Overview and links to guides)
├── developer-guide/
│   ├── 01-system-architecture.md
│   ├── 02-component-descriptions.md
│   ├── 03-setup-instructions.md
│   ├── 04-code-organization.md
│   └── 05-extension-guidelines.md
├── tester-guide/
│   ├── 01-testing-environment-setup.md
│   ├── 02-test-data-setup.md
│   ├── 03-manual-testing-procedures.md
│   ├── 04-automated-testing.md
│   └── 05-common-issues-solutions.md
├── api-documentation/
│   ├── 01-backend-frontend-api.md
│   └── 02-discourse-interaction-api.md
├── configuration-guide/
│   ├── 01-environment-variables.md
│   ├── 02-configuration-options.md
│   └── 03-deployment-options.md
└── assets/                     (For diagrams, images)
    └── system-architecture-overview.png
```

## II. Content Details

### A. `README.md` (Root)
*   Brief introduction to the NDNE prototype and the purpose of this documentation.
*   Links to each of the main guides (Developer, Tester, API, Configuration).

### B. Developer Guide (`developer-guide/`)

1.  **`01-system-architecture.md`**
    *   **High-Level Overview:**
        *   Based on [`ai-docs-to-read/ndne-vision-purpose.md`](ai-docs-to-read/ndne-vision-purpose.md).
        *   Diagram: A high-level block diagram showing Sovs, Praxis Agents, Backend Services (Agent Service, Forum Interaction Service, LLM Service, Discourse API Service), Frontend, Discourse Forum, and Database (PostgreSQL, Redis).
            ```mermaid
            graph LR
                User[Sov/User] -- Interacts via --> Frontend
                Frontend -- API Calls --> BackendServices[Backend Services]
                BackendServices -- Manages/Interacts --> PraxisAgent[Praxis Agents]
                PraxisAgent -- Represents Sov in --> DiscourseForum[Discourse Forum]
                BackendServices -- API Calls --> DiscourseForum
                BackendServices -- Stores/Retrieves Data --> Database[(Database: PostgreSQL & Redis)]

                subgraph Backend Services
                    AgentService[Agent Service]
                    ForumInteractionService[Forum Interaction Service]
                    LLMService[LLM Service]
                    DiscourseApiService[Discourse API Service]
                    APIRoutes[API Routes]
                end

                AgentService -- Uses --> LLMService
                ForumInteractionService -- Uses --> LLMService
                ForumInteractionService -- Uses --> DiscourseApiService
                APIRoutes -- Utilize --> AgentService
                APIRoutes -- Utilize --> ForumInteractionService
            ```
    *   **Key Principles:** Briefly reiterate NDNE principles relevant to developers (e.g., Representational Primacy, Transparency in Forum, Sov Privacy).

2.  **`02-component-descriptions.md`**
    *   **Frontend:**
        *   Purpose: User interface for Sovs to interact with their Praxis Agents, manage preferences, and view forum activity.
        *   Technology: React, Vite, TypeScript.
        *   Key Directories/Files: [`frontend/src/`](frontend/src/), [`frontend/src/App.tsx`](frontend/src/App.tsx), [`frontend/src/main.tsx`](frontend/src/main.tsx), [`frontend/src/api/apiClient.ts`](frontend/src/api/apiClient.ts), [`frontend/src/pages/`](frontend/src/pages/), [`frontend/src/components/`](frontend/src/components/).
    *   **Backend Services:**
        *   **Agent Service ([`backend/src/services/agent-service.ts`](backend/src/services/agent-service.ts)):**
            *   Manages Praxis Agent lifecycle, preferences, and core logic.
            *   Handles chat interactions between Sov and Agent.
            *   Orchestrates agent onboarding (FSM logic).
            *   Interacts with LLM for decision-making, content generation, and knowledge extraction.
        *   **Forum Interaction Service ([`backend/src/services/forum-interaction-service.ts`](backend/src/services/forum-interaction-service.ts)):**
            *   Generates content for Discourse posts/replies using LLM.
            *   Processes and analyzes content retrieved from Discourse.
            *   Manages agent monitoring of Discourse topics/categories.
            *   Uses `DiscourseApiService` for actual Discourse communication.
        *   **Discourse API Service ([`backend/src/services/discourse-api-service.ts`](backend/src/services/discourse-api-service.ts) & [`discourse/API_INTEGRATION.md`](discourse/API_INTEGRATION.md)):**
            *   Wrapper for Discourse API calls (creating posts, reading topics/posts).
            *   Handles API key authentication and rate limiting (backoff).
        *   **LLM Service ([`backend/src/services/llm-service.ts`](backend/src/services/llm-service.ts) & relevant parts of [`backend/src/services/agent-service.ts`](backend/src/services/agent-service.ts)):**
            *   Provides interface for calling Large Language Models (OpenRouter).
            *   Handles prompt formatting and API requests to LLM.
            *   Includes logging of LLM usage (as seen in `agent-service.ts`).
        *   **Forum Polling Service ([`backend/src/services/forum-polling-service.ts`](backend/src/services/forum-polling-service.ts) & [`backend/src/index.ts`](backend/src/index.ts)):**
            *   Periodically checks monitored Discourse topics/categories for new activity.
            *   Triggers processing of new content via `ForumInteractionService` and `AgentService`.
        *   **API Routes ([`backend/src/routes/`](backend/src/routes/) directory, summarized from [`backend/src/index.ts`](backend/src/index.ts)):**
            *   Defines RESTful endpoints for frontend-backend communication (auth, agents, chat, forum, etc.).
    *   **Databases:**
        *   **PostgreSQL:** Primary relational database for persistent storage (users, agents, preferences, forum metadata, etc.). Schema defined in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).
        *   **Redis:** Used for caching, session management, or queueing.
    *   **Discourse Forum:**
        *   External forum platform used for Praxis Agent interactions.
        *   Integration managed via `DiscourseApiService` and `ForumInteractionService`.
    *   **Data Flow Diagram:**
        ```mermaid
        sequenceDiagram
            participant User
            participant Frontend
            participant BackendAPI as Backend API Routes
            participant AgentService as Agent Service
            participant ForumInteractionSvc as Forum Interaction Service
            participant LLMSvc as LLM Service
            participant DiscourseAPISvc as Discourse API Service
            participant DiscourseForum as Discourse Forum
            participant DB as Database (Postgres/Redis)

            User->>Frontend: Interact (e.g., send chat message)
            Frontend->>BackendAPI: POST /api/chat/messages
            BackendAPI->>AgentService: processChatMessage()
            AgentService->>DB: Get Agent Preferences & Context
            AgentService->>LLMSvc: Generate Agent Response
            LLMSvc-->>AgentService: LLM Response
            AgentService->>DB: Save Conversation
            AgentService-->>BackendAPI: Agent Response
            BackendAPI-->>Frontend: Agent Response
            Frontend-->>User: Display Response

            User->>Frontend: Directive to post to forum
            Frontend->>BackendAPI: POST /api/forum/post-directive
            BackendAPI->>AgentService: processForumDirective()
            AgentService->>ForumInteractionSvc: generateDiscoursePostContent()
            ForumInteractionSvc->>LLMSvc: Generate Post Body
            LLMSvc-->>ForumInteractionSvc: Post Body
            ForumInteractionSvc->>DiscourseAPISvc: postToDiscourse()
            DiscourseAPISvc->>DiscourseForum: Create Post API Call
            DiscourseForum-->>DiscourseAPISvc: API Response
            DiscourseAPISvc-->>ForumInteractionSvc: Result
            ForumInteractionSvc-->>AgentService: Result
            AgentService-->>BackendAPI: Result
            BackendAPI-->>Frontend: Confirmation
            Frontend-->>User: Confirmation

            Note over DiscourseForum, DB: Forum Polling Service (Backend) periodically checks Discourse via DiscourseAPISvc, processes new content via ForumInteractionSvc & AgentService, may notify User via AgentService & Chat.
        ```

3.  **`03-setup-instructions.md`**
    *   **Prerequisites:** Node.js, Docker, Docker Compose, Git.
    *   **Cloning the Repository:** `git clone <repository_url>`
    *   **Environment Setup:**
        *   Copy [`backend/.env.example`](backend/.env.example) to `backend/.env`.
        *   Fill in required variables: `DB_URL` (usually handled by Docker Compose), `REDIS_URL` (handled by Docker Compose), `JWT_SECRET`, `OPENROUTER_API_KEY`.
        *   Configure Discourse variables: `DISCOURSE_URL`, `DISCOURSE_API_KEY`, `DISCOURSE_API_USERNAME`. (Refer to [`discourse/INSTALLATION.md`](discourse/INSTALLATION.md) and [`discourse/NDNE_CONFIGURATION.md`](discourse/NDNE_CONFIGURATION.md) for setting up a Discourse instance if needed).
    *   **Running the Application (Docker Compose):**
        *   From the project root: `docker-compose up --build -d` (as per [`docker-compose.yml`](docker-compose.yml)).
        *   Expected services: `postgres`, `redis`, `backend`, `frontend`.
        *   Access points: Frontend at `http://localhost:5173`, Backend at `http://localhost:4000`.
    *   **Database Initialization:**
        *   Running migrations: `docker-compose exec backend npx prisma migrate dev`
        *   Seeding data (if applicable, e.g., from [`backend/prisma/seed.ts`](backend/prisma/seed.ts)): `docker-compose exec backend npx prisma db seed`
    *   **Manual Setup (Alternative, if not using Docker for everything):**
        *   Instructions for setting up PostgreSQL and Redis manually.
        *   Running backend: `cd backend && npm install && npm run dev`.
        *   Running frontend: `cd frontend && npm install && npm run dev`.

4.  **`04-code-organization.md`**
    *   **Root Directory Structure:**
        *   `ai-docs-to-read/`: Project documentation and vision.
        *   `backend/`: Node.js backend application.
        *   `discourse/`: Documentation related to Discourse setup and integration.
        *   `frontend/`: React frontend application.
        *   `docker-compose.yml`: Defines services for local development.
        *   Other config files (`.eslintrc.js`, `.prettierrc`, etc.).
    *   **Backend (`backend/src/`) Structure:**
        *   `index.ts`: Main application entry point, middleware, route setup.
        *   `middleware/`: Express middleware (auth, error handling).
        *   `routes/`: API route definitions.
        *   `services/`: Core business logic (Agent, Forum Interaction, LLM, Discourse API, etc.).
            *   `prompt-templates/`: Stores prompt structures for LLM interactions.
        *   `utils/`: Utility functions (logger).
        *   `prisma/`: Database schema, migrations, seed scripts.
        *   `tests/`: Backend tests.
    *   **Frontend (`frontend/src/`) Structure:**
        *   `main.tsx`: Application entry point.
        *   `App.tsx`: Root component, routing setup.
        *   `api/`: API client for backend communication.
        *   `components/`: Reusable UI components.
        *   `pages/`: Top-level page components.
        *   `context/`: React context providers.
        *   `hooks/`: Custom React hooks.
        *   `cypress/`: E2E tests.
    *   **Important Files (Recap with links):**
        *   [`docker-compose.yml`](docker-compose.yml)
        *   [`backend/.env.example`](backend/.env.example)
        *   [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)
        *   [`backend/src/index.ts`](backend/src/index.ts)
        *   [`backend/src/services/agent-service.ts`](backend/src/services/agent-service.ts)
        *   [`backend/src/services/forum-interaction-service.ts`](backend/src/services/forum-interaction-service.ts)
        *   [`frontend/src/api/apiClient.ts`](frontend/src/api/apiClient.ts)

5.  **`05-extension-guidelines.md`**
    *   **Adding a new API Endpoint:**
        *   Define route in a relevant file in [`backend/src/routes/`](backend/src/routes/).
        *   Implement service logic in [`backend/src/services/`](backend/src/services/).
        *   Add corresponding API call in [`frontend/src/api/apiClient.ts`](frontend/src/api/apiClient.ts).
        *   Create frontend components/pages to use the new endpoint.
    *   **Modifying Agent Behavior:**
        *   Primarily in [`backend/src/services/agent-service.ts`](backend/src/services/agent-service.ts).
        *   Adjust LLM prompts in [`backend/src/services/prompt-templates/`](backend/src/services/prompt-templates/).
    *   **Changing Forum Interaction:**
        *   Logic in [`backend/src/services/forum-interaction-service.ts`](backend/src/services/forum-interaction-service.ts).
        *   Discourse API calls in [`backend/src/services/discourse-api-service.ts`](backend/src/services/discourse-api-service.ts).
    *   **Updating Database Schema:**
        *   Modify [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).
        *   Run `npx prisma migrate dev --name <migration_name>` (inside backend container or locally).
        *   Update seed script [`backend/prisma/seed.ts`](backend/prisma/seed.ts) if necessary.
    *   **Coding Standards:** Refer to ESLint ([`.eslintrc.js`](./.eslintrc.js)) and Prettier ([`.prettierrc`](./.prettierrc)) configurations.
    *   **Contribution Workflow (General):** (e.g., Fork, Branch, Code, Test, PR, Review, Merge).

### C. Tester Guide (`tester-guide/`)

1.  **`01-testing-environment-setup.md`**
    *   Same as Developer Setup: Docker, Docker Compose.
    *   Ensure Discourse instance is running and configured as per `backend/.env`.
    *   Access points: Frontend `http://localhost:5173`.

2.  **`02-test-data-setup.md`**
    *   **Creating Test Users:**
        *   Register via frontend UI.
        *   Alternatively, use database seeding if available (e.g., via [`backend/prisma/seed.ts`](backend/prisma/seed.ts) and `docker-compose exec backend npx prisma db seed`).
    *   **Creating Test Agents & Preferences:**
        *   Onboarding flow: Complete the onboarding steps for a new user via the UI. This will create an agent and populate initial preferences. Refer to the FSM in [`backend/src/services/agent-service.ts`](backend/src/services/agent-service.ts) (`conductOnboardingChat` function) for steps.
        *   Manual DB manipulation (for advanced testing): Directly modify agent preferences in the `Agent` table (JSON `preferences` field) in PostgreSQL.
    *   **Setting up Discourse Test Content:**
        *   Manually create categories and topics in the linked Discourse instance.
        *   Post messages as different users in Discourse to simulate forum activity for polling and processing tests.

3.  **`03-manual-testing-procedures.md`**
    *   **User Onboarding:**
        *   Verify all steps of the onboarding flow (agent name, issue selection, stance, priority, deal-breakers, color, notification, proposal idea) as per the FSM in `agent-service.ts`.
        *   Check if preferences are saved correctly (can be verified via chat interactions or DB inspection).
    *   **Chat Functionality:**
        *   Test sending messages to the agent.
        *   Verify agent responses are coherent and reflect learned preferences.
        *   Test knowledge extraction (agent remembers information from chat).
    *   **Forum Interaction (via Agent Directives):**
        *   Direct agent to post a new topic to Discourse.
        *   Direct agent to reply to an existing Discourse topic.
        *   Verify posts appear correctly in Discourse with agent attribution.
    *   **Forum Content Processing (Polling):**
        *   Create new posts/replies in a monitored Discourse topic.
        *   Wait for polling interval (or trigger manually if possible).
        *   Verify agent processes new content and notifies Sov if relevant (via chat).
    *   **Agent Preference Updates:**
        *   Test updating agent preferences via UI (if available) or chat commands.
        *   Verify changes in agent behavior based on updated preferences.

4.  **`04-automated-testing.md`**
    *   **Frontend E2E Tests (Cypress):**
        *   Location: [`frontend/cypress/e2e/`](frontend/cypress/e2e/)
        *   Files found: [`dashboard.cy.ts`](frontend/cypress/e2e/dashboard.cy.ts), [`negotiation.cy.ts`](frontend/cypress/e2e/negotiation.cy.ts), [`onboarding.cy.ts`](frontend/cypress/e2e/onboarding.cy.ts).
        *   **Note on Relevance:**
            *   The [`onboarding.cy.ts`](frontend/cypress/e2e/onboarding.cy.ts) test, which covers user preference setup, appears largely relevant to the current architecture.
            *   Tests like [`negotiation.cy.ts`](frontend/cypress/e2e/negotiation.cy.ts) that might have covered pre-forum system interactions are likely outdated due to the architectural shift to Discourse.
            *   All E2E tests should be thoroughly reviewed and updated to reflect the current forum-based interaction model.
        *   How to run: Typically `npx cypress open` or a similar command (e.g., `npm run cypress:open` if defined in a relevant `package.json`). Advise to confirm the exact command with the development team, as it's not in [`frontend/package.json`](frontend/package.json).
    *   **Backend Unit/Integration Tests (Jest):**
        *   Location: [`backend/src/tests/`](backend/src/tests/)
        *   Files found: [`agent-service.spec.ts`](backend/src/tests/agent-service.spec.ts), [`commentTone.spec.ts`](backend/src/tests/commentTone.spec.ts), [`negotiation-reaction.spec.ts`](backend/src/tests/negotiation-reaction.spec.ts).
        *   **Note on Relevance:** These tests should be reviewed to ensure they align with the current architecture, especially after the shift to a forum-based system. `agent-service.spec.ts` is likely still important.
        *   How to run: `npm test` in the `backend` directory (as per [`backend/package.json`](backend/package.json)).
    *   **Adding New Tests:**
        *   Guidance on where to add new Cypress tests for frontend.
        *   Guidance on where to add new Jest tests for backend.

5.  **`05-common-issues-solutions.md`**
    *   **Backend not starting:** Check `.env` file, Docker logs (`docker-compose logs backend`).
    *   **Frontend not connecting to backend:** Verify backend is running, CORS settings in `backend/.env` and [`backend/src/index.ts`](backend/src/index.ts).
    *   **Discourse integration issues:**
        *   Verify `DISCOURSE_URL`, `DISCOURSE_API_KEY`, `DISCOURSE_API_USERNAME` in `backend/.env`.
        *   Check Discourse API key permissions and that the API user exists.
        *   Inspect backend logs for errors from `DiscourseApiService`.
    *   **LLM errors:** Check `OPENROUTER_API_KEY`, OpenRouter account status, backend logs for errors from `LLMService` or `AgentService`.
    *   **Database connection errors:** Check `DB_URL`, PostgreSQL container status.
    *   **Polling service not working:** Check Discourse config, backend logs for `ForumPollingService`.

### D. API Documentation (`api-documentation/`)

1.  **`01-backend-frontend-api.md`**
    *   Introduction: Explains how the frontend communicates with the backend. Base URL: `http://localhost:4000/api`. Authentication: JWT Bearer token.
    *   List all endpoints based on [`frontend/src/api/apiClient.ts`](frontend/src/api/apiClient.ts) and backend route definitions in [`backend/src/routes/`](backend/src/routes/) (cross-referenced from [`backend/src/index.ts`](backend/src/index.ts)).
    *   For each endpoint:
        *   **Purpose:** Brief description.
        *   **HTTP Method & Path:** e.g., `POST /auth/login`.
        *   **Request Parameters/Body:** (if any) with types and descriptions.
        *   **Response Format:** Example JSON response, description of fields.
        *   **Example Usage (Conceptual):** How it's used by the frontend.
    *   **Endpoint Groups (from `apiClient.ts`):**
        *   Auth (`/auth`): `register`, `login`, `getUser (/me)`.
        *   Agents (`/agents`): `getAgent (/me)`, `updatePreferences (/me/preferences)`, `pauseAgent (/me/pause)`, `feedback (/:agentId/feedback)`.
        *   Proposals (`/proposals`): `getAll`, `getById`, `create`, `vote`, `withdraw`.
        *   Comments (`/comments`): `create`.
        *   Onboarding (`/onboarding`): `saveStep (/steps/:step)`.
        *   Chat (`/chat`): `sendMessage (/messages)`, `getMessages (/messages)`, `getMessage (/:id)`, `deleteMessage (/:id)`.
        *   Negotiations (`/negotiations`): `getAll`, `getById`, `create`, `getMessages (/:negotiationId/messages)`, `postMessage (/:negotiationId/messages)`, `addReaction`, `removeReaction`.
        *   Keys (`/keys`)
        *   Admin (`/admin`)
        *   Issues (`/issues`)
        *   Forum (`/forum`) - specific endpoints for agent directives related to forum.

2.  **`02-discourse-interaction-api.md`**
    *   Focus on how the NDNE backend interacts with the external Discourse API.
    *   Based on [`discourse/API_INTEGRATION.md`](discourse/API_INTEGRATION.md) and [`backend/src/services/discourse-api-service.ts`](backend/src/services/discourse-api-service.ts).
    *   **Authentication:** API Key and Username (`DISCOURSE_API_KEY`, `DISCOURSE_API_USERNAME`).
    *   **Key Discourse API Endpoints Used by NDNE:**
        *   `POST /posts.json`: Creating new topics or replies.
            *   Parameters: `raw` (content), `title` (for new topics), `category` (for new topics), `topic_id` (for replies).
        *   `GET /t/{topic_id}.json`: Reading posts from a topic.
        *   `GET /c/{category_id_or_slug}.json`: Reading topics from a category.
    *   **Rate Limiting:** Mention Discourse rate limits and the backoff strategy in `DiscourseApiService`.
    *   **Data Flow:** Explain how `ForumInteractionService` uses `DiscourseApiService` to abstract these calls.

### E. Configuration Guide (`configuration-guide/`)

1.  **`01-environment-variables.md`**
    *   List all environment variables from [`backend/.env.example`](backend/.env.example).
    *   For each variable:
        *   Name (e.g., `DB_URL`).
        *   Purpose/Description.
        *   Example Value.
        *   Required/Optional.
    *   Categorize them: Database, Redis, Auth, CORS, API Keys (OpenRouter), Discourse API, Forum Polling.

2.  **`02-configuration-options.md`**
    *   **LLM Configuration:**
        *   Default model (`OPENROUTER_DEFAULT_MODEL` in `agent-service.ts` - note: this should ideally be in `.env.example` or clearly documented if it's a hardcoded default that can be overridden by an env var not listed).
        *   Temperature, max tokens (configurable per call, but defaults exist).
    *   **Forum Polling:**
        *   `DISCOURSE_POLL_INTERVAL_MINUTES`
        *   `DISCOURSE_POLL_BATCH_SIZE`
        *   `DISCOURSE_MAX_POSTS_PER_POLL`
    *   **CORS Origins:** `CORS_ORIGINS`.
    *   Any other application-level settings not covered by env vars (e.g., hardcoded values that might be configurable in future).

3.  **`03-deployment-options.md`**
    *   **Docker Compose (Development/Testing):**
        *   Primary method described in [`docker-compose.yml`](docker-compose.yml).
        *   Overview of services (`postgres`, `redis`, `backend`, `frontend`).
    *   **Production Deployment Considerations (General):**
        *   Using managed database services (e.g., AWS RDS, Google Cloud SQL).
        *   Using managed Redis services.
        *   Container orchestration (Kubernetes, Docker Swarm, ECS).
        *   Setting up a reverse proxy (Nginx, Traefik) for SSL and load balancing.
        *   Environment variable management in production (secrets management).
        *   Persistent storage for Docker volumes in production.
        *   Scaling backend and frontend services.

## III. Recommendations for Maintaining Documentation
*   **Documentation as Code:** Keep documentation in Markdown within the repository.
*   **Review Process:** Include documentation updates as part of the PR review process for new features or significant changes.
*   **Regular Audits:** Periodically review documentation for accuracy and completeness, especially after major releases.
*   **Assign Ownership:** Consider assigning owners to different sections of the documentation.
*   **Automated Checks:** If possible, use linters for Markdown.
*   **Link Checking:** Periodically check for broken links.
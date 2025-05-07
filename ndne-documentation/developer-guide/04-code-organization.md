# NDNE Code Organization

This document describes the organization of the NDNE codebase, highlighting key directories and files to help developers understand the project structure.

## Root Directory Structure

The NDNE prototype repository is organized into several top-level directories, each serving a specific purpose:

```
/
├── ai-docs-to-read/        # Project documentation and vision
├── backend/                # Node.js backend application
├── discourse/              # Documentation for Discourse setup and integration
├── frontend/               # React frontend application
├── docker-compose.yml      # Docker Compose configuration for local development
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier code formatting configuration
└── ...                     # Other configuration files
```

## Backend Structure (`backend/`)

The backend is a Node.js application built with Express, Prisma ORM, and TypeScript.

```
backend/
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma       # Prisma schema definition
│   ├── migrations/         # Database migrations
│   └── seed.ts             # Database seeding script
├── scripts/                # Utility scripts
│   └── seed-test-agent.ts  # Script for seeding test agents
├── src/                    # Source code
│   ├── index.ts            # Main application entry point
│   ├── middleware/         # Express middleware
│   ├── routes/             # API route definitions
│   ├── services/           # Core business logic
│   ├── utils/              # Utility functions
│   └── tests/              # Backend tests
├── package.json            # NPM dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

### Key Backend Files

- **`src/index.ts`**: The main entry point for the backend application. It sets up the Express server, connects to the database, configures middleware, and initializes routes.

- **`src/services/`**: Contains the core business logic of the application, organized by domain:
  - `agent-service.ts`: Manages Praxis Agent behavior and interactions
  - `forum-interaction-service.ts`: Handles forum content generation and processing
  - `discourse-api-service.ts`: Provides an interface to the Discourse API
  - `forum-polling-service.ts`: Periodically checks for forum updates
  - `llm-service.ts`: Wraps LLM API calls
  - `prompt-templates/`: Contains LLM prompt templates for different features

- **`src/routes/`**: Defines API endpoints organized by feature:
  - `auth.ts`: Authentication endpoints (login, register)
  - `forum.ts`: Forum interaction endpoints
  - `chat.ts`: Chat message endpoints
  - And others for various features

- **`prisma/schema.prisma`**: Defines the database schema using Prisma's schema language. This is the authoritative source for all database models and relationships.

## Frontend Structure (`frontend/`)

The frontend is a React application built with TypeScript, using Vite as the build tool.

```
frontend/
├── src/                    # Source code
│   ├── api/                # API client for backend communication
│   ├── components/         # Reusable UI components
│   │   ├── chat/           # Chat-related components
│   │   ├── forum/          # Forum-related components
│   │   └── ...             # Other component categories
│   ├── pages/              # Top-level page components
│   ├── context/            # React context providers
│   ├── hooks/              # Custom React hooks
│   ├── main.tsx            # Application entry point
│   └── App.tsx             # Root component
├── public/                 # Static assets
├── index.html              # HTML entry point
├── package.json            # NPM dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration
```

### Key Frontend Files

- **`src/main.tsx`**: The entry point for the React application, which renders the root App component.

- **`src/App.tsx`**: The root component that sets up routing and global providers.

- **`src/api/apiClient.ts`**: Client for communicating with the backend API, defining all available API endpoints and how to call them.

- **`src/components/`**: Reusable UI components organized by feature:
  - `chat/`: Components for the chat interface
  - `forum/`: Components for forum interactions
  - And others for various parts of the UI

## Discourse Integration (`discourse/`)

The `discourse/` directory contains documentation and configuration for integrating with Discourse:

```
discourse/
├── API_INTEGRATION.md      # Documentation on API integration
├── INSTALLATION.md         # Instructions for installing Discourse
├── NDNE_CONFIGURATION.md   # NDNE-specific Discourse configuration
├── README.md               # Overview of Discourse integration
└── docker-compose.yml      # Docker Compose setup for Discourse
```

## Database Schema

The database schema is defined in `backend/prisma/schema.prisma` and includes models for:

- **User**: User accounts and authentication
- **Agent**: Praxis Agent configuration and preferences
- **ChatMessage**: Message history between Users and Agents
- **AuditLog**: System events logging

Here's a simplified overview of the key models:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  password  String
  role      String   @default("USER")
  agent     Agent?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Agent {
  id                   String   @id @default(uuid())
  userId               String   @unique
  name                 String   @default("Praxis Agent")
  color                String?
  onboardingCompleted  Boolean  @default(false)
  preferences          Json?
  monitoredDiscourseTopics Json?
  user                 User     @relation(fields: [userId], references: [id])
  messages             ChatMessage[]
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

model ChatMessage {
  id        String   @id @default(uuid())
  content   String
  role      String   // "user" or "agent"
  agentId   String
  userId    String
  metadata  Json?
  agent     Agent    @relation(fields: [agentId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## API Structure

The backend API is organized around RESTful principles, with the following main endpoint groups:

- **/auth**: Authentication endpoints (`login`, `register`, etc.)
- **/agents**: Agent management endpoints
- **/chat**: Chat messaging endpoints
- **/forum**: Forum interaction endpoints

## Important Implementation Patterns

### Dependency Injection

Many services use dynamic imports to avoid circular dependencies. For example:

```typescript
// Import dynamically to avoid circular dependencies
const chatService = await import('./chat-service');
```

### Service Pattern

The backend follows a service-oriented architecture, where business logic is encapsulated in service modules that are called by route handlers.

### Environment Configuration

Environment variables are used for configuration, with defaults defined in code:

```typescript
const POLL_INTERVAL_MINUTES = parseInt(process.env.DISCOURSE_POLL_INTERVAL_MINUTES || '15', 10);
```

### Error Handling

A centralized error handling middleware captures and formats errors:

```typescript
app.use(errorHandler);
```

## Testing Architecture

- **Backend Tests**: Located in `backend/src/tests/`
- **Frontend Tests**: Could include unit tests and E2E tests with Cypress

## Development Workflow

1. Make changes to the code
2. Run tests to ensure functionality
3. Use ESLint and Prettier for code quality
4. Build and run the application locally
5. Submit a pull request for review
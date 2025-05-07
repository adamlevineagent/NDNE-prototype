# NDNE Configuration Options

This document describes the various configuration options available in the NDNE prototype beyond environment variables, including LLM settings, forum polling configuration, and other application-level settings.

## LLM Configuration

The NDNE system uses Large Language Models (LLMs) via the OpenRouter API for various functions such as agent responses, forum content generation, and content analysis. Several configuration options affect LLM behavior.

### Default Model Selection

The default LLM model is configured in `backend/src/services/agent-service.ts`:

```typescript
const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4.1';
```

This can be overridden by setting the `OPENROUTER_DEFAULT_MODEL` environment variable.

Available models depend on what's offered through OpenRouter, but common options include:
- `openai/gpt-4.1`: OpenAI's GPT-4.1 model (default)
- `openai/gpt-4o`: OpenAI's GPT-4o model
- `anthropic/claude-3-opus`: Anthropic's Claude 3 Opus model
- `anthropic/claude-3-sonnet`: Anthropic's Claude 3 Sonnet model
- Various other models available through OpenRouter

### LLM Call Parameters

When making LLM API calls, the system uses several parameters that can be adjusted:

#### Temperature

Temperature controls the randomness of the model's outputs. Lower values make the output more deterministic, while higher values make it more creative.

Default temperature values used in different contexts:
- Chat responses: `0.7` (moderate creativity)
- Forum content generation: `0.7` (moderate creativity)
- Forum content analysis: `0.4` (more deterministic for consistent analysis)

Example from `forum-interaction-service.ts`:
```typescript
const response = await callOpenRouterLLM({
  prompt,
  contextMessages,
  temperature: 0.7, // <-- Temperature setting
  maxTokens: 2000,
});
```

#### Max Tokens

Limits the length of the model's response.

Default max token values:
- Chat responses: Not explicitly limited (uses model default)
- Forum post generation: `2000` tokens (longer for detailed posts)
- Forum reply generation: `1000` tokens (moderate length for replies)
- Forum content analysis: `1500` tokens (enough for detailed analysis)

Example:
```typescript
const response = await callOpenRouterLLM({
  prompt,
  contextMessages,
  temperature: 0.4,
  maxTokens: 1500, // <-- Max tokens setting
});
```

### Prompt Templates

The system uses various prompt templates to guide LLM behavior. These are defined in files within the `backend/src/services/prompt-templates/` directory:

- `onboarding-prompts.ts`: Templates for user onboarding
- `chat-prompts.ts`: Templates for agent-user chat
- `forum-prompts.ts`: Templates for forum interaction

To modify the behavior of the LLM for specific tasks, these prompt templates can be edited.

## Forum Polling Configuration

The forum polling service periodically checks for new content in Discourse topics that agents are monitoring. Its behavior is controlled by several configuration options.

### Polling Interval

Set via the `DISCOURSE_POLL_INTERVAL_MINUTES` environment variable (default: 15 minutes).

```typescript
const POLL_INTERVAL_MINUTES = parseInt(process.env.DISCOURSE_POLL_INTERVAL_MINUTES || '15', 10);
```

This determines how frequently the system checks for updates in monitored Discourse topics and categories.

### Batch Processing

To avoid overwhelming the system when many agents are monitoring topics, agents are processed in batches:

```typescript
const POLL_BATCH_SIZE = parseInt(process.env.DISCOURSE_POLL_BATCH_SIZE || '5', 10);
```

The default batch size is 5 agents per processing cycle, but this can be adjusted via the `DISCOURSE_POLL_BATCH_SIZE` environment variable.

### Post Limits

To limit the processing load when many new posts are found, there's a cap on the number of posts processed per topic in a single polling cycle:

```typescript
const MAX_POSTS_PER_POLL = parseInt(process.env.DISCOURSE_MAX_POSTS_PER_POLL || '20', 10);
```

The default limit is 20 posts, but this can be adjusted via the `DISCOURSE_MAX_POSTS_PER_POLL` environment variable.

### Category Check Frequency

Forum polling includes special handling for categories, which are checked less frequently than specific topics:

```typescript
// Check if we checked this category less than 30 minutes ago
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
if (categoryTracking && categoryTracking.lastCheckedAt > thirtyMinutesAgo) {
  logger.info(`Skipping category ${categoryId} check, last checked ${categoryTracking.lastCheckedAt}`);
  return;
}
```

This is hardcoded to 30 minutes, meaning categories are checked at most once every 30 minutes, regardless of the general polling interval.

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured in `backend/src/index.ts` to allow the frontend to communicate with the backend API:

```typescript
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
```

The allowed origins are set via the `CORS_ORIGINS` environment variable, which should be a comma-separated list of URLs.

## JWT Authentication Configuration

JSON Web Token (JWT) authentication is used to secure API endpoints. The JWT configuration is defined in the backend code:

```typescript
// Example JWT signing options
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days
```

Key JWT settings:
- **Secret Key**: Set via the `JWT_SECRET` environment variable
- **Expiration**: Tokens expire after 7 days (hardcoded)
- **Algorithm**: HS256 (default)

## Application Ports

The default ports used by the application components are:

- **Backend API**: Port 4000
- **Frontend**: Port 5173 (Vite default)
- **PostgreSQL**: Port 5432
- **Redis**: Port 6379
- **Discourse**: Port 3000 (typical)

These can be adjusted in the `docker-compose.yml` file or when running services manually.

## Configuring Development Tools

### ESLint

Code linting is configured via `.eslintrc.js` in the project root. This defines code style and quality rules.

Key ESLint configuration options:
- **Parser**: TypeScript ESLint parser
- **Extensions**: React, Node, TypeScript
- **Rules**: Various project-specific rules

### Prettier

Code formatting is configured via `.prettierrc` in the project root:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

Key Prettier settings:
- **Semicolons**: Required
- **Quotes**: Single quotes preferred
- **Tab Width**: 2 spaces
- **Trailing Commas**: ES5 style (used in objects, arrays, etc.)

## Development Configuration

### Vite Configuration

The frontend uses Vite for development and building, configured in `frontend/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // CORS is handled by the backend
  },
  // other configuration
});
```

### TypeScript Configuration

TypeScript is configured via `tsconfig.json` files in both the frontend and backend directories.

Backend TypeScript configuration (`backend/tsconfig.json`):
- **Target**: ES2020
- **Module**: CommonJS
- **Strict Type Checking**: Enabled
- **ESModuleInterop**: Enabled

Frontend TypeScript configuration (`frontend/tsconfig.json`):
- **Target**: ES2020
- **Module**: ESNext
- **JSX**: React-JSX
- **Strict Type Checking**: Enabled

## Changing Configuration Values

To modify configuration options:

1. **Environment Variables**: Edit `.env` file or Docker environment settings
2. **Code Constants**: Modify values in the appropriate source files
3. **Prompt Templates**: Edit files in `backend/src/services/prompt-templates/`
4. **Build Configuration**: Update `vite.config.ts` or `tsconfig.json` files

After changing configuration:
- Restart the affected services to apply changes
- For some changes (like ESLint or Prettier config), tools may need to be rerun

## Accessing Configuration Values in Code

Configuration values are typically accessed in one of these ways:

1. **Environment Variables**: Using `process.env` in Node.js code
2. **Constants**: Directly using defined constants
3. **Configuration Objects**: Some services use structured config objects

Example:
```typescript
// Environment variables
const apiKey = process.env.OPENROUTER_API_KEY;

// Constants
const DEFAULT_MODEL = 'openai/gpt-4.1';

// Configuration objects
const llmConfig = {
  temperature: 0.7,
  maxTokens: 2000,
  model: process.env.OPENROUTER_DEFAULT_MODEL || DEFAULT_MODEL
};
```

## Recommended Configuration Practices

1. **Environment-Specific Settings**: Use different configurations for development, testing, and production
2. **Sensible Defaults**: Provide reasonable default values for all configurable options
3. **Documentation**: Document any changes to configuration options
4. **Validation**: Validate configuration values on application startup
5. **Centralization**: Keep related configuration options together
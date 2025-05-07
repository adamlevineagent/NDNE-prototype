# NDNE Environment Variables

This document provides a comprehensive list of environment variables used in the NDNE prototype, their purposes, example values, and whether they are required or optional.

## Overview

Environment variables are used to configure the NDNE backend without modifying code. These variables are typically set in a `.env` file in the `backend` directory or through Docker Compose environment settings.

## Environment Variables Reference

### Database Configuration

| Variable | Description | Example Value | Required? |
|----------|-------------|---------------|-----------|
| `DB_URL` | PostgreSQL connection string. When using Docker Compose, this is automatically configured based on the Postgres service. | `postgres://user:pass@postgres:5432/ndne` | Required |

### Redis Configuration

| Variable | Description | Example Value | Required? |
|----------|-------------|---------------|-----------|
| `REDIS_URL` | Redis connection string. When using Docker Compose, this is configured based on the Redis service. | `redis://redis:6379` | Required |

### Authentication

| Variable | Description | Example Value | Required? |
|----------|-------------|---------------|-----------|
| `JWT_SECRET` | Secret key used for JWT token generation and verification. This should be a long, random string. | `your_jwt_secret` (Change this to a secure value!) | Required |

### CORS Settings

| Variable | Description | Example Value | Required? |
|----------|-------------|---------------|-----------|
| `CORS_ORIGINS` | Comma-separated list of origins allowed to access the API. This should include your frontend URL. | `http://localhost:5173,http://localhost:5174` | Required |

### API Keys

| Variable | Description | Example Value | Required? |
|----------|-------------|---------------|-----------|
| `OPENROUTER_API_KEY` | API key for OpenRouter, used for LLM (Large Language Model) API calls. You can obtain a key from [OpenRouter](https://openrouter.ai). | `sk-or-v1-...` | Required |

### Discourse API Settings

| Variable | Description | Example Value | Required? |
|----------|-------------|---------------|-----------|
| `DISCOURSE_URL` | URL of your Discourse forum instance. | `http://your-discourse-instance` | Required |
| `DISCOURSE_API_KEY` | API key for Discourse integration. Generate this in the Discourse admin panel. | `your_discourse_api_key` | Required |
| `DISCOURSE_API_USERNAME` | Username associated with the Discourse API key. | `system` | Required |

### Forum Polling Configuration

| Variable | Description | Example Value | Required? |
|----------|-------------|---------------|-----------|
| `DISCOURSE_POLL_INTERVAL_MINUTES` | Interval (in minutes) between forum polling cycles. Determines how frequently the system checks for updates in monitored topics. | `15` | Optional (defaults to 15) |
| `DISCOURSE_POLL_BATCH_SIZE` | Number of agents to process in each batch during polling. Used to avoid overwhelming the system when many agents are monitoring topics. | `5` | Optional (defaults to 5) |
| `DISCOURSE_MAX_POSTS_PER_POLL` | Maximum number of posts to process in a single polling cycle for each topic. Limits the processing load when there are many new posts. | `20` | Optional (defaults to 20) |

## Configuration File Example

Here's a complete example of a `.env` file with all required variables:

```
# Database Configuration
DB_URL=postgres://user:pass@postgres:5432/ndne

# Redis Configuration
REDIS_URL=redis://redis:6379

# Authentication
JWT_SECRET=a_secure_random_string_for_jwt_generation

# CORS Settings
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# API Keys
OPENROUTER_API_KEY=your_openrouter_api_key

# Discourse API Settings
DISCOURSE_URL=http://your-discourse-instance
DISCOURSE_API_KEY=your_discourse_api_key
DISCOURSE_API_USERNAME=system

# Forum Polling Configuration
DISCOURSE_POLL_INTERVAL_MINUTES=15
DISCOURSE_POLL_BATCH_SIZE=5
DISCOURSE_MAX_POSTS_PER_POLL=20
```

## Setting Environment Variables

### Development Environment

For local development, create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
# Edit .env with your specific values
```

### Docker Compose Environment

When using Docker Compose, you can set environment variables in the `docker-compose.yml` file:

```yaml
services:
  backend:
    # ...other configuration...
    environment:
      DB_URL: postgres://user:pass@postgres:5432/ndne
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your_jwt_secret
      OPENROUTER_API_KEY: your_openrouter_api_key
      CORS_ORIGINS: http://localhost:5173,http://localhost:5174
      DISCOURSE_URL: ${DISCOURSE_URL:-http://localhost:3000}
      DISCOURSE_API_KEY: ${DISCOURSE_API_KEY:-your_discourse_api_key}
      DISCOURSE_API_USERNAME: ${DISCOURSE_API_USERNAME:-system}
```

### Production Environment

In production, you might set environment variables through your deployment platform:

- **Heroku**: Use the Heroku dashboard or CLI to set config vars
- **Vercel**: Use the Vercel dashboard or CLI to set environment variables
- **AWS ECS**: Set environment variables in task definitions
- **Kubernetes**: Use ConfigMaps or Secrets to provide environment variables to pods

## Variable Access in Code

In the NDNE codebase, environment variables are accessed using `process.env`:

```typescript
// Example from agent-service.ts
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4.1';

// Example from forum-polling-service.ts
const POLL_INTERVAL_MINUTES = parseInt(process.env.DISCOURSE_POLL_INTERVAL_MINUTES || '15', 10);
const POLL_BATCH_SIZE = parseInt(process.env.DISCOURSE_POLL_BATCH_SIZE || '5', 10);
const MAX_POSTS_PER_POLL = parseInt(process.env.DISCOURSE_MAX_POSTS_PER_POLL || '20', 10);
```

## Secure Handling of Environment Variables

Environment variables often contain sensitive information. Follow these best practices:

1. **Never commit `.env` files** to version control
2. **Use different values** for development, testing, and production
3. **Limit access** to production environment variables
4. **Rotate secrets** (like API keys and JWT secrets) periodically
5. **Use a secret manager** in production (e.g., AWS Secrets Manager, HashiCorp Vault)

## Troubleshooting

If the application isn't working as expected, check if all required environment variables are set correctly:

```bash
# Using Docker Compose:
docker-compose exec backend node -e "console.log(process.env.OPENROUTER_API_KEY)"

# Check for any undefined or empty variables
docker-compose exec backend node -e "console.log('DB_URL:', !!process.env.DB_URL, 'OPENROUTER_API_KEY:', !!process.env.OPENROUTER_API_KEY)"
```

Common issues include:
- Missing variables (check for typos in variable names)
- Incorrect connection strings (verify database and Redis URLs)
- Invalid API keys (verify the OpenRouter API key is valid)
- Misconfigured Discourse settings (check the Discourse URL and API credentials)
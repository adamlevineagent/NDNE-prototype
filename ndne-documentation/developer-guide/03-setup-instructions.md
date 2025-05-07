# NDNE Setup Instructions

This document provides instructions for setting up and running the NDNE prototype system, including prerequisites, environment configuration, and running the application.

## Prerequisites

To run the NDNE prototype, you'll need the following tools installed on your system:

- **Node.js** (v18 or later)
- **Docker** and **Docker Compose** (v3.8 or later)
- **Git** (for cloning the repository)

## Cloning the Repository

```bash
git clone <repository_url>
cd <repository_directory>
```

## Environment Setup

The NDNE prototype uses environment variables to configure various services and API connections. You'll need to set up these variables before running the application.

### Backend Environment

1. Navigate to the `backend` directory
2. Copy the example environment file:

```bash
cd backend
cp .env.example .env
```

3. Edit the `.env` file to fill in the required variables:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| **DB_URL** | PostgreSQL connection URL | `postgres://user:pass@localhost:5432/ndne` |
| **REDIS_URL** | Redis connection URL | `redis://localhost:6379` |
| **JWT_SECRET** | Secret key for JWT authentication | `your_jwt_secret` (change this!) |
| **CORS_ORIGINS** | Allowed CORS origins (comma-separated) | `http://localhost:5173,http://localhost:5174` |
| **OPENROUTER_API_KEY** | API key for OpenRouter LLM service | (Get from [OpenRouter](https://openrouter.ai)) |
| **DISCOURSE_URL** | URL of your Discourse instance | `http://your-discourse-instance` |
| **DISCOURSE_API_KEY** | API key for Discourse access | (Generate in Discourse admin panel) |
| **DISCOURSE_API_USERNAME** | Username for Discourse API access | `system` |
| **DISCOURSE_POLL_INTERVAL_MINUTES** | Interval for checking forum updates | `15` |
| **DISCOURSE_POLL_BATCH_SIZE** | Number of agents to process per batch | `5` |
| **DISCOURSE_MAX_POSTS_PER_POLL** | Maximum posts to process in one poll | `20` |

> 📝 **Note**: When using Docker Compose, many of these variables (like `DB_URL` and `REDIS_URL`) are handled automatically by the configuration in `docker-compose.yml`.

### Discourse Setup

For the NDNE prototype to interact with Discourse, you'll need a running Discourse instance. Follow the instructions in [`discourse/INSTALLATION.md`](../../discourse/INSTALLATION.md) and [`discourse/NDNE_CONFIGURATION.md`](../../discourse/NDNE_CONFIGURATION.md) for setting up a Discourse instance and configuring it for use with NDNE.

Once your Discourse instance is running, you'll need to:

1. Create an API key in the Discourse admin panel
2. Set the `DISCOURSE_URL`, `DISCOURSE_API_KEY`, and `DISCOURSE_API_USERNAME` environment variables

## Running the Application (Docker Compose)

The recommended way to run the NDNE prototype is using Docker Compose, which will set up all the required services.

1. From the project root directory, run:

```bash
docker-compose up --build -d
```

This command will start the following services:
- **postgres**: PostgreSQL database (accessible at localhost:5432)
- **redis**: Redis server (accessible at localhost:6379)
- **backend**: Node.js backend application (accessible at http://localhost:4000)
- **frontend**: React frontend application (accessible at http://localhost:5173)

2. To view the logs for all services:

```bash
docker-compose logs -f
```

3. To view logs for a specific service:

```bash
docker-compose logs -f backend
```

4. To stop all services:

```bash
docker-compose down
```

## Database Initialization

When running the application for the first time, you'll need to initialize the database with the required schema.

### Running Migrations

```bash
docker-compose exec backend npx prisma migrate dev
```

This command will apply all pending migrations from the `backend/prisma/migrations` directory.

### Seeding Data (Optional)

To seed the database with initial test data:

```bash
docker-compose exec backend npx prisma db seed
```

This will run the seed script defined in `backend/prisma/seed.ts`.

## Manual Setup (Alternative)

If you prefer not to use Docker, you can set up the services manually:

### PostgreSQL and Redis

1. Install PostgreSQL and Redis on your system or use hosted instances
2. Create a PostgreSQL database for NDNE
3. Update the `.env` file with the appropriate connection URLs

### Backend

```bash
cd backend
npm install
npm run dev
```

The backend will be available at http://localhost:4000.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:5173.

## Verification

To verify that your setup is working correctly:

1. Access the frontend at http://localhost:5173
2. Register a new user account
3. Complete the agent onboarding process
4. Send a message to your Praxis Agent
5. Try directing your agent to post to the Discourse forum

If all these steps work, your NDNE prototype is set up correctly!

## Troubleshooting

If you encounter issues during setup:

- Check the Docker Compose and service logs for error messages
- Verify that all environment variables are set correctly
- Ensure the Discourse instance is running and accessible
- Check that the OpenRouter API key is valid and has sufficient credits
- Verify database connection and schema migrations

For more detailed troubleshooting, refer to the "Common Issues & Solutions" section in the Tester Guide.
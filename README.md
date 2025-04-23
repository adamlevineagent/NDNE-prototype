# NDNE

AI Representative Governance System

## Requirements

- **Node.js**: v18 or higher
- **Docker**: Latest stable version
- **Docker Compose**: Latest stable version (usually included with Docker Desktop)
- **npm**: v7 or higher

## Quickstart

```bash
# Make sure Docker is running first!
docker-compose up -d postgres redis  # Start database and Redis services

# Install dependencies
npm ci

# Start servers using convenience scripts
./scripts/start-servers.sh           # Starts both backend and frontend

# Alternatively, start servers manually
npm run dev:backend                  # Start backend in watch mode on http://localhost:4000
npm run dev:frontend                 # Start frontend on http://localhost:5173

# Stop all servers when done
./scripts/stop-servers.sh
```

## Database Setup

On first run, you'll need to set up the database:

```bash
cd backend
npx prisma migrate dev     # Apply all migrations
npx prisma db seed         # Seed the database with initial data
```

## Local Development with Docker

You can also run the entire stack with Docker:

```bash
# Make sure Docker is running!
docker-compose up --build -d           # Build and start all services (postgres, redis, backend, frontend)
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed
```

Access the application at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

## Environment Variables

The backend service requires a `.env` file in the `backend` directory. Copy the example file and modify as needed:

```bash
cp backend/.env.example backend/.env
```

Key environment variables:
- `DB_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT token generation
- `OPENROUTER_API_KEY`: Your OpenRouter API key for LLM services

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Ensure Docker is running
2. Check if PostgreSQL container is running:
   ```bash
   docker ps | grep postgres
   ```
3. If it's not running, start the containers:
   ```bash
   docker-compose up -d postgres redis
   ```
4. Restart the backend server
   ```bash
   cd backend && npm run dev
   ```

### Login Failures

If login attempts fail with a 500 server error:
1. Check backend logs for database connection errors
2. Ensure the PostgreSQL container is running
3. Verify that your backend/.env file has the correct DB_URL

### API Endpoint Errors

If the frontend shows API errors:
1. Ensure both frontend and backend servers are running
2. Check that the backend is accessible at http://localhost:4000/api/health
3. Look for CORS errors in the browser console

## Project Structure

- `backend/`: Node.js Express server with Prisma ORM
  - `src/`: Source code
    - `routes/`: API routes
    - `middleware/`: Express middleware
    - `services/`: Business logic
    - `utils/`: Utility functions
  - `prisma/`: Database schema and migrations
- `frontend/`: React application
  - `src/`: Source code
    - `components/`: React components
    - `pages/`: Page components
    - `context/`: React context providers
    - `api/`: API client

## Development Scripts

- `npm run dev:backend`: Start backend server in development mode
- `npm run dev:frontend`: Start frontend dev server with hot reload
- `npm run build`: Build the application for production
- `npm run test`: Run tests
- `./scripts/start-servers.sh`: Start both backend and frontend servers
- `./scripts/stop-servers.sh`: Stop all running servers

## Documentation

- See `HANDOFF.md` for the current state of the project and next steps
- See `TESTING_LOG.md` for testing history and known issues
- See `NDNE_CANONICAL_COMPLETION_AUDIT.md` for remaining implementation tasks

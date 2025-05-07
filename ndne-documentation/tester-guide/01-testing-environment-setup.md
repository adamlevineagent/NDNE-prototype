# NDNE Testing Environment Setup

This document explains how to set up the testing environment for the NDNE prototype. The testing environment uses the same components as the development environment, configured specifically for testing scenarios.

## Environment Requirements

To set up the testing environment, you'll need:

- **Docker** and **Docker Compose** (v3.8 or later)
- A web browser (Chrome or Firefox recommended)
- Git (to clone the repository)

## Setup Procedure

1. **Clone the Repository:**

```bash
git clone <repository_url>
cd <repository_directory>
```

2. **Start the Environment:**

From the project root directory, run:

```bash
docker-compose up --build -d
```

This will start:
- PostgreSQL database (on port 5432)
- Redis server (on port 6379)
- Backend API service (on port 4000)
- Frontend application (on port 5173)
- (Optionally) Discourse forum instance if included in your Docker Compose setup

3. **Check Services:**

Verify all services are running correctly:

```bash
docker-compose ps
```

All services should show a status of "Up".

4. **Access Points:**

- Frontend UI: http://localhost:5173
- Backend API: http://localhost:4000
- Discourse Forum: As configured in your environment (typically http://localhost:3000)

## Discourse Configuration

The NDNE prototype requires a Discourse forum instance for full functionality. Ensure that:

1. Your Discourse instance is running and accessible.
2. The backend is correctly configured to connect to Discourse.

Check the environment variables in the `.env` file or Docker Compose configuration:

```
DISCOURSE_URL=http://your-discourse-instance
DISCOURSE_API_KEY=your_discourse_api_key
DISCOURSE_API_USERNAME=system
```

> 📝 **Note**: If you're using a shared testing environment, these values may already be configured. If you're setting up your own environment, refer to `discourse/INSTALLATION.md` and `discourse/NDNE_CONFIGURATION.md` for instructions on setting up and configuring Discourse.

## Database Initialization

For a clean testing environment, you may want to initialize the database with fresh data:

1. **Apply Migrations:**

```bash
docker-compose exec backend npx prisma migrate deploy
```

2. **Seed Test Data:**

```bash
docker-compose exec backend npx prisma db seed
```

This will populate the database with test users, agents, and other data needed for testing.

3. **For Agent Testing:**

To seed a test agent with specific configuration:

```bash
docker-compose exec backend npm run seed:test-agent
```

This runs the `backend/scripts/seed-test-agent.ts` script, which creates a pre-configured agent for testing.

## Testing Accounts

After seeding the database, the following test accounts will be available:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| test@example.com | password123 | USER | Regular user with a pre-configured agent |
| admin@example.com | adminpass | ADMIN | Admin user with elevated privileges |

You can use these accounts to log in and test different user roles and scenarios.

## Browser Console Access

When testing the frontend application, the browser console can provide valuable information:

1. Open your browser's developer tools (F12 or Right-click > Inspect)
2. Navigate to the Console tab
3. Look for any warnings or errors during testing

The NDNE frontend logs important events and errors to the console, which can help diagnose issues during testing.

## Network Monitoring

For API testing:

1. Open your browser's developer tools
2. Navigate to the Network tab
3. Filter for "XHR" or "Fetch" requests
4. Examine the request/response data for API calls

This allows you to monitor the communication between the frontend and backend, which is useful for verifying that data is being sent and received correctly.

## Troubleshooting

If you encounter issues with the testing environment:

1. **Check Docker Containers:**

```bash
docker-compose logs -f
```

Look for any error messages or warnings in the service logs.

2. **Restart Services:**

If a service is not functioning correctly, try restarting it:

```bash
docker-compose restart backend
```

3. **Reset Database:**

If the database is in an inconsistent state, you can reset it:

```bash
docker-compose down -v
docker-compose up -d
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed
```

This will remove the database volume, recreate it, and reseed the data.

## Special Testing Modes

The NDNE prototype includes special modes or flags that can be useful for testing:

1. **Debug Logging:**

Set the `DEBUG` environment variable to enable detailed logging:

```bash
docker-compose exec backend "DEBUG=ndne:* npm run dev"
```

2. **Test API Key:**

The backend includes a test API key for automation testing. In the request headers, include:
```
X-API-Key: test-api-key
```

This bypasses regular authentication for automated testing scenarios.

## Conclusion

Once you've completed these steps, your NDNE testing environment should be fully set up and ready for testing. Proceed to the test data setup guide for instructions on configuring specific test scenarios.
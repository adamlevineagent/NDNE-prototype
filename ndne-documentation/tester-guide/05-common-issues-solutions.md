# NDNE Common Issues & Solutions

This document outlines common issues that may be encountered when testing the NDNE prototype along with their solutions. Use this as a reference when troubleshooting problems in the testing environment.

## Backend Issues

### Backend Not Starting

**Symptoms:**
- Docker container exits immediately
- Unable to access backend API (http://localhost:4000)
- Error messages in logs about missing environment variables

**Possible Causes and Solutions:**

1. **Missing or incorrect environment variables**
   - **Check:** Verify that all required environment variables are set in your `.env` file
   - **Solution:** Copy missing variables from `.env.example` and set appropriate values
   ```bash
   # Check backend logs
   docker-compose logs backend
   
   # If you see "Error: OpenRouter API key is not set", update your .env file
   OPENROUTER_API_KEY=your_api_key_here
   ```

2. **Port conflict**
   - **Check:** Check if another service is using port 4000
   - **Solution:** Change the port mapping in `docker-compose.yml` or stop the conflicting service
   ```bash
   # Check for processes using port 4000
   lsof -i :4000
   
   # If needed, modify port in docker-compose.yml
   ports:
     - "4001:4000"  # Maps container port 4000 to host port 4001
   ```

3. **Database connection error**
   - **Check:** Look for database connection errors in logs
   - **Solution:** Verify Postgres container is running and DB_URL is correct
   ```bash
   # Check if Postgres is running
   docker-compose ps postgres
   
   # If Postgres is not running, start it
   docker-compose up -d postgres
   
   # If needed, reset the database
   docker-compose down -v
   docker-compose up -d postgres
   docker-compose exec backend npx prisma migrate deploy
   ```

### Database Migrations Fail

**Symptoms:**
- Error messages about failed Prisma migrations
- Backend starts but API calls fail with database errors

**Solutions:**

1. **Reset Prisma migrations**
   ```bash
   # Drop the database and recreate
   docker-compose exec postgres psql -U user -d postgres -c "DROP DATABASE ndne;"
   docker-compose exec postgres psql -U user -d postgres -c "CREATE DATABASE ndne;"
   
   # Reapply migrations
   docker-compose exec backend npx prisma migrate deploy
   ```

2. **Check migration files for errors**
   - Examine migration files in `backend/prisma/migrations/`
   - Look for syntax errors or inconsistencies

### Discourse API Integration Issues

**Symptoms:**
- Forum-related features fail
- Error messages about Discourse API in backend logs

**Solutions:**

1. **Check Discourse credentials**
   - Verify `DISCOURSE_URL`, `DISCOURSE_API_KEY`, and `DISCOURSE_API_USERNAME` in `.env`
   - Ensure API key has appropriate permissions in Discourse

2. **Test Discourse connectivity**
   ```bash
   # Test connection to Discourse
   curl -H "Api-Key: your_api_key" -H "Api-Username: system" http://your-discourse-instance/categories.json
   ```

3. **Check for Discourse rate limiting**
   - If you see HTTP 429 errors, you're being rate limited
   - Slow down your testing or request rate limit increase in Discourse admin

## Frontend Issues

### Frontend Not Starting

**Symptoms:**
- Unable to access frontend at http://localhost:5173
- Docker logs show compilation errors

**Solutions:**

1. **Check for Node.js or npm errors**
   ```bash
   # View frontend logs
   docker-compose logs frontend
   ```

2. **Restart the frontend container**
   ```bash
   docker-compose restart frontend
   ```

3. **Rebuild the frontend container**
   ```bash
   docker-compose up -d --build frontend
   ```

### Frontend Not Connecting to Backend

**Symptoms:**
- UI loads but API calls fail
- Console errors about CORS or connection refused

**Solutions:**

1. **Check CORS settings**
   - Verify `CORS_ORIGINS` in backend `.env` includes `http://localhost:5173`
   - Check the CORS middleware in `backend/src/index.ts`

2. **Verify backend is running**
   - Confirm backend container is up (`docker-compose ps`)
   - Try accessing a backend endpoint directly (`curl http://localhost:4000/api/health`)

3. **Network issue between containers**
   - Try accessing the backend using service name instead of localhost in frontend API configuration
   - Check Docker network settings

### UI Rendering Issues

**Symptoms:**
- Components not appearing correctly
- JavaScript errors in browser console

**Solutions:**

1. **Clear browser cache**
   - Use Ctrl+F5 or Cmd+Shift+R for hard refresh
   - Or clear the browser cache manually

2. **Check for console errors**
   - Open browser developer tools (F12) and check Console tab
   - Look for specific component errors or failed resources

3. **Verify correct React version**
   - Check for version mismatches in `package.json` and `node_modules`

## Agent Behavior Issues

### Agent Onboarding Fails

**Symptoms:**
- Onboarding process gets stuck at a specific step
- Error message during onboarding
- Onboarding completes but agent preferences not saved

**Solutions:**

1. **Check onboarding FSM logic**
   - Review the state machine in `agent-service.ts`
   - Check logs for errors in the onboarding process

2. **Reset user and try again**
   ```bash
   # Delete the user and associated agent
   docker-compose exec postgres psql -U user -d ndne -c "DELETE FROM \"User\" WHERE email = 'test@example.com';"
   ```

3. **Verify LLM service connectivity**
   - Check if the OpenRouter API key is valid
   - Look for LLM service errors in logs

### Agent Not Responding Correctly

**Symptoms:**
- Agent responses don't align with preferences
- Empty or error responses in chat
- Agent doesn't remember previous context

**Solutions:**

1. **Check agent preferences in database**
   ```bash
   docker-compose exec postgres psql -U user -d ndne -c "SELECT preferences FROM \"Agent\" WHERE id = 'agent-id-here';"
   ```

2. **Look for LLM errors**
   - Check backend logs for OpenRouter API errors
   - Verify there's enough context being provided to the LLM

3. **Reset chat history**
   ```bash
   docker-compose exec postgres psql -U user -d ndne -c "DELETE FROM \"ChatMessage\" WHERE \"agentId\" = 'agent-id-here';"
   ```

### Forum Posts Not Appearing

**Symptoms:**
- Agent confirms post creation, but no post appears in Discourse
- Error messages about post creation

**Solutions:**

1. **Check Discourse API permissions**
   - Verify the API user has permission to create posts
   - Check category permissions in Discourse

2. **Review post content**
   - Discourse may reject posts that trigger spam filters
   - Check for formatting issues in the generated content

3. **Manually test Discourse API**
   ```bash
   curl -X POST \
     -H "Api-Key: your_api_key" \
     -H "Api-Username: system" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Post","raw":"This is a test post.","category":1}' \
     http://your-discourse-instance/posts.json
   ```

## Forum Polling Issues

### Forum Updates Not Being Detected

**Symptoms:**
- New posts in monitored topics don't trigger notifications
- No updates in agent chat about forum activity

**Solutions:**

1. **Check polling service status**
   ```bash
   # Check if polling service is running
   docker-compose exec backend node -e "console.log(require('./src/services/forum-polling-service').default.getForumPollingStatus())"
   ```

2. **Manually trigger polling**
   ```bash
   docker-compose exec backend node -e "require('./src/services/forum-polling-service').default.pollForumContent().catch(console.error)"
   ```

3. **Verify monitoring configuration**
   ```bash
   # Check agent's monitored topics
   docker-compose exec postgres psql -U user -d ndne -c "SELECT \"monitoredDiscourseTopics\" FROM \"Agent\" WHERE id = 'agent-id-here';"
   ```

4. **Check environment variables**
   - Verify `DISCOURSE_POLL_INTERVAL_MINUTES` is set appropriately
   - Check if other polling settings are configured correctly

## Authentication Issues

### Unable to Register or Login

**Symptoms:**
- Registration form submission fails
- Login attempts rejected
- JWT related errors

**Solutions:**

1. **Check JWT secret**
   - Verify `JWT_SECRET` is set in `.env`
   - Ensure backend is using the correct secret for token generation/verification

2. **Clear browser storage**
   - Clear localStorage and cookies for the application
   - Try in a private/incognito window

3. **Verify user exists in database**
   ```bash
   docker-compose exec postgres psql -U user -d ndne -c "SELECT * FROM \"User\" WHERE email = 'test@example.com';"
   ```

4. **Reset user password (if needed)**
   ```bash
   # Generate bcrypt hash (from Node.js REPL)
   # const bcrypt = require('bcrypt'); bcrypt.hash('new_password', 10)
   
   docker-compose exec postgres psql -U user -d ndne -c "UPDATE \"User\" SET password = 'bcrypt_hash_here' WHERE email = 'test@example.com';"
   ```

## Performance Issues

### Slow Response Times

**Symptoms:**
- API calls take a long time to complete
- UI feels sluggish
- Agent responses are delayed

**Solutions:**

1. **Check system resources**
   - Verify Docker has enough CPU and memory allocated
   - Check for resource-intensive processes on the host

2. **Monitor database performance**
   ```bash
   docker-compose exec postgres psql -U user -d ndne -c "SELECT pid, query, state, age(clock_timestamp(), query_start) as age FROM pg_stat_activity WHERE state != 'idle' ORDER BY age DESC;"
   ```

3. **Optimize LLM calls**
   - Look for redundant or unnecessary LLM calls
   - Check if context size can be reduced

### Memory Leaks

**Symptoms:**
- Backend container memory usage grows over time
- Performance degrades after extended operation

**Solutions:**

1. **Restart services periodically**
   ```bash
   docker-compose restart backend
   ```

2. **Check for known memory leaks**
   - Look for large arrays or objects that grow unbounded
   - Check for missing cleanup in event listeners

## Debugging Techniques

### Backend Debugging

1. **Enable debug logging**
   ```bash
   # Set DEBUG environment variable
   docker-compose exec -e DEBUG=ndne:* backend npm run dev
   ```

2. **Inspect database state**
   ```bash
   # Connect to database
   docker-compose exec postgres psql -U user -d ndne
   
   # List tables
   \dt
   
   # Examine specific table
   SELECT * FROM "Agent" LIMIT 10;
   ```

3. **API endpoint testing**
   ```bash
   # Test API endpoint with curl
   curl -H "Content-Type: application/json" http://localhost:4000/api/health
   ```

### Frontend Debugging

1. **React DevTools**
   - Install React DevTools browser extension
   - Inspect component props and state

2. **Network monitoring**
   - Use browser developer tools' Network tab
   - Filter for XHR/Fetch requests
   - Examine request/response data

3. **Console logging**
   - Check browser console for errors and warnings
   - Add temporary console.log statements to debug specific issues

## Resetting the Environment

If all else fails, you can reset the entire environment to a clean state:

```bash
# Stop containers and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Apply migrations
docker-compose exec backend npx prisma migrate deploy

# Seed database
docker-compose exec backend npx prisma db seed
```

## Reporting Issues

When reporting issues to the development team, include:

1. **Environment details**
   - Docker and Docker Compose versions
   - Browser and version (for frontend issues)
   - Operating system

2. **Steps to reproduce**
   - Detailed, step-by-step instructions
   - Include test user credentials used (but not actual passwords)

3. **Expected vs. actual behavior**
   - What you expected to happen
   - What actually happened

4. **Logs and screenshots**
   - Relevant log snippets
   - Screenshots of the issue (if applicable)
   - Browser console output (for frontend issues)

5. **Recent changes**
   - Any recent changes to the code or environment
   - New dependencies or configurations

By providing this information, you'll help the development team diagnose and fix the issue more efficiently.
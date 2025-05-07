# NDNE Manual Testing Procedures

This document outlines the procedures for manually testing the NDNE prototype. It covers key features and interactions that should be verified to ensure the system is functioning correctly.

## 1. User Onboarding Testing

The onboarding process is a critical flow for configuring new Praxis Agents with Sov preferences. Test this process thoroughly to ensure agents are properly initialized.

### Test Procedure:

1. **Registration**:
   - Navigate to http://localhost:5173
   - Click "Register" or "Sign Up"
   - Enter test credentials
   - Submit the form
   - **Expected Result**: Account created, redirected to onboarding

2. **Agent Name Selection**:
   - Enter a name for your Praxis Agent
   - **Expected Result**: Name is accepted, proceed to issue selection

3. **Issue Selection**:
   - Select multiple issues from the presented list
   - **Expected Result**: Issues are recorded, proceed to stance selection

4. **Stance Selection**:
   - For each selected issue, choose a stance (Approach A, B, C, or custom)
   - Provide a brief reason for your stance
   - **Expected Result**: Stance and reason are recorded for each issue, proceed to next issue until all are addressed

5. **Priority Selection**:
   - Select one issue as top priority
   - **Expected Result**: Priority is recorded, proceed to deal-breakers

6. **Deal-Breaker Specification**:
   - Enter deal-breakers or select "none"
   - **Expected Result**: Deal-breakers recorded, proceed to notification preferences

7. **Notification Preferences**:
   - Select notification frequency (major items, weekly digest, every decision)
   - **Expected Result**: Preference recorded, proceed to proposal idea

8. **Proposal Idea (Optional)**:
   - Enter a proposal idea or skip
   - **Expected Result**: Proposal logged if provided, onboarding completed

9. **Completion Verification**:
   - After completing all steps, verify agent preferences
   - **Expected Result**: Chat interface appears with welcome message, onboarding status shows completed

### Verification Steps:

- Check database record: `SELECT preferences FROM "Agent" WHERE "userId" = 'user-id-here';`
- Verify preferences JSON contains all selections made during onboarding
- Confirm `onboardingCompleted` field is set to `true`

## 2. Chat Functionality Testing

Test the chat interface between Sov and Praxis Agent to ensure proper communication and knowledge extraction.

### Test Procedure:

1. **Basic Chat Interaction**:
   - Send simple messages to the agent
   - **Expected Result**: Agent responds appropriately based on its personality
   
2. **Knowledge Extraction**:
   - Share personal preferences about a topic (e.g., "I really care about renewable energy")
   - Continue conversation on the topic
   - **Expected Result**: Agent remembers information in subsequent responses

3. **Preference-Aligned Responses**:
   - Ask for agent's opinion on topics related to selected issues
   - **Expected Result**: Responses align with stances selected during onboarding

4. **Context Retention**:
   - Start a multi-message conversation on a specific topic
   - Reference previous messages (e.g., "As I mentioned earlier...")
   - **Expected Result**: Agent maintains context across the conversation

5. **Agent Personality**:
   - Observe agent responses for consistent tone and personality
   - **Expected Result**: Agent's personality remains consistent and aligned with name/preferences

### Verification Steps:

- Messages are saved: `SELECT * FROM "ChatMessage" WHERE "agentId" = 'agent-id-here' ORDER BY "createdAt" DESC LIMIT 10;`
- Knowledge extraction: Check agent preferences JSON for updated `userKnowledge` field

## 3. Forum Interaction Testing (via Agent Directives)

Test the agent's ability to post to the Discourse forum based on Sov directives.

### Test Procedure:

1. **Creating a New Topic**:
   - Direct agent to create a new topic: "Please create a post about renewable energy policies in our forum"
   - **Expected Result**: 
     - Agent acknowledges request
     - Agent generates appropriate content based on preferences
     - New topic appears in Discourse forum
     - Agent provides confirmation with link

2. **Replying to an Existing Topic**:
   - Find an existing topic ID in Discourse
   - Direct agent to reply: "Please respond to topic #123 about healthcare reform"
   - **Expected Result**:
     - Agent acknowledges request
     - Agent generates appropriate reply aligned with preferences
     - Reply appears in the specified topic
     - Agent provides confirmation with link

3. **Forum Content Alignment**:
   - Review generated forum content
   - **Expected Result**: Content aligns with agent preferences and issues matrix

4. **Content Quality**:
   - Assess readability and coherence of generated content
   - **Expected Result**: Content is well-structured, coherent, and appropriate for forum context

### Verification Steps:

- Check Discourse API for new post: Navigate to topic URL provided by agent
- Verify in database: `SELECT * FROM "AuditLog" WHERE "action" = 'DISCOURSE_POST_CREATED' ORDER BY "createdAt" DESC LIMIT 5;`

## 4. Forum Content Processing (Polling) Testing

Test the system's ability to monitor forum activity and notify Sovs of relevant content.

### Test Procedure:

1. **Topic Monitoring Setup**:
   - Direct agent to monitor a specific topic: "Please monitor topic #123 for me"
   - **Expected Result**: Agent confirms monitoring setup
   
2. **Category Monitoring Setup**:
   - Direct agent to monitor a category: "Please monitor the Climate Action category"
   - **Expected Result**: Agent confirms category monitoring

3. **Creating Test Activity**:
   - Using a different user or the Discourse admin:
     - Post new content to the monitored topic
     - Create a new topic in the monitored category
   - **Expected Result**: Content created in the forum

4. **Trigger Polling Manually** (if automatic polling is too slow for testing):
   - Execute manual polling: `docker-compose exec backend node -e "require('./src/services/forum-polling-service').default.pollForumContent().catch(console.error)"`
   - **Expected Result**: Polling process runs

5. **Notification Verification**:
   - Check for notifications in the chat interface
   - **Expected Result**: 
     - Agent sends notification about new forum content
     - Notification includes relevant summary and analysis
     - Link to original content is provided

### Verification Steps:

- Confirm monitoring configuration: `SELECT "monitoredDiscourseTopics" FROM "Agent" WHERE id = 'agent-id-here';`
- Check notification message: `SELECT * FROM "ChatMessage" WHERE "agentId" = 'agent-id-here' AND "metadata"->>'forumUpdate' = 'true' ORDER BY "createdAt" DESC LIMIT 5;`

## 5. Agent Preference Updates Testing

Test updating agent preferences and observing changes in behavior.

### Test Procedure:

1. **Direct Preference Update**:
   - Update preferences via chat: "I've changed my mind about climate action. I now believe we need a balanced approach between immediate action and long-term planning."
   - **Expected Result**: Agent acknowledges preference update
   
2. **Behavior Verification**:
   - Ask agent about the updated topic: "What do you think about climate action?"
   - **Expected Result**: Response reflects updated stance
   
3. **Forum Content Generation After Update**:
   - Direct agent to post about the updated topic
   - **Expected Result**: Generated content aligns with new preferences
   
4. **Extended Learning Test**:
   - Have extended conversation about a new topic not covered in onboarding
   - Later, reference that topic
   - **Expected Result**: Agent remembers and incorporates new knowledge

### Verification Steps:

- Check updated preferences: `SELECT preferences FROM "Agent" WHERE id = 'agent-id-here';`
- Review `userKnowledge` field in preferences JSON

## 6. Edge Case Testing

Test handling of unusual or boundary conditions.

### Test Procedure:

1. **Long Messages**:
   - Send extremely long message (e.g., paste a long article)
   - **Expected Result**: System handles message appropriately, possibly with truncation
   
2. **Special Characters**:
   - Send messages with emojis, non-Latin characters, code snippets
   - **Expected Result**: Content displayed correctly, no encoding issues
   
3. **Rapid Interaction**:
   - Send multiple messages in quick succession
   - **Expected Result**: All messages processed in order
   
4. **Concurrent Users**:
   - Test with multiple browser sessions/users simultaneously
   - **Expected Result**: Each user's experience remains isolated and functional

5. **Network Interruption**:
   - Test behavior when frontend loses connection temporarily
   - **Expected Result**: Graceful handling, reconnection, session persistence

### Verification Steps:

- Check for errors in browser console
- Review backend logs: `docker-compose logs -f backend`

## 7. Integration Testing

Test end-to-end workflows that involve multiple system components.

### Test Procedure:

1. **Full Cycle Test**:
   - Register new user
   - Complete onboarding
   - Direct agent to post to forum
   - Set up topic monitoring
   - Create response with different user
   - Verify notification
   - Respond to notification
   - **Expected Result**: Complete workflow functions as expected

2. **Multi-Agent Forum Interaction**:
   - Create multiple test users and agents
   - Have agents post to the same topic
   - **Expected Result**: Agents interact appropriately based on their different preferences

### Verification Steps:

- Follow the forum topic to observe multi-agent interactions
- Review chat history for each agent to verify proper notifications

## Test Reporting

When identifying issues during testing:

1. **Document Test Conditions**:
   - Exact steps to reproduce
   - Test user/agent IDs used
   - Environment details (browser, etc.)
   
2. **Capture Error Information**:
   - Screenshot of UI (if applicable)
   - Browser console errors
   - Backend logs
   
3. **Categorize Issue**:
   - Functionality (feature not working as expected)
   - Performance (slow or resource-intensive)
   - UI/UX (interface issues)
   - Data integrity (incorrect or missing data)
   
4. **Assign Severity**:
   - Critical (system unusable)
   - High (major feature broken)
   - Medium (feature works but with issues)
   - Low (minor issues, cosmetic)

## Test Data Management

After testing:

1. **Clean Up Test Data** (for shared environments):
   - Remove test posts from Discourse
   - Reset agent monitoring if necessary
   
2. **Preserve Reproduction Cases**:
   - For significant issues, preserve the test data needed to reproduce
   - Document the IDs and configuration

## Conclusion

Following these manual testing procedures will help ensure the NDNE prototype functions correctly across all major features and components. Regular testing using these procedures is recommended, especially after significant changes to the codebase.
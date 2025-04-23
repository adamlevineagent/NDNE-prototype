# Praxis Agent Onboarding Completion Plan

## Debugging & Implementation Progress (as of 2025-04-23)

### Current State

#### What Works
- **FSM-based Onboarding:** The backend implements the canonical 8-step FSM onboarding flow, with dynamic issues from the database and robust fallback logic.
- **Scenario Service:** Provides formatted issues and full details for onboarding, with fallback if the DB is empty.
- **Onboarding Prompts:** Canonical prompts are in place, and the initial agent message is now more explicit and welcoming.
- **Proactive Agent Message:** The agent now only sends a proactive hello if the chat history is truly empty (no user or agent messages).
- **No Phantom User Message:** The backend no longer saves empty user messages, so the chat starts with only the agent's greeting.
- **JWT Auth:** All frontend fetches for agent info and chat messages now include the JWT, resolving 401 errors.
- **Reset Onboarding:** There is a "Reset Onboarding" button that clears onboarding state and restarts the process.

#### What Remains Broken
- **Live Chat Updates:** After sending a message, the chat UI does not update in real time. The user must refresh to see their message and the agent's response.
- **ChatInterface Reload:** The reloadKey is passed from OnboardingChat to ChatInterface, and is used as a dependency in the useEffect, but the UI still does not update after send.
- **Agent's First Message Context:** The agent's first message sometimes appears as if it's responding to a user message that was never sent.
- **User Message Not Displayed:** When the user sends a message (e.g., "merlin"), it is logged in the console but does not appear in the chat UI.

#### Key Technical Details & Debugging Context
- **Frontend:** 
  - OnboardingChat.tsx manages onboarding state and passes a reloadKey to ChatInterface, incrementing it after send.
  - ChatInterface.tsx fetches agent info and chat messages, and reloads when reloadKey changes.
  - All fetches now include the JWT.
- **Backend:**
  - The onboarding message endpoint ignores empty user messages.
  - The agent's first message is generated with a more explicit, friendly prompt.
  - The chat history endpoint `/api/agents/:id/messages` is implemented and used by the frontend.
- **Known Issues:**
  - The chat UI does not append new messages after send, even though the backend saves them and the reloadKey changes.
  - There may be a race condition or state mismatch between the send and reload logic.
  - The agent's first message is always generated as a response to a user message, even if none exists.

### Recommendations & Next Steps

#### For the Next Developer
1. **Live Chat Update Bug:**
   - Investigate why ChatInterface does not update after send, even when reloadKey changes.
   - Add more granular logging to confirm when messages are fetched and what is returned.
   - Consider using a callback or event to trigger a reload after the backend confirms both user and agent messages are saved.
   - Check for any async race conditions or React state batching issues.

2. **Agent's First Message Context:**
   - Ensure the agent's first message is always generated as a true greeting, not as a response to a user message.
   - In the backend, if the message is empty and step is 0, generate a pure greeting and do not include user context.

3. **UI/UX Improvements:**
   - Make the chat visually indicate when the agent is "thinking" or responding.
   - Consider optimistic UI updates: append the user's message immediately, then replace with the backend's canonical message after confirmation.

4. **Testing:**
   - Add more Cypress E2E tests for onboarding, especially for the first message and live updates.
   - Add backend unit tests for the onboarding message endpoint to ensure empty user messages are ignored.

5. **Documentation:**
   - This document now includes a knowledge dump of the current state, issues, and recommendations.
   - All code changes are up to date as of this writing.

#### Known Gaps
- The chat UI does not update in real time after send.
- The agent's first message may still reference a user message that was never sent.
- There may be subtle state or async issues in the frontend message reload logic.

---

**Hand-off complete.** The next developer should start by reviewing the live chat update logic in the frontend and the onboarding message handling in the backend. All other major features and fixes are in place.
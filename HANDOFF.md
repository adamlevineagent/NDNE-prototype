# Handoff: Praxis Agent Onboarding Debugging and Implementation

## Task

Continue debugging and perfecting the Praxis Agent onboarding experience in the NDNE prototype.

## Current Status

Significant progress has been made on the onboarding flow:

*   **FSM-based Onboarding:** The backend implements the canonical 8-step FSM flow.
*   **Scenario Service:** Provides dynamic issues from the database with fallback.
*   **Onboarding Prompts:** Canonical prompts are in place.
*   **Proactive Agent Message:** The agent sends a proactive hello only if the chat history is empty.
*   **No Phantom User Message:** Empty user messages are ignored by the backend.
*   **JWT Auth:** Frontend fetches include JWT.
*   **Reset Onboarding:** Functionality to reset onboarding state exists.
*   **Live Chat Updates (FIXED):** The frontend now optimistically adds the user's message to the chat immediately after sending. The backend response containing the saved user and agent messages is then used to update the chat history, replacing the temporary message and adding the agent's reply.
*   **Agent's First Message Context (PARTIALLY FIXED):** The initial greeting at step 0 is now handled directly without an LLM call if the user's message is empty.

## Remaining Issue

*   **Agent's Response Name:** When the user provides a nickname for the agent (at step 0), the agent's subsequent response content still uses the old default name ("Agent") instead of the new nickname.

## Technical Details of Remaining Issue

The `conductOnboardingChat` function in `backend/src/services/agent-service.ts` updates the agent's name in the database after processing the user's message at step 0. However, the LLM prompt for the agent's response is constructed *before* this database update is reflected in the `agent` object used to build the prompt. Therefore, the LLM uses the old name when generating the response content.

## Files Modified

*   `frontend/src/components/OnboardingChat.tsx`: Implemented optimistic UI update for user messages and updated agent state after fetching agent info.
*   `frontend/src/components/chat/ChatInterface.tsx`: Added `newMessages` prop to append messages and removed `reloadKey` dependency for initial fetch. Exported `ChatMessage` interface.
*   `backend/src/services/agent-service.ts`: Exported `callLLM`, imported `extractPreferences`, declared `extractedPreferences` at the correct scope, called `extractPreferences` in case 8, removed local extraction function, and included `extractedPreferences` in the return object. Added logic to handle initial empty message at step 0 without LLM call.
*   `backend/src/services/preference-extractor.ts`: Modified `extractPreferences` to accept messages with `role` instead of `sender`.
*   `backend/src/services/chat-service.ts`: Reviewed and confirmed `getConversationContext` returns messages with `role`.
*   `backend/src/routes/onboarding.ts`: Confirmed usage of `conductOnboardingChat` for onboarding messages.

## Next Steps

1.  **Fix Agent Name in Response:** Modify the `conductOnboardingChat` function in `backend/src/services/agent-service.ts`. After the database update for the agent's name at step 0, ensure the updated agent object (or at least the new name) is used when constructing the LLM prompt for the agent's response. This might involve re-fetching the agent object or manually updating the agent object in memory before building the prompt.
2.  **Continue Onboarding Implementation:** Proceed with implementing the remaining steps of the 8-step FSM in `conductOnboardingChat` and the corresponding frontend updates in `OnboardingChat.tsx`.
3.  **Implement Preference Extraction Logic:** Refine the `extractPreferences` function in `backend/src/services/preference-extractor.ts` to accurately parse the required preferences from the conversation history based on the FSM steps.
4.  **Testing:** Add comprehensive unit and E2E tests for the completed and remaining parts of the onboarding flow as outlined in `core-test-implementation-plan.md`.
# NDNE Prototype Handoff Document

## Critical Issues - Onboarding Flow

### Issue 1: Onboarding FSM and LLM Prompt Mismatch
**(Resolved)** The LLM prompt (`onboarding-prompts.ts`) and backend FSM (`agent-service.ts`) were updated to follow the same 8-step sequence.

### Issue 2: Agent Name Not Updating
**(Resolved)** The agent name is now updated immediately after step 0 in `agent-service.ts`.

### Issue 3: Issues Matrix Never Displaying / Incorrect Data
**(Partially Resolved - In Progress)**
- **Problem:** The "Positions Matrix" (formerly Issues Matrix) still displays incorrect data after issue selection. Specifically, after selecting issues (e.g., "1, 5, 6"), the matrix incorrectly shows "Key Points: 1, 5, 6" for the first issue before any stance is provided. It also fails to display the full issue titles and longform perspective summaries.
- **Root Cause:** The frontend logic (`OnboardingChat.tsx`) was incorrectly using the issue selection string as the "reason" for the first issue. The backend logic (`agent-service.ts`) was also not correctly updating the matrix for the first issue or saving the full title/description/summary.
- **Current Status:**
    - Backend (`agent-service.ts`) updated to:
        - Save `title`, `description`, `stance`, `reason`, and `summary` (mapped perspective) for each issue in `issuesMatrix`.
        - Only update the matrix after a valid stance is provided (not for the selection string).
        - Log the `issuesMatrix` state after updates for debugging.
    - Frontend (`IssuesMatrix.tsx`) updated to:
        - Display `title`, `description`, `stance` badge, and `summary`/`reason`.
        - Only show "Perspective" section if `summary` or valid `reason` exists.
    - Frontend (`OnboardingChat.tsx`) updated to:
        - Rely solely on `extractedPreferences.issuesMatrix` from the backend for matrix state.
        - Removed local `updateIssueMatrix` logic.
- **Remaining Issue:** The bug persists where the selection string appears as "Key Points" for the first issue. Further debugging is needed, likely focusing on the exact timing and data flow between the backend FSM state transitions and the frontend state updates.

### Issue 4: Step Counter Incorrect
**(Resolved)** The UI shows "Step X of 9" for the updated 9-step process (steps 0-8).
- **Fix:** Updated `OnboardingProgress` in `OnboardingChat.tsx` to show "Step X of 9".
- **Fix:** Fixed step numbering inconsistency in `onboarding-prompts.ts` by updating the step list to correctly use steps 0-8 (9 steps total).
- **Fix:** Fixed duplicate "Step 2" in the step list to ensure correct progression through all steps.

### Issue 5: User Name Not Collected
**(Resolved)** The onboarding flow now asks for the user's name at step 0.
- **Fix:** Added step 0 to ask for the user's name and update the User model.
- **Fix:** Updated step numbering in prompts and UI to account for 9 steps (0-8).
- **Fix:** Modified agent-service.ts to save the user's name to the database.

### Issue 6: JSON Output in Chat
**(Resolved)** The final onboarding step no longer outputs raw JSON preference summary.
- **Fix:** Removed JSON summary instruction from `onboarding-prompts.ts`.
- **Fix:** Updated the final step instructions to only show a friendly message.
- **Fix:** Added explicit JSON filtering in `agent-service.ts` to prevent any JSON from appearing in the final response.
- **Fix:** Enhanced the extraction prompt to specify that JSON is for internal use only.
- **Fix:** Fixed step numbering consistency in default messages (1/9 instead of 1/7).
- **Fix:** Added more robust JSON detection using a regex that searches for specific JSON keys.

### Issue 7: No Redirect After Onboarding
**(Resolved)** Onboarding now correctly redirects to the dashboard upon completion.
- **Fix:** Added additional metadata field `onboardingComplete` for compatibility.
- **Fix:** Added logging to help debug completion detection issues.
- **Fix:** Added redundant completion checks on both the response object and agent message metadata.
- **Fix:** Enhanced error handling to prevent silent failures.
- **Fix:** Fixed an issue where `onboardingCompleted` was not being set consistently by adding a check to always mark onboarding as completed in step 8.
- **Fix:** Added additional debug logging to verify that `onboardingCompleted` is being properly set.
- **Additional Fixes (April 24):**
  - Enhanced onboarding completion detection to check multiple conditions (step=8 or nextStep>=8)
  - Added robust retry mechanisms for setting the `onboardingCompleted` flag in the database
  - Improved `handleOnboardingComplete` with multiple navigation approaches and timeout fallbacks
  - Enhanced the initial agent check to properly use the improved navigation method
  - Added early returns after navigation triggers to prevent further code execution

### Issue with Issues Matrix
**(New - Resolved)** The Issues Matrix was displaying "Key Points: 1, 5, 6" incorrectly for the first issue.
- **Fix:** Prevented issue selection string from being stored as reason in agent-service.ts.
- **Fix:** Enhanced type checking in IssuesMatrix.tsx to properly handle reason/summary fields.
- **Fix:** Added support for description fields in issue matrices.
- **Fix:** Added better empty string checking to avoid rendering empty fields.

### Issue 8: Final Message Still Shows Step Indicator
**(Resolved)** The final onboarding message no longer displays "Step 7 of 9" or any step indicator.
- **Fix:** Removed the step number prefix "(9/9)" from the final agent response in `agent-service.ts`
- **Fix:** Ensured the final message appears without any step indicator or numbering
- **Fix:** Added additional logging to verify the correct formatting of the final message

## Resetting Onboarding State

If you need to reset the onboarding process for a user to test changes:

1.  **Identify User and Agent:** You need the `userId` and `agentId` for the user you want to reset. You can often find these in application logs or by inspecting network requests in your browser's developer tools during login or onboarding.
2.  **Use the Reset Endpoint:** Send a POST request to the `/api/onboarding/reset` endpoint. You can use tools like `curl`, Postman, or Insomnia.

    **Example using `curl`:**
    ```bash
    # Replace YOUR_JWT_TOKEN, YOUR_USER_ID, and YOUR_AGENT_ID with actual values
    curl -X POST \
      http://localhost:3001/api/onboarding/reset \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer YOUR_JWT_TOKEN" \
      -d '{
            "agentId": "YOUR_AGENT_ID"
          }'
    ```
    *(Note: Ensure the backend server is running, typically on port 3001)*

3.  **Verification:** The endpoint should return a success message. This action will:
    *   Reset the agent's `name`, `color`, and `preferences` to defaults.
    *   Set `onboardingCompleted` to `false`.
    *   Delete all onboarding-related chat messages for that user/agent.
4.  **Refresh Frontend:** Refresh the onboarding page (`/onboarding`) in the browser. The process should start again from step 0.

---
*This document reflects the state as of 2025-04-24 7:25 AM PT.*
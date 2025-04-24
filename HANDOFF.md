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
**(New)** The UI shows "Step X of 7" but there are 8 steps (0-7).
- **Fix:** Updated `OnboardingProgress` in `OnboardingChat.tsx` to show "Step X of 8".

### Issue 5: User Name Not Collected
**(New)** The onboarding flow does not ask for the user's actual name.
- **Plan:** Add a new step 0 to ask for the user's name, update Prisma schema, save name to User model, update prompts, and update step counter to 9 steps (0-8). *(Partially attempted, needs completion)*.

### Issue 6: JSON Output in Chat
**(New)** The final onboarding step outputs the raw JSON preference summary into the chat window.
- **Plan:** Remove the JSON summary from the final step's `agentResponseContent` in `agent-service.ts`.

### Issue 7: No Redirect After Onboarding
**(New)** Completing onboarding no longer redirects the user to the dashboard.
- **Plan:** Investigate `handleSendMessage` and `handleOnboardingComplete` in `OnboardingChat.tsx` to ensure `navigate('/dashboard')` is called correctly when `completedOnboarding` is true.

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
*This document reflects the state as of 2025-04-23 10:45 PM PT.*
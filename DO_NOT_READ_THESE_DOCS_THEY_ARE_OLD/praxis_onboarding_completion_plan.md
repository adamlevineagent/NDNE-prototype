# Praxis Agent Onboarding Completion Plan

## Overview

This document provides a comprehensive implementation plan for the NDNE (No Decision is Never Easy) Praxis Agent onboarding system. The goal is to update the current implementation to use the canonical Praxis Agent onboarding flow described in `praxis-agent-onboarding.md`, while ensuring that the system uses dynamic issues from the database rather than hardcoded Grants Pass issues.

## Current System Context

The NDNE platform uses AI agents (Praxis Agents) to help users make group decisions through a structured process. The onboarding flow is critical as it's the first interaction users have with their agent and sets the foundation for how well the agent can represent their interests.

### Key Components

1. **Database Schema**: The system uses an `ExampleProposal` table to store sample issues for onboarding.
2. **Agent Service**: Handles the core logic for agent interactions and onboarding.
3. **Scenario Service**: Provides access to example proposals and archetypes.
4. **Onboarding Prompts**: Templates for LLM-driven onboarding conversations.
5. **Chat/UI Components**: Frontend interface for the onboarding flow.

### Current Issues

1. The onboarding process uses hardcoded Grants Pass issues rather than dynamic issues from the database.
2. The implementation doesn't follow the canonical onboarding flow defined in `praxis-agent-onboarding.md`.
3. The logic for stage progression is basic and doesn't follow the FSM (Finite State Machine) approach specified.

## Implementation Plan

### 1. Database Setup and Scenario Seeding

#### Ensure Example Issues are Available

The system should automatically run the scenario-seed.ts script at startup to ensure the ExampleProposal table always has data, even in a fresh environment.

```javascript
// Update backend/src/index.ts to include this at startup
import { seedScenarios } from './prisma/scenario-seed';

// After database connection but before starting the server
await seedScenarios().catch(e => {
  console.error('Error seeding scenarios, but continuing startup:', e);
});
```

#### Implement Fallback Mechanism

Modify the scenario service to always provide a fallback when no issues are in the database:

```typescript
// In scenario-service.ts
export async function getExampleProposalsWithFallback() {
  const dbProposals = await getExampleProposals();
  
  if (dbProposals.length > 0) {
    return dbProposals;
  }
  
  // Return fallback proposals if none in DB
  return [
    {
      title: 'Community Garden Initiative',
      description: 'Proposal to convert empty lot into community garden space',
      category: 'environment',
      stances: [
        { perspective: 'Environmental', opinion: 'Supports green space development', supports: true },
        { perspective: 'Economic', opinion: 'Concerns about maintenance costs', supports: false }
      ],
      probeQuestion: 'How important is community green space to you?'
    },
    // Add more fallback proposals as needed
  ];
}
```

### 2. Create Issue Formatter for Onboarding Menu

Add a specialized function to format issues for the numbered menu format required by the onboarding spec:

```typescript
// In scenario-service.ts
export async function getFormattedIssuesForOnboardingMenu() {
  const proposals = await getExampleProposalsWithFallback();
  
  // Format as numbered menu items for step 1
  return proposals.map((proposal, index) => {
    // Extract a short title (e.g., "Water rates" from "Water-Treatment Plant Funding Gap")
    const shortTitle = proposal.title.split(' ').slice(0, 2).join(' ').replace(/-/g, ' ');
    return `${index+1}-${shortTitle}`;
  }).join('  ');
}

export async function getFullIssueDetails() {
  const proposals = await getExampleProposalsWithFallback();
  
  // Create a map of issue number to full details for step 2
  return proposals.reduce((acc, proposal, index) => {
    acc[index+1] = {
      title: proposal.title,
      description: proposal.description,
      stances: proposal.stances,
      probeQuestion: proposal.probeQuestion
    };
    return acc;
  }, {});
}
```

### 3. Update Onboarding Prompts

Completely replace the current onboarding prompts with the canonical ones from the spec:

```typescript
// In onboarding-prompts.ts
export const ONBOARDING_SYSTEM_PROMPT = `
You are a Praxis Agent performing FAST onboarding.

Rules:
• Follow steps 0-8 strictly; ONE prompt per step. No meta-discussion.
• Use the live issue list from the database.
• At Step 1, present the numbered list exactly as provided; accept comma-separated replies.
• At Step 2, iterate ONLY over issues the user selected, in the order they listed.
  Ask: "Issue X – <title>: SUPPORT, OPPOSE, or DEPENDS? One-line reason."
• Do not ask how to negotiate or how governance works.
• Store answers in memory under keys:
  agentNickname, selectedIssues[], issueStances[], topPriorityIssue,
  dealBreakers[], uiColor, notifyPref, initialIdeas[].
• After Step 8, send JSON summary then say:
  "All set! Ask me anything or explore proposals whenever you're ready."

Tone:
  Friendly, concise (≤2 sentences each turn).
Progress tags:
  Prefix each step with "(step / total)".
`;

export const ONBOARDING_PREFERENCE_EXTRACTION_PROMPT = `
Extract a JSON object with these keys from the conversation:

agentNickname: string|null
selectedIssues: string[]          // issue numbers as strings
issueStances: {issue:string, stance:string, reason:string}[]
topPriorityIssue: string|null
dealBreakers: string[]            // may be empty
uiColor: string|null
notifyPref: string|null           // "major","weekly","all" or null
initialIdeas: string[]            // may be empty

Return ONLY valid JSON.
`;
```

### 4. Implement the FSM in Agent Service

Completely refactor the `conductOnboardingChat` function to implement the 8-step FSM from the specification:

```typescript
// In agent-service.ts
export async function conductOnboardingChat(
  userId: string,
  agentId: string,
  message: string,
  metadata?: { 
    step?: number;
    selectedIssues?: string[];
    issueQueue?: string[];
    currentIssueIndex?: number;
  }
): Promise<{
  response: string;
  extractedPreferences?: Record<string, any>;
  nextStep?: number;
  completedOnboarding?: boolean;
  metadata?: any;
}> {
  try {
    // Import services
    const chatService = await import('./chat-service');
    const scenarioService = await import('./scenario-service');
    
    // Get conversation context
    const context = await chatService.default.getConversationContext(agentId, userId, 20);
    
    // Get agent details
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { name: true, color: true, preferences: true }
    });
    
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Initialize or use provided metadata
    const step = metadata?.step ?? 0;
    let selectedIssues = metadata?.selectedIssues ?? [];
    let issueQueue = metadata?.issueQueue ?? [];
    let currentIssueIndex = metadata?.currentIssueIndex ?? 0;
    
    // Get issues from database
    const issuesForMenu = await scenarioService.default.getFormattedIssuesForOnboardingMenu();
    const issueDetails = await scenarioService.default.getFullIssueDetails();
    
    // Step-specific instructions based on the 0-8 FSM
    let stepInstructions = '';
    let response = '';
    let nextStep = step;
    let completedOnboarding = false;
    
    // FSM logic
    switch (step) {
      case 0: // Greeting & Nickname
        stepInstructions = `(1/8) Welcome! I'm your Praxis Agent. Pick a short name for me when we chat.`;
        nextStep = 1;
        break;
        
      case 1: // Issue Menu
        stepInstructions = `(2/8) Here are the issues being discussed right now. Reply with the numbers you care about (e.g., 1,3,5).
        
        ${issuesForMenu}`;
        nextStep = 2;
        
        // Process the user's response to extract selected issues
        if (message) {
          selectedIssues = extractIssueNumbers(message);
          issueQueue = [...selectedIssues]; // Create a queue for step 2
        }
        break;
        
      case 2: // Stance Loop
        if (issueQueue.length === 0) {
          // If no more issues to process, move to next step
          nextStep = 3;
          stepInstructions = generateStep3Instruction();
          break;
        }
        
        const currentIssueNumber = issueQueue[0];
        const currentIssue = issueDetails[currentIssueNumber];
        
        if (!currentIssue) {
          // If issue not found, skip it
          issueQueue.shift();
          stepInstructions = `I don't have details for that issue. Let's move on.`;
          break;
        }
        
        // Generate stance question for current issue
        stepInstructions = `(3/8) Issue ${currentIssueNumber} – ${currentIssue.title}: SUPPORT, OPPOSE, or DEPENDS? One line why.`;
        
        // Pop the issue from queue after processing
        issueQueue.shift();
        
        // If queue is now empty, we'll advance to step 3 on next message
        if (issueQueue.length === 0) {
          nextStep = 3;
        }
        break;
        
      case 3: // Top Priority
        stepInstructions = `(4/8) Of those issues, which ONE matters most to you right now?`;
        nextStep = 4;
        break;
        
      case 4: // Deal-Breakers
        stepInstructions = `(5/8) Is there any outcome you absolutely could NOT accept in group decisions? One sentence or type 'none'.`;
        nextStep = 5;
        break;
        
      case 5: // Display Color
        stepInstructions = `(6/8) Pick a highlight color for charts (word or hex).`;
        nextStep = 6;
        break;
        
      case 6: // Notify Pref
        stepInstructions = `(7/8) How often should I brief you? A-major items only B-weekly digest C-every decision.`;
        nextStep = 7;
        break;
        
      case 7: // Proposal Seed
        stepInstructions = `(8/8) Any idea or proposal you'd like me to log for later? If none, just say 'done'.`;
        nextStep = 8;
        break;
        
      case 8: // Summary & Finish
        // Extract JSON from conversation
        const preferences = await extractPreferencesFromConversation(context);
        
        // Format a nice JSON summary
        const summaryJSON = JSON.stringify(preferences, null, 2);
        
        stepInstructions = `Great! Here's a summary of what I learned:
        
        \`\`\`json
        ${summaryJSON}
        \`\`\`
        
        All set! Ask me anything or explore proposals whenever you're ready.`;
        
        completedOnboarding = true;
        
        // Update agent preferences with extracted data
        await updateAgentPreferences(agentId, preferences);
        break;
    }
    
    // Create prompt for the LLM
    const systemPrompt = ONBOARDING_SYSTEM_PROMPT;
    
    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}
        
        Current onboarding step: ${step}
        ${issuesForMenu ? `Current issues: ${issuesForMenu}` : ''}
        
        ${stepInstructions}`
      },
      // Add context from previous messages
      ...context.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      // Add the new message
      {
        role: 'user',
        content: message
      }
    ];
    
    // Call LLM
    const { content } = await callLLM(messages, DEFAULT_MODEL, { agentId });
    
    // Save the user message
    await chatService.default.saveMessage(userId, agentId, message, 'user', { 
      isOnboarding: true, 
      step
    });
    
    // Save the agent response with metadata
    await chatService.default.saveMessage(userId, agentId, content, 'agent', {
      isOnboarding: true,
      step,
      nextStep,
      completedOnboarding
    });
    
    // If this was the completion step, update agent
    if (completedOnboarding) {
      await prisma.agent.update({
        where: { id: agentId },
        data: { onboardingCompleted: true }
      });
    }
    
    // Return response with updated metadata for next call
    return {
      response: content,
      nextStep,
      completedOnboarding,
      metadata: {
        step: nextStep,
        selectedIssues,
        issueQueue,
        currentIssueIndex: issueQueue.length > 0 ? currentIssueIndex + 1 : 0
      }
    };
  } catch (error) {
    console.error('Error during onboarding chat:', error);
    return {
      response: "I'm sorry, I encountered an error during our onboarding conversation. Let's continue.",
      nextStep: step
    };
  }
}

// Helper functions
function extractIssueNumbers(message: string): string[] {
  // Extract numbers like 1,3,5 or 1, 3, 5 or "1 3 5" from user message
  const numberPattern = /\d+/g;
  const matches = message.match(numberPattern) || [];
  return matches;
}

async function extractPreferencesFromConversation(context: any[]): Promise<any> {
  // Format conversation for extraction
  const conversationText = context
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');
  
  // Call LLM with extraction prompt
  const { content } = await callLLM([
    { role: 'system', content: ONBOARDING_PREFERENCE_EXTRACTION_PROMPT },
    { role: 'user', content: conversationText }
  ]);
  
  // Parse JSON response (with error handling)
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse JSON preferences:', e);
    return {};
  }
}

async function updateAgentPreferences(agentId: string, preferences: any) {
  try {
    const currentPreferences = (await prisma.agent.findUnique({
      where: { id: agentId },
      select: { preferences: true }
    }))?.preferences || {};
    
    // Merge existing preferences with new ones
    const mergedPreferences = {
      ...currentPreferences,
      ...preferences,
      onboardingCompletedAt: new Date().toISOString()
    };
    
    // Update agent record
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        preferences: mergedPreferences,
        name: preferences.agentNickname || 'Praxis Agent',
        color: preferences.uiColor || '#4299E1'
      }
    });
    
    return true;
  } catch (e) {
    console.error('Failed to update agent preferences:', e);
    return false;
  }
}

function generateStep3Instruction() {
  return `(4/8) Of those issues, which ONE matters most to you right now?`;
}
```

### 5. Update Frontend Onboarding Flow

Modify the frontend to handle the revised FSM approach:

```typescript
// In OnboardingChat.tsx
const OnboardingChat: React.FC = () => {
  const [step, setStep] = useState(0);
  const [metadata, setMetadata] = useState<any>({});
  const { user } = useAuth();
  
  const handleSendMessage = async (message: string) => {
    try {
      // Send message to backend with current step and metadata
      const response = await api.post('/api/onboarding/message', {
        message,
        step: metadata.step || 0,
        selectedIssues: metadata.selectedIssues,
        issueQueue: metadata.issueQueue,
        currentIssueIndex: metadata.currentIssueIndex
      });
      
      // Update state with new step and metadata
      setStep(response.data.nextStep);
      setMetadata(response.data.metadata);
      
      // Check if onboarding completed
      if (response.data.completedOnboarding) {
        // Redirect to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error sending onboarding message:', error);
    }
  };
  
  return (
    <div className="onboarding-chat">
      <div className="progress-indicator">
        Step {step + 1} of 8
      </div>
      <ChatInterface 
        onSendMessage={handleSendMessage}
        isOnboarding={true}
      />
    </div>
  );
};
```

### 6. Create Onboarding API Route

Create a dedicated endpoint for onboarding to ensure proper metadata handling:

```typescript
// In routes/onboarding.ts
import { Router } from 'express';
import { conductOnboardingChat } from '../services/agent-service';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.post('/message', requireAuth, async (req, res) => {
  try {
    const { message, step, selectedIssues, issueQueue, currentIssueIndex } = req.body;
    const userId = req.user.id;
    
    // Get agent ID for this user
    const agent = await prisma.agent.findFirst({
      where: { userId }
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found for user' });
    }
    
    // Process message with FSM
    const result = await conductOnboardingChat(userId, agent.id, message, {
      step,
      selectedIssues,
      issueQueue,
      currentIssueIndex
    });
    
    return res.json(result);
  } catch (error) {
    console.error('Error in onboarding message route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### 7. Testing Strategy

#### Unit Tests

Create focused tests for each component of the onboarding system:

1. Test scenario service functions for issue formatting
2. Test preference extraction from conversations
3. Test FSM state transitions
4. Test the onboarding API endpoint

```typescript
// In tests/onboarding.spec.ts
describe('Onboarding FSM', () => {
  it('should progress from step 0 to step 1', async () => {
    // Test implementation
  });
  
  it('should handle issue selection and create queue', async () => {
    // Test implementation
  });
  
  it('should progress through issue stances for all selected issues', async () => {
    // Test implementation
  });
  
  // More tests...
});
```

#### End-to-End Tests

Create a Cypress test for the full onboarding flow:

```typescript
// In cypress/e2e/onboarding.cy.ts
describe('Onboarding Flow', () => {
  beforeEach(() => {
    // Create test user and log in
    cy.createTestUser();
    cy.login();
  });
  
  it('should complete all onboarding steps', () => {
    // Step 0: Provide agent name
    cy.findByRole('textbox').type('Spark{enter}');
    
    // Step 1: Select issues
    cy.findByText(/Here are the issues/i).should('be.visible');
    cy.findByRole('textbox').type('1,3{enter}');
    
    // Step 2: Provide stance on first issue
    cy.findByText(/SUPPORT, OPPOSE, or DEPENDS/i).should('be.visible');
    cy.findByRole('textbox').type('Support, clean water is essential{enter}');
    
    // Step 2: Provide stance on second issue
    cy.findByText(/SUPPORT, OPPOSE, or DEPENDS/i).should('be.visible');
    cy.findByRole('textbox').type('Oppose, too expensive{enter}');
    
    // Step 3: Top priority
    cy.findByText(/which ONE matters most/i).should('be.visible');
    cy.findByRole('textbox').type('Clean water{enter}');
    
    // Step 4: Deal-breakers
    cy.findByText(/absolutely could NOT accept/i).should('be.visible');
    cy.findByRole('textbox').type('Cost increases over 10%{enter}');
    
    // Step 5: Display color
    cy.findByText(/highlight color/i).should('be.visible');
    cy.findByRole('textbox').type('blue{enter}');
    
    // Step 6: Notification preference
    cy.findByText(/How often should I brief you/i).should('be.visible');
    cy.findByRole('textbox').type('B{enter}');
    
    // Step 7: Proposal idea
    cy.findByText(/Any idea or proposal/i).should('be.visible');
    cy.findByRole('textbox').type('Explore community-funded water project{enter}');
    
    // Step 8: Summary and completion
    cy.findByText(/All set!/i).should('be.visible');
    
    // Verify redirection to dashboard
    cy.url().should('include', '/dashboard');
  });
});
```

### 8. Documentation Updates

Update the system documentation to reflect the new onboarding process:

1. Add JSDoc comments to all functions
2. Update README with onboarding flow explanation
3. Create specific documentation for the FSM implementation

## Technical Considerations

### 1. Error Handling

Ensure robust error handling throughout the onboarding process:

- Graceful fallbacks if issues can't be loaded
- Recovery mechanisms for disrupted conversations

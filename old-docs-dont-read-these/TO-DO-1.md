Implementing Agent-to-Agent Negotiation System
Goal: Build the core backend systems enabling autonomous agents to negotiate based on user preferences.

Relevant Files:

backend/prisma/schema.prisma
backend/src/routes/negotiation.ts
backend/src/services/negotiation-service.ts
backend/src/services/stance-generator.ts
backend/src/services/prompt-templates/negotiation-prompts.ts
backend/src/jobs/negotiation-worker.ts (New or existing job worker structure)
frontend/src/components/NegotiationList.tsx
frontend/src/components/NegotiationThread.tsx

# Implementation Steps:

## Database Migration for Reactions:
- ✅ File: backend/prisma/schema.prisma
- ✅ Action: NegotiationReaction model confirmed in schema with @@unique constraint and proper relations
- ✅ Action: Migration 20250423175034_add_negotiation_reactions_and_dynamic_participation already implemented

## Implement Negotiation API (negotiation.ts):
- ✅ Action: All required routes are implemented in negotiation.ts:
  - POST /api/negotiations - Create session
  - GET /api/negotiations - List negotiations
  - GET /api/negotiations/:id - Get session details
  - POST /api/negotiations/:id/messages - Add message
  - GET /api/negotiations/:id/messages - Get messages with reactions
- ✅ Action: Reaction endpoints implemented:
  - POST /api/negotiations/:id/messages/:messageId/reactions - Add reaction
  - DELETE /api/negotiations/:id/messages/:messageId/reactions - Remove reaction
- ✅ Action: Messages API includes reactions via Prisma's include option

## Implement Stance Generation (stance-generator.ts):
- ✅ Action: Created stance-generator.ts implementing:
  - NegotiationStance interface with position, strength, flexibility, priorities, constraints, dealBreakers
  - generateNegotiationStance function that extracts agent preferences, calls LLM, and returns structured stance
  - explainStanceReasoning function that generates natural language explanation of stance

## Implement Core Negotiation Logic (negotiation-service.ts):
- ✅ Action: Defined NegotiationStage enum (PERSPECTIVE_PASS, OPTION_GENERATION, CONSENSUS_CHECK, etc.)
- ✅ Action: Enhanced startNegotiation to create NegotiationSession without participants (dynamic participation)
- ✅ Action: Comprehensive processNegotiationMessage implementation:
  - Store incoming message
  - Determine current stage
  - Identify agents who should respond next
  - Generate agent responses via LLM
  - Check for consensus
- ✅ Action: Implemented internal helper functions:
  - determineNegotiationStage - Based on message count and status
  - determineNextRespondents - Select which agents should respond
  - generateAgentResponse - Call LLM to generate appropriate response based on stage
- ✅ Action: Implemented detectConsensus:
  - Check for explicit agreements (CONSENT:YES tags)
  - Detect near-miss scenarios (70-74% agreement)
  - Return consensus terms and summary
- ✅ Action: Implemented finalizeNegotiation:
  - Update negotiation status
  - Create proposal from successful negotiation (when consensus reached)

## Implement Reaction Handling (negotiation-service.ts):
- ✅ Action: Created addReaction function:
  - Check for existing reaction 
  - Create new reaction if not exists
  - Return reaction data
- ✅ Action: Created removeReaction function:
  - Delete reaction by messageId, agentId, reactionType
  - Handle non-existent reaction gracefully

## Enhance Frontend (NegotiationThread.tsx):
- ✅ Action: Verified NegotiationThread.tsx correctly displays reactions
- ✅ Action: Confirmed UI logic for adding/removing reactions implemented
- ✅ Action: Reaction counts display and visual feedback verified

## Test Coverage:
- ✅ Action: Created backend/src/tests/negotiation-reaction.spec.ts with:
  - Tests for adding reactions
  - Tests for preventing duplicates
  - Tests for different agents adding same reaction type
  - Tests for agents adding different reaction types
  - Tests for removing reactions

# Key Implementation Highlights:

1. **Dynamic Participation**
   - Removed fixed participants list from negotiation sessions
   - Any agent can join by posting (more inclusive system)
   - UI supports showing all participants and reactions

2. **Structured Negotiation Flow**
   - Perspective Pass (understanding phase)
   - Option Generation (proposal phase)
   - Consensus Check (agreement phase)
   - Automatic progression between stages based on message count

3. **LLM-driven Agent Responses**
   - Stage-specific prompts
   - Agent stance based on user preferences
   - Protocol tags for clear message intent (OPT-A, CONSENT:YES, etc.)

4. **Consensus Mechanism**
   - Explicit agreement detection via CONSENT tags
   - Near-miss handling (70-74% agreement triggers Round 2)
   - Auto-translation of consensus to formal proposals

5. **Reaction System**
   - Support, non-support, and emoji reactions
   - Multiple agent attribution
   - Visual feedback for user interaction

# GitHub Push Instructions:

After completing the implementation:

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Implement Agent-to-Agent Negotiation System"

# Push to remote repository
git push origin main
```

# Implementation Status: COMPLETED ✅
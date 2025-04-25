Implementing Proposal & Negotiation Integration
Goal: Connect completed negotiations to the proposal system and allow user feedback on agent performance.

Relevant Files:

backend/src/services/negotiation-to-proposal.ts (New)
backend/src/services/feedback-service.ts (New)
backend/src/routes/negotiation.ts (Extend)
backend/src/routes/feedback.ts (New)
backend/src/routes/proposal.ts (Potentially extend)
backend/prisma/schema.prisma
frontend/src/pages/ProposalDetail.tsx
frontend/src/components/NegotiationFeedback.tsx (New)
frontend/src/components/NegotiationHistory.tsx (New)
Implementation Steps:

Create Negotiation-to-Proposal Service:
File: backend/src/services/negotiation-to-proposal.ts
Action: Implement createProposalFromNegotiation(negotiationId: string):
Fetch the NegotiationSession and its messages.
Verify status is 'completed' and consensus was reached.
Call LLM (using a new summarization prompt) to generate a concise title and description for the Proposal based on the negotiation's consensus terms.
Extract other necessary fields (e.g., type, amount if applicable) from negotiation metadata or consensus terms.
Create a new Proposal record using prisma.proposal.create, setting the negotiationId, isNegotiated: true, and negotiationSummary.
Return the ID of the newly created proposal.
Implement API Endpoint:
File: backend/src/routes/negotiation.ts
Action: Add a POST /api/negotiations/:id/propose route. This route should call negotiation-service.detectConsensus first. If consensus is confirmed, it then calls negotiation-to-proposal.createProposalFromNegotiation. Return the created proposal details or an error.
Enhance ProposalDetail.tsx:
Action: Modify the component to fetch proposal data including the negotiationId, isNegotiated, and negotiationSummary fields.
Action: If isNegotiated is true:
Display the negotiationSummary.
Add a section or button to view the full "Negotiation History".
Implement or integrate a NegotiationHistory.tsx component (potentially reusing NegotiationThread.tsx logic in a read-only mode) to display the associated messages when requested.
Integrate the NegotiationFeedback.tsx component.
Implement Feedback System:
Action: Create frontend/src/components/NegotiationFeedback.tsx. Include input elements for rating (e.g., 1-5 stars) representation accuracy and a text area for comments.
Action: Create backend/src/routes/feedback.ts with POST /api/feedback/negotiation/:negotiationId endpoint. It should accept agentId, rating, comments, etc.
Action: Create backend/src/services/feedback-service.ts. Implement processFeedback to store the feedback (new Feedback model likely needed in schema.prisma). Implement updateAgentFromFeedback (optional, more complex) to potentially adjust Agent.alignmentScore or add insights to Agent.userKnowledge based on the feedback.
Action: Connect the NegotiationFeedback.tsx form submission to the new backend endpoint.
Key Considerations:

Summarization Quality: The quality of the LLM-generated proposal title/description from the negotiation history is crucial. Fine-tune the summarization prompt.
Feedback Impact: Decide how user feedback will concretely influence agent behavior or metrics. Simply storing it is the first step; acting on it requires more complex logic.
UI Flow: Ensure the transition from viewing a negotiation to viewing the resulting proposal (and vice-versa) is clear and intuitive.

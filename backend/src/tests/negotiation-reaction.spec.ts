import { PrismaClient } from "@prisma/client";
import { addReaction, removeReaction } from "../services/negotiation-service";
// TypeScript may show errors if the types aren't installed, but this is just for demonstration
// of how the test would be structured
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

const prisma = new PrismaClient();

// Mock data for testing
const mockNegotiation = {
  id: "test-negotiation-id",
  topic: "Test Negotiation Topic",
  description: "Test description for negotiation",
  status: "active",
  initiatorId: "test-initiator-agent-id",
};

const mockMessage = {
  id: "test-message-id",
  negotiationId: mockNegotiation.id,
  agentId: "test-agent-id",
  content: "Test message content",
  messageType: "statement",
};

const mockAgent1 = {
  id: "test-agent-id-1",
  name: "Test Agent 1",
};

const mockAgent2 = {
  id: "test-agent-id-2",
  name: "Test Agent 2",
};

describe("Negotiation Reaction System", () => {
  // Set up and clean up for tests
  beforeAll(async () => {
    // Create test negotiation session
    await prisma.negotiationSession.create({
      data: mockNegotiation,
    });

    // Create test message
    await prisma.negotiationMessage.create({
      data: mockMessage,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.negotiationReaction.deleteMany({
      where: {
        messageId: mockMessage.id,
      },
    });
    
    await prisma.negotiationMessage.deleteMany({
      where: {
        negotiationId: mockNegotiation.id,
      },
    });
    
    await prisma.negotiationSession.deleteMany({
      where: {
        id: mockNegotiation.id,
      },
    });
    
    await prisma.$disconnect();
  });

  it("should add a reaction to a message", async () => {
    // Add a reaction using the service function
    const reaction = await addReaction(
      mockMessage.id,
      mockAgent1.id,
      "support"
    );

    // Verify the reaction was created
    expect(reaction).toBeDefined();
    expect(reaction.messageId).toBe(mockMessage.id);
    expect(reaction.agentId).toBe(mockAgent1.id);
    expect(reaction.reactionType).toBe("support");

    // Check that the reaction exists in the database
    const dbReaction = await prisma.negotiationReaction.findFirst({
      where: {
        messageId: mockMessage.id,
        agentId: mockAgent1.id,
        reactionType: "support",
      },
    });

    expect(dbReaction).toBeDefined();
    expect(dbReaction?.messageId).toBe(mockMessage.id);
    expect(dbReaction?.agentId).toBe(mockAgent1.id);
    expect(dbReaction?.reactionType).toBe("support");
  });

  it("should prevent duplicate reactions of the same type from the same agent", async () => {
    // Try to add the same reaction again
    let error;
    try {
      await addReaction(mockMessage.id, mockAgent1.id, "support");
    } catch (e) {
      error = e;
    }

    // It shouldn't throw an error, but should return the existing reaction
    expect(error).toBeUndefined();
    
    // Check that there is still only one reaction of this type from this agent
    const reactions = await prisma.negotiationReaction.findMany({
      where: {
        messageId: mockMessage.id,
        agentId: mockAgent1.id,
        reactionType: "support",
      },
    });

    expect(reactions.length).toBe(1);
  });

  it("should allow different agents to add the same reaction type", async () => {
    // Add the same reaction type from a different agent
    const reaction = await addReaction(
      mockMessage.id,
      mockAgent2.id,
      "support"
    );

    expect(reaction).toBeDefined();
    expect(reaction.messageId).toBe(mockMessage.id);
    expect(reaction.agentId).toBe(mockAgent2.id);
    expect(reaction.reactionType).toBe("support");

    // Verify both reactions exist
    const reactions = await prisma.negotiationReaction.findMany({
      where: {
        messageId: mockMessage.id,
        reactionType: "support",
      },
    });

    expect(reactions.length).toBe(2);
  });

  it("should allow an agent to add different reaction types to the same message", async () => {
    // Add a different reaction type from the same agent
    const reaction = await addReaction(
      mockMessage.id,
      mockAgent1.id,
      "like"
    );

    expect(reaction).toBeDefined();
    expect(reaction.reactionType).toBe("like");

    // Check that both reaction types exist for the agent
    const reactions = await prisma.negotiationReaction.findMany({
      where: {
        messageId: mockMessage.id,
        agentId: mockAgent1.id,
      },
    });

    expect(reactions.length).toBe(2);
    expect(reactions.map(r => r.reactionType).sort()).toEqual(["like", "support"]);
  });

  it("should remove a reaction", async () => {
    // Remove a reaction
    await removeReaction(mockMessage.id, mockAgent1.id, "support");

    // Verify the reaction was removed
    const reaction = await prisma.negotiationReaction.findFirst({
      where: {
        messageId: mockMessage.id,
        agentId: mockAgent1.id,
        reactionType: "support",
      },
    });

    expect(reaction).toBeNull();

    // Other reactions should still exist
    const otherReaction = await prisma.negotiationReaction.findFirst({
      where: {
        messageId: mockMessage.id,
        agentId: mockAgent1.id,
        reactionType: "like",
      },
    });

    expect(otherReaction).toBeDefined();
  });

  it("should not error when removing a reaction that doesn't exist", async () => {
    // Try to remove a reaction that doesn't exist
    let error;
    try {
      await removeReaction(mockMessage.id, mockAgent1.id, "non-support");
    } catch (e) {
      error = e;
    }

    expect(error).toBeUndefined();
  });
});
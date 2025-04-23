import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Negotiation & Reaction System", () => {
  let negotiationId: string;
  let agentId: string;
  let messageId: string;

  beforeAll(async () => {
    // Create a test agent
    const agent = await prisma.agent.create({
      data: {
        userId: `test-user-${Date.now()}`,
        name: "Test Agent",
        color: "#123456",
        publicKey: "test-key",
        encryptedPrivKey: "test-priv",
        preferences: {},
        userKnowledge: {},
      },
    });
    agentId = agent.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.negotiationReaction.deleteMany({});
    await prisma.negotiationMessage.deleteMany({});
    await prisma.negotiationSession.deleteMany({});
    await prisma.agent.deleteMany({ where: { id: agentId } });
    await prisma.$disconnect();
  });

  it("should create a negotiation session", async () => {
    const session = await prisma.negotiationSession.create({
      data: {
        topic: "Test Negotiation",
        description: "Testing negotiation system",
        initiatorId: agentId,
        status: "active",
      },
    });
    negotiationId = session.id;
    expect(session.topic).toBe("Test Negotiation");
  });

  it("should allow agent to post a message (join negotiation)", async () => {
    const message = await prisma.negotiationMessage.create({
      data: {
        negotiationId,
        agentId,
        content: "Hello, I am joining this negotiation.",
        messageType: "statement",
      },
    });
    messageId = message.id;
    expect(message.content).toContain("joining");
  });

  it("should allow agent to add a reaction", async () => {
    const reaction = await prisma.negotiationReaction.create({
      data: {
        messageId,
        agentId,
        reactionType: "support",
      },
    });
    expect(reaction.reactionType).toBe("support");
  });

  it("should fetch message with reactions", async () => {
    const message = await prisma.negotiationMessage.findUnique({
      where: { id: messageId },
      include: { reactions: true },
    });
    expect(message?.reactions.length).toBeGreaterThan(0);
    expect(message?.reactions[0].reactionType).toBe("support");
  });

  it("should allow agent to remove a reaction", async () => {
    await prisma.negotiationReaction.deleteMany({
      where: { messageId, agentId, reactionType: "support" },
    });
    const message = await prisma.negotiationMessage.findUnique({
      where: { id: messageId },
      include: { reactions: true },
    });
    expect(message?.reactions.length).toBe(0);
  });
});
it("should prevent duplicate reactions by the same agent on the same message/reactionType", async () => {
  // Add first reaction
  await prisma.negotiationReaction.create({
    data: {
      messageId,
      agentId,
      reactionType: "support",
    },
  });
  // Attempt to add duplicate reaction
  let errorCaught = false;
  try {
    await prisma.negotiationReaction.create({
      data: {
        messageId,
        agentId,
        reactionType: "support",
      },
    });
  } catch (err: any) {
    errorCaught = true;
    expect(err.code).toBe("P2002"); // Unique constraint violation
  }
  expect(errorCaught).toBe(true);
});

it("should handle attempts to react with an invalid agent", async () => {
  let errorCaught = false;
  try {
    await prisma.negotiationReaction.create({
      data: {
        messageId,
        agentId: "nonexistent-agent",
        reactionType: "support",
      },
    });
  } catch (err: any) {
    errorCaught = true;
  }
  expect(errorCaught).toBe(true);
});

it("should handle attempts to react to an invalid message", async () => {
  let errorCaught = false;
  try {
    await prisma.negotiationReaction.create({
      data: {
        messageId: "nonexistent-message",
        agentId,
        reactionType: "support",
      },
    });
  } catch (err: any) {
    errorCaught = true;
  }
  expect(errorCaught).toBe(true);
});

it("should handle removal of a non-existent reaction gracefully", async () => {
  // Should not throw
  await expect(
    prisma.negotiationReaction.deleteMany({
      where: {
        messageId,
        agentId,
        reactionType: "nonexistent-reaction",
      },
    })
  ).resolves.toBeDefined();
});
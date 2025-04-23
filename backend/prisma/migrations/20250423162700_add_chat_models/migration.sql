-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender" TEXT NOT NULL DEFAULT 'user',
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NegotiationSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP,
    "initiatorId" TEXT NOT NULL,
    "participants" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "NegotiationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "negotiationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'statement',
    "referencedMessageId" TEXT,
    "metadata" TEXT,
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NegotiationMessage_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "NegotiationSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NegotiationMessage_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Modify Role handling
ALTER TABLE "User" RENAME COLUMN "role" TO "_temp_role";
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
UPDATE "User" SET "role" = 'USER' WHERE "_temp_role" = 'USER';
UPDATE "User" SET "role" = 'ADMIN' WHERE "_temp_role" = 'ADMIN';
ALTER TABLE "User" DROP COLUMN "_temp_role";

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Agent" ADD COLUMN "lastInteraction" TIMESTAMP;
ALTER TABLE "Agent" ADD COLUMN "userKnowledge" TEXT NOT NULL DEFAULT '{}';

-- Convert JSON fields to String
UPDATE "Agent" SET "preferences" = '{}' WHERE "preferences" IS NULL;
UPDATE "Agent" SET "userKnowledge" = '{}' WHERE "userKnowledge" IS NULL;
UPDATE "ConsentEvent" SET "payload" = '{}' WHERE "payload" IS NULL;
UPDATE "AuditLog" SET "details" = '{}' WHERE "details" IS NULL;

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN "negotiationId" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "isNegotiated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Proposal" ADD COLUMN "negotiationSummary" TEXT;

-- CreateIndex
CREATE INDEX "ChatMessage_userId_idx" ON "ChatMessage"("userId");
CREATE INDEX "ChatMessage_agentId_idx" ON "ChatMessage"("agentId");
CREATE INDEX "ChatMessage_timestamp_idx" ON "ChatMessage"("timestamp");

-- CreateIndex
CREATE INDEX "NegotiationSession_status_idx" ON "NegotiationSession"("status");
CREATE INDEX "NegotiationSession_startedAt_idx" ON "NegotiationSession"("startedAt");

-- CreateIndex
CREATE INDEX "NegotiationMessage_negotiationId_idx" ON "NegotiationMessage"("negotiationId");
CREATE INDEX "NegotiationMessage_agentId_idx" ON "NegotiationMessage"("agentId");
CREATE INDEX "NegotiationMessage_timestamp_idx" ON "NegotiationMessage"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_negotiationId_key" ON "Proposal"("negotiationId");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "NegotiationSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
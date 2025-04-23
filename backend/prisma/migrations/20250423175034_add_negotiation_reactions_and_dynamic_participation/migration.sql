/*
  Warnings:

  - The `preferences` column on the `Agent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `userKnowledge` column on the `Agent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `details` column on the `AuditLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `metadata` column on the `ChatMessage` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `payload` column on the `ConsentEvent` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `metadata` column on the `NegotiationMessage` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `participants` on the `NegotiationSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "preferences",
ADD COLUMN     "preferences" JSONB NOT NULL DEFAULT '{}',
DROP COLUMN "userKnowledge",
ADD COLUMN     "userKnowledge" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "details",
ADD COLUMN     "details" JSONB;

-- AlterTable
ALTER TABLE "ChatMessage" DROP COLUMN "metadata",
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "ConsentEvent" DROP COLUMN "payload",
ADD COLUMN     "payload" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "NegotiationMessage" DROP COLUMN "metadata",
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "NegotiationSession" DROP COLUMN "participants";

-- CreateTable
CREATE TABLE "NegotiationReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "reactionType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NegotiationReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NegotiationReaction_messageId_agentId_reactionType_key" ON "NegotiationReaction"("messageId", "agentId", "reactionType");

-- AddForeignKey
ALTER TABLE "NegotiationReaction" ADD CONSTRAINT "NegotiationReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "NegotiationMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationReaction" ADD CONSTRAINT "NegotiationReaction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

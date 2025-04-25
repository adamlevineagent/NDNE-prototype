-- CreateTable
CREATE TABLE "NegotiationFeedback" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "representationAccuracy" INTEGER NOT NULL,
    "comments" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NegotiationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NegotiationFeedback_negotiationId_idx" ON "NegotiationFeedback"("negotiationId");

-- CreateIndex
CREATE INDEX "NegotiationFeedback_agentId_idx" ON "NegotiationFeedback"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "NegotiationFeedback_negotiationId_agentId_key" ON "NegotiationFeedback"("negotiationId", "agentId");

-- AddForeignKey
ALTER TABLE "NegotiationFeedback" ADD CONSTRAINT "NegotiationFeedback_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "NegotiationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationFeedback" ADD CONSTRAINT "NegotiationFeedback_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
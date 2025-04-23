-- CreateTable
CREATE TABLE "PlayMoneyLedgerEntry" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayMoneyLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayMoneyLedgerEntry_proposalId_key" ON "PlayMoneyLedgerEntry"("proposalId");

-- AddForeignKey
ALTER TABLE "PlayMoneyLedgerEntry" ADD CONSTRAINT "PlayMoneyLedgerEntry_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

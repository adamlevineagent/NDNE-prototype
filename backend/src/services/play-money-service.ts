import { PrismaClient, Proposal } from '@prisma/client'; // Remove Prisma namespace import

const prisma = new PrismaClient();

/**
 * Records a transaction in the play money ledger if the proposal qualifies.
 * This should be called when a monetary, non-playMode proposal is successfully executed/closed.
 *
 * @param proposalId - The ID of the proposal that triggered the transaction.
 */
export async function recordPlayMoneyTransaction(proposalId: string): Promise<void> {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      console.warn(`Proposal ${proposalId} not found for play money transaction.`);
      return;
    }

    // Only record for non-playMode, monetary proposals that are closed (or executed)
    if (proposal.playMode || proposal.type !== 'monetary' || proposal.status !== 'closed') {
      // TODO: Refine the status check based on when proposal execution actually happens.
      console.log(`Proposal ${proposalId} does not qualify for play money ledger entry.`);
      return;
    }

    if (!proposal.amount) {
        console.warn(`Monetary proposal ${proposalId} is missing an amount.`);
        return;
    }
    // Store the validated amount in a constant
    const amountToDeduct = proposal.amount;

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => { // Revert to using 'tx' with inferred type
      // Check if an entry already exists for this proposal
      const existingEntry = await tx.playMoneyLedgerEntry.findUnique({ // Use tx
        where: { proposalId: proposalId },
      });
      if (existingEntry) {
        console.warn(`Play money ledger entry already exists for proposal ${proposalId}.`);
        return;
      }

      // Fetch current treasury balance
      const systemConfig = await tx.systemConfig.findUnique({ // Use tx
        where: { id: 1 }, // Assuming SystemConfig always has id 1
      });

      if (!systemConfig) {
        throw new Error('SystemConfig not found.');
      }

      const currentBalance = systemConfig.playMoneyTreasury;
      const transactionAmount = -amountToDeduct; // Use the validated amount
      const newBalance = currentBalance + transactionAmount;

      // Create ledger entry
      await tx.playMoneyLedgerEntry.create({ // Use tx
        data: {
          proposalId: proposalId,
          amount: transactionAmount,
          balanceAfter: newBalance,
        },
      });

      // Update treasury balance
      await tx.systemConfig.update({ // Use tx
        where: { id: 1 },
        data: { playMoneyTreasury: newBalance },
      });

      console.log(`Play money transaction recorded for proposal ${proposalId}. New balance: ${newBalance}`);
    });

  } catch (error) {
    console.error(`Failed to record play money transaction for proposal ${proposalId}:`, error);
    // Handle or re-throw error as needed
  }
}

// TODO: Integrate the call to recordPlayMoneyTransaction where appropriate,
// likely when a proposal's status is updated to 'closed' or similar execution trigger.
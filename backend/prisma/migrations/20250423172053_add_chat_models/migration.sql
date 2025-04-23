-- AlterTable
ALTER TABLE "Agent" ALTER COLUMN "preferences" SET DEFAULT '{}',
ALTER COLUMN "preferences" SET DATA TYPE TEXT,
ALTER COLUMN "lastInteraction" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "details" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ChatMessage" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ConsentEvent" ALTER COLUMN "payload" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "NegotiationMessage" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "NegotiationSession" ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3);

-- DropEnum
DROP TYPE "Role";

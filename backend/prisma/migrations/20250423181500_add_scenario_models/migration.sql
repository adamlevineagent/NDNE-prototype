-- CreateTable
CREATE TABLE "ExampleUserArchetype" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "interests" JSONB NOT NULL DEFAULT '[]',
    "concerns" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExampleUserArchetype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExampleProposal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stances" JSONB NOT NULL DEFAULT '[]',
    "probeQuestion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExampleProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExampleUserArchetype_name_key" ON "ExampleUserArchetype"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleProposal_title_key" ON "ExampleProposal"("title");

-- Add field to Agent table to store scenario preferences
ALTER TABLE "Agent" ADD COLUMN "scenarioPreferences" JSONB DEFAULT '{}';
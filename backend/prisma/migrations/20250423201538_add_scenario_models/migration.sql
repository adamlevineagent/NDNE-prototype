/*
  Warnings:

  - Made the column `scenarioPreferences` on table `Agent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Agent" ALTER COLUMN "scenarioPreferences" SET NOT NULL;

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN "monitoredDiscourseTopics" JSONB DEFAULT '{"categoryIds": [], "topicIds": []}';
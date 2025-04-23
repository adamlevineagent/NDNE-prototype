/**
 * Scenario Service
 * 
 * Provides access to realistic scenarios for use during onboarding to create
 * more personalized and relevant questions based on user's interests and values.
 */
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface ExampleProposalType {
  id: string;
  title: string;
  description: string;
  category: string;
  stances: any;
  probeQuestion: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ExampleUserArchetypeType {
  id: string;
  name: string;
  description: string;
  interests: any;
  concerns: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all example user archetypes for reference during onboarding
 */
export async function getExampleUserArchetypes(): Promise<ExampleUserArchetypeType[]> {
  try {
    // @ts-ignore
    return await prisma.exampleUserArchetype.findMany();
  } catch (error) {
    logger.error('Error fetching example user archetypes:', error);
    return []; // Return empty array on error
  }
}

/**
 * Get all example proposals for reference during onboarding
 */
export async function getExampleProposals(): Promise<ExampleProposalType[]> {
  try {
    // @ts-ignore
    return await prisma.exampleProposal.findMany();
  } catch (error) {
    logger.error('Error fetching example proposals:', error);
    return []; // Return empty array on error
  }
}

/**
 * Get example proposals with fallback if DB is empty
 */
export async function getExampleProposalsWithFallback(): Promise<ExampleProposalType[]> {
  const dbProposals = await getExampleProposals();
  if (dbProposals.length > 0) {
    return dbProposals;
  }
  // Fallback proposals
  return [
    {
      id: 'fallback-1',
      title: 'Community Garden Initiative',
      description: 'Proposal to convert empty lot into community garden space',
      category: 'environment',
      stances: [
        { perspective: 'Environmental', opinion: 'Supports green space development', supports: true },
        { perspective: 'Economic', opinion: 'Concerns about maintenance costs', supports: false }
      ],
      probeQuestion: 'How important is community green space to you?',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    // Add more fallback proposals as needed
  ];
}

/**
 * Format issues for onboarding menu (numbered)
 */
export async function getFormattedIssuesForOnboardingMenu(): Promise<string> {
  const proposals: ExampleProposalType[] = await getExampleProposalsWithFallback();
  return proposals.map((proposal: ExampleProposalType, index: number) => {
    // Extract a short title (e.g., "Water rates" from "Water-Treatment Plant Funding Gap")
    const shortTitle = proposal.title.split(' ').slice(0, 2).join(' ').replace(/-/g, ' ');
    return `${index + 1}-${shortTitle}`;
  }).join('  ');
}

/**
 * Map issue number to full details for onboarding
 */
export async function getFullIssueDetails(): Promise<Record<number, { title: string; description: string; stances: any; probeQuestion: string }>> {
  const proposals: ExampleProposalType[] = await getExampleProposalsWithFallback();
  return proposals.reduce((acc: Record<number, { title: string; description: string; stances: any; probeQuestion: string }>, proposal: ExampleProposalType, index: number) => {
    acc[index + 1] = {
      title: proposal.title,
      description: proposal.description,
      stances: proposal.stances,
      probeQuestion: proposal.probeQuestion
    };
    return acc;
  }, {});
}

/**
 * Get relevant proposals based on previously determined user interests
 * @param interests Array of interest keywords
 * @param limit Maximum number of proposals to return
 */
export async function getRelevantProposals(interests: string[], limit: number = 3): Promise<ExampleProposalType[]> {
  try {
    // @ts-ignore
    const allProposals: ExampleProposalType[] = await prisma.exampleProposal.findMany();

    // Score each proposal based on how well it matches the interests
    const scoredProposals = allProposals.map((proposal: ExampleProposalType) => {
      let score = 0;

      // Search the proposal title, description and combines stances for interest matches
      const proposalText = `${proposal.title} ${proposal.description} ${JSON.stringify(proposal.stances)}`.toLowerCase();

      interests.forEach((interest: string) => {
        if (proposalText.includes(interest.toLowerCase())) {
          score += 1;
        }
      });

      return { proposal, score };
    });

    // Sort by score descending and return top N
    return scoredProposals
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, limit)
      .map((item: { proposal: ExampleProposalType }) => item.proposal);
  } catch (error) {
    logger.error('Error finding relevant proposals:', error);
    return []; // Return empty array on error
  }
}

/**
 * Generate personalized probe questions based on user interests and available scenarios
 * @param userInterests Array of interest keywords
 * @param limit Maximum number of questions to return
 */
export async function generatePersonalizedProbeQuestions(userInterests: string[], limit: number = 2): Promise<{ topic: string; question: string; category: string }[]> {
  try {
    // Get relevant proposals based on interests
    const relevantProposals: ExampleProposalType[] = await getRelevantProposals(userInterests, limit);

    // Just extract the probe questions
    return relevantProposals.map((proposal: ExampleProposalType) => ({
      topic: proposal.title,
      question: proposal.probeQuestion,
      category: proposal.category
    }));
  } catch (error) {
    logger.error('Error generating personalized probe questions:', error);
    return []; // Return empty array on error
  }
}

export default {
  getExampleUserArchetypes,
  getExampleProposals,
  getRelevantProposals,
  generatePersonalizedProbeQuestions,
  getExampleProposalsWithFallback,
  getFormattedIssuesForOnboardingMenu,
  getFullIssueDetails
};
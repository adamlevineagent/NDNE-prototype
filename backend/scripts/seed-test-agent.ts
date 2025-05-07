// scripts/seed-test-agent.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting test agent seeding...');

  // 1. Create a test user
  const hashedPassword = await bcrypt.hash('testpassword', 10);
  const user = await prisma.user.upsert({
    where: { email: 'testsov@example.com' },
    update: {
      // Ensure passwordHash is updated if user exists but needs reset
      passwordHash: hashedPassword,
      // 'name' field does not exist on User model in schema
      // If it's added to schema later, it can be re-added here.
      // For now, ensure other fields like publicKey/encryptedPrivKey are present if needed for update
    },
    create: {
      email: 'testsov@example.com',
      // 'name' field does not exist on User model in schema
      passwordHash: hashedPassword,
      publicKey: 'test-user-pub-key', // Placeholder
      encryptedPrivKey: 'test-user-enc-priv-key', // Placeholder
    },
  });
  console.log(`Created/updated user: ${user.email} (ID: ${user.id})`);

  // 2. Create an agent for this user
  // Ensure a unique name for the agent if you plan to run this multiple times without cleanup
  const agentName = 'TestSovAgentNDNE_Debug';
  const agent = await prisma.agent.upsert({
    // userId is unique on Agent model, so it's the correct field for where clause
    where: { userId: user.id },
    update: { // Update existing agent if found
        name: agentName, // Ensure name is updated if it changed
        color: '#FF5733',
        onboardingCompleted: true,
        // publicKey and encryptedPrivKey are likely set at creation and not updated here
        // unless specifically intended.
    },
    create: {
      userId: user.id,
      name: agentName,
      color: '#FF5733',
      publicKey: 'test-agent-pub-key', // Placeholder
      encryptedPrivKey: 'test-agent-enc-priv-key', // Placeholder
      onboardingCompleted: true,
      preferences: {}, // Will be updated below
    },
  });
  console.log(`Created/updated agent: ${agent.name} (ID: ${agent.id}) for user ID: ${user.id}`);

  // 3. Define the issuesMatrix and other preferences
  // These IDs ("1", "2", "3") are assumed to correspond to the primary keys of the
  // ExampleProposal records created by prisma/scenario-seed.ts.
  // Ensure scenario-seed has been run and these proposals exist with these IDs.
  const issuesMatrix = [
    {
      id: '1',
      title: 'Water-Treatment Plant Funding Gap',
      description: "Issue a 25-year municipal revenue bond and raise residential water rates 12% to close the $50M shortfall after FEMA's BRIC grant was cancelled.",
      stance: 'SUPPORTS_BOND_AND_RATE_HIKE',
      reason: 'Ensuring safe water is a priority, and this addresses the funding gap directly.',
      summary: 'Supports the bond and rate increase for water treatment.',
      isPriority: true,
    },
    {
      id: '2',
      title: 'Downtown Homeless "Resting Sites" Expansion',
      description: "Approve two adjacent parking-lot campsites, bringing total capacity to 150 tents, as ordered by the court.",
      stance: 'OPPOSES_EXPANSION_DOWNTOWN',
      reason: 'Concerned about the impact on downtown retail and prefers dispersed sites.',
      summary: 'Opposes expanding resting sites in the downtown core.',
      isPriority: false,
    },
    {
      id: '3',
      title: 'Wildfire-Risk Utility Surcharge',
      description: "Endorse Pacific Power's plan to add a temporary $2/month surcharge to speed undergrounding and covered-conductor projects (500 mi planned, 100 mi in 2025).",
      stance: 'SUPPORTS_SURCHARGE_FOR_SAFETY',
      reason: 'The surcharge is a small price for significant wildfire risk reduction.',
      summary: 'Supports the utility surcharge for wildfire safety.',
      isPriority: false,
    }
  ];

  const agentPreferences = {
    issuesMatrix: issuesMatrix,
    selectedIssues: ['1', '2', '3'], // String IDs corresponding to ExampleProposal PKs
    userKnowledge: {
      key_topics: ['local economy', 'public safety', 'environment', 'infrastructure funding'],
      stated_preferences: ['fiscal responsibility', 'community well-being', 'proactive safety measures'],
      goals: ['improve city infrastructure', 'ensure safe neighborhoods', 'sustainable development'],
      communication_style: 'concise',
    },
    agentNickname: 'SovTestAgentDbg', // Unique nickname
    onboardingCompletedAt: new Date().toISOString(),
    dealBreakers: 'Any policy that significantly harms small businesses without mitigation, or defers critical infrastructure maintenance.',
    notifyPref: 'A', // Major items only
    topPriorityIssue: '1', // ID of the priority issue from issuesMatrix
  };

  // 4. Update the agent's preferences
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      preferences: agentPreferences,
      onboardingCompleted: true,
    },
  });

  console.log(`Updated preferences for agent: ${agent.name}`);
  console.log('Test agent seeding completed successfully.');
  console.log('Test User Email: testsov@example.com');
  console.log('Test User Password: testpassword');
  console.log(`Test Agent ID: ${agent.id}`);
  console.log(`Test Agent Name: ${agent.name}`);
}

main()
  .catch((e) => {
    console.error('Error during test agent seeding:', e);
    // Check for common issues like Prisma Client generation or database connection
    if (e.code === 'P2002') {
      console.error('A unique constraint failed. This might mean the test user or agent already exists with conflicting unique fields.');
    } else if (e.message?.includes('PrismaClientInitializationError')) {
        console.error('Failed to initialize Prisma Client. Is the database server running and accessible?');
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
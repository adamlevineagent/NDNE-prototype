import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    console.log('Checking database tables...');
    
    try {
      const exampleProposalCount = await prisma.exampleProposal.count();
      console.log('ExampleProposals:', exampleProposalCount);
    } catch (e) {
      console.error('Error checking ExampleProposal:', e);
    }
    
    try {
      const exampleUserArchetypeCount = await prisma.exampleUserArchetype.count();
      console.log('ExampleUserArchetype:', exampleUserArchetypeCount);
    } catch (e) {
      console.error('Error checking ExampleUserArchetype:', e);
    }
    
    try {
      const userCount = await prisma.user.count();
      console.log('Users:', userCount);
    } catch (e) {
      console.error('Error checking User:', e);
    }
    
    try {
      const agentCount = await prisma.agent.count();
      console.log('Agents:', agentCount);
    } catch (e) {
      console.error('Error checking Agent:', e);
    }
  } catch (e) {
    console.error('General Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
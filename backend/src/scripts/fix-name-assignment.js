// Script to fix the user and agent name assignments in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixNameAssignment() {
  try {
    console.log('Starting name correction...');
    
    // Get test user with email bobtest@test.com
    const user = await prisma.user.findUnique({
      where: { email: 'bobtest@test.com' }
    });
    
    if (!user) {
      console.error('User bobtest@test.com not found');
      return;
    }
    
    console.log(`Found user: ${user.id}, current name: ${user.name}`);
    
    // Get the agent associated with this user
    const agent = await prisma.agent.findFirst({
      where: { userId: user.id }
    });
    
    if (!agent) {
      console.error(`No agent found for user ID ${user.id}`);
      return;
    }
    
    console.log(`Found agent: ${agent.id}, current name: ${agent.name}`);
    
    // Update the user's name to Adam
    await prisma.user.update({
      where: { id: user.id },
      data: { name: 'Adam' }
    });
    
    // Update the agent's name to Prax
    await prisma.agent.update({
      where: { id: agent.id },
      data: { name: 'Prax' }
    });
    
    console.log('Name assignment fixed successfully!');
    console.log('User name updated to "Adam"');
    console.log('Agent name updated to "Prax"');
    
  } catch (error) {
    console.error('Error fixing name assignment:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNameAssignment()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
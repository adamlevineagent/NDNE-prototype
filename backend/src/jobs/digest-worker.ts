import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient, User, Agent, Vote, Proposal } from '@prisma/client'; // Import specific types

// Ensure REDIS_URL is defined in your .env file
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null // Prevent immediate job failure on connection issues
});

const prisma = new PrismaClient();

const queueName = 'digestQueue';

console.log(`Starting Digest Worker for queue: ${queueName}`);

// Define the type for the user object fetched with agent
type UserWithAgent = User & { agent: Agent | null };

// Define the structure for fetched activity
interface DigestActivity {
    agentVotes: (Vote & { proposal: Proposal })[];
    newProposals: Proposal[];
    vetoAlerts: (Proposal & { agentVote: Vote | null })[]; // Proposals needing potential veto
}


// Define the worker
const worker = new Worker(queueName, async (job: Job) => {
  console.log(`Processing job ${job.id} of type ${job.name}`);
  const { userId } = job.data;

  if (!userId) {
    console.error(`Job ${job.id} is missing userId.`);
    throw new Error(`Job ${job.id} is missing userId.`);
  }

  try {
    // 1. Fetch user and their preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { agent: true } // Include agent
    });

    if (!user || !user.agent) { // Ensure user and agent exist
      console.error(`User ${userId} or their agent not found for job ${job.id}.`);
      return { status: 'skipped', reason: 'User or agent not found' };
    }

    // 2. Determine time window for fetching activity
    const frequencyHours = user.digestFrequency || 24; // Default to 24 hours
    const sinceDate = new Date(Date.now() - frequencyHours * 60 * 60 * 1000);
    const now = new Date();
    const vetoLookaheadDate = new Date(Date.now() + frequencyHours * 60 * 60 * 1000); // Look ahead for veto warnings

    // 3. Fetch relevant activity
    const agentId = user.agent.id;
    const activity: DigestActivity = {
        agentVotes: [],
        newProposals: [],
        vetoAlerts: []
    };

    // Fetch agent votes within the window
    activity.agentVotes = await prisma.vote.findMany({
        where: {
            agentId: agentId,
            createdAt: { gte: sinceDate }
        },
        include: { proposal: true }, // Include proposal details
        orderBy: { createdAt: 'desc' }
    });

    // Fetch new proposals created within the window
    activity.newProposals = await prisma.proposal.findMany({
        where: {
            createdAt: { gte: sinceDate }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Fetch proposals nearing veto window end where agent voted and user hasn't overridden
    const potentiallyVetoableProposals = await prisma.proposal.findMany({
        where: {
            status: 'open', // Only open proposals
            vetoWindowEnd: {
                gte: now, // Veto window hasn't passed
                lte: vetoLookaheadDate // Veto window ends within the lookahead period
            },
            // Ensure the agent has voted on this proposal
            votes: {
                some: {
                    agentId: agentId,
                    overrideByUser: false // And the user hasn't already overridden
                }
            }
        },
        include: {
            // Include the specific vote by the agent for context
            votes: {
                where: { agentId: agentId }
            }
        },
        orderBy: { vetoWindowEnd: 'asc' }
    });
    // Map to expected structure, ensuring agentVote is attached
    activity.vetoAlerts = potentiallyVetoableProposals.map(p => ({
        ...p,
        agentVote: p.votes.find(v => v.agentId === agentId) || null
    }));


    // 4. Generate digest content (consider tone)
    // Use agent-service to generate digest summary
    const digestContent = await import('../services/agent-service').then(({ generateDigest }) =>
      generateDigest(user.id, activity, user.agent?.id)
    );
  
    // Don't save empty digests
    if (!digestContent.trim().endsWith(":\n\n") && !digestContent.trim().endsWith("update:\n\n") && !digestContent.trim().endsWith("Report:\n\n")) {
        // 5. Store the digest in the database
        await prisma.digest.create({
          data: {
            userId: user.id,
            content: digestContent,
            // generatedAt is handled by @default(now())
          }
        });
        console.log(`Successfully processed and stored digest job ${job.id} for user ${userId}`);
    } else {
        console.log(`No new activity for user ${userId}, skipping digest storage for job ${job.id}.`);
    }


    return { status: 'completed', userId: userId };

    // 6. TODO: Trigger email/send mechanism (separate task/service)

  } catch (error) {
    console.error(`Error processing job ${job.id} for user ${userId}:`, error);
    // Throw the error so BullMQ handles retries/failure according to queue settings
    throw error;
  }
}, { connection });

// --- Helper Functions ---

function formatDateTime(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    return date.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
}

// Generate the digest content based on activity and user tone preference
function generateDigest(user: UserWithAgent, activity: DigestActivity): string {
  let content = "";

  // Add Veto Alerts first
  if (activity.vetoAlerts.length > 0) {
    content += "--- Veto Window Alerts ---\n";
    activity.vetoAlerts.forEach(p => {
      content += `Proposal "${p.title}" (ID: ${p.id.substring(0, 8)}) requires your review.\n`;
      content += `  - Your agent voted: ${p.agentVote?.value.toUpperCase() || 'N/A'}\n`;
      content += `  - Veto window ends: ${formatDateTime(p.vetoWindowEnd)}\n`;
    });
    content += "\n";
  }

  // Add Agent Votes
  if (activity.agentVotes.length > 0) {
    content += "--- Recent Agent Votes ---\n";
    activity.agentVotes.forEach(v => {
      content += `On proposal "${v.proposal.title}" (ID: ${v.proposalId.substring(0, 8)}):\n`;
      content += `  - Agent voted: ${v.value.toUpperCase()} (Confidence: ${v.confidence * 100}%)\n`;
      if (v.overrideByUser) {
        content += `  - !! You overrode this vote. Reason: ${v.overrideReason || 'Not specified'}\n`;
      }
      content += `  - Voted at: ${formatDateTime(v.createdAt)}\n`;
    });
    content += "\n";
  }

  // Add New Proposals
  if (activity.newProposals.length > 0) {
    content += "--- New Proposals ---\n";
    activity.newProposals.forEach(p => {
      content += `Title: "${p.title}" (ID: ${p.id.substring(0, 8)})\n`;
      content += `  - Type: ${p.type}${p.playMode ? ' (Play Money)' : ''}\n`;
      content += `  - Created: ${formatDateTime(p.createdAt)}\n`;
      content += `  - Closes: ${formatDateTime(p.closeAt)}\n`;
    });
    content += "\n";
  }

  // Add Comments - TODO: Fetch and add relevant comments if needed later

  // Add prefix based on tone only if there is content
  if (content) {
      let prefix = "";
      switch (user.digestTone) {
        case 'friendly':
          prefix = `Hey ${user.email}! Here's your latest update:\n\n`;
          break;
        case 'formal':
          prefix = `Dear User,\nPlease find your scheduled digest below:\n\n`;
          break;
        default: // neutral
          prefix = `Digest Report:\n\n`;
      }
      return prefix + content;
  } else {
      // Return an empty string or a "no activity" message based on tone
       switch (user.digestTone) {
        case 'friendly':
          return `Hey ${user.email}! Nothing new to report for this period.\n\n`;
        case 'formal':
          return `Dear User,\nThere has been no reportable activity during this digest period.\n\n`;
        default: // neutral
          return `Digest Report:\n\nNo new activity.\n`;
      }
  }
}


// --- Event Listeners for Logging ---

worker.on('completed', (job: Job, result: any) => {
  console.log(`Job ${job.id} completed successfully. Result:`, result);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  if (job) {
    console.error(`Job ${job.id} failed with error: ${err.message}`);
  } else {
    console.error(`A job failed with error: ${err.message}`);
  }
});

worker.on('error', (err: Error) => {
  console.error('Worker encountered an error:', err);
});

console.log('Digest Worker initialized and listening for jobs.');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing Digest Worker...');
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  console.log('Digest Worker closed.');
  process.exit(0);
});
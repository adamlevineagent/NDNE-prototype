import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import logger from './utils/logger';
import errorHandler from './middleware/errorHandler';
import authRouter from './routes/auth';
import keyRouter from './routes/key';
import proposalRouter from './routes/proposal';
import voteRouter from './routes/vote';
import pauseAgentRouter from './routes/agents/pauseAgentHandler';
import feedbackRouter from './routes/agents/feedbackHandler'; // Import the feedback router
import onboardingRouter from './routes/onboarding'; // Import the onboarding router
import adminRouter from './routes/admin'; // Import the admin router
import chatRouter from './routes/chat'; // Import the chat router
import forumRouter from './routes/forum'; // Import the forum router
import negotiationRouter from './routes/negotiation'; // Import the negotiation router
import negotiationFeedbackRouter from './routes/feedback'; // Import the negotiation feedback router
import agentMeRouter from './routes/agents/me'; // Import the agent "me" router
import agentRouter from './routes/agents/index'; // Import the main agent router

import issuesRouter from './routes/issues';
import { startForumPollingService, stopForumPollingService } from './services/forum-polling-service'; // Import forum polling service

dotenv.config();

const requiredEnv = ['DB_URL', 'REDIS_URL', 'JWT_SECRET'];
requiredEnv.forEach(key => {
  if (!process.env[key]) {
    logger.error(`Missing env var: ${key}`);
    process.exit(1);
  }
});

// Check for optional Discourse API environment variables and log warnings if missing
const discourseEnv = ['DISCOURSE_URL', 'DISCOURSE_API_KEY', 'DISCOURSE_API_USERNAME'];
discourseEnv.forEach(key => {
  if (!process.env[key]) {
    logger.warn(`Missing Discourse env var: ${key}. Discourse API integration will be limited.`);
  }
});

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet());
// Log configured CORS origins for debugging
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174'];
// Add ports 5173-5175 explicitly for dev purposes
const extendedCorsOrigins = [...corsOrigins, 'http://localhost:5175'];
logger.info(`Configured CORS origins: ${extendedCorsOrigins}`);

app.use(cors({
  origin: extendedCorsOrigins,
  credentials: true, // Allow cookies if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/keys', keyRouter);
app.use('/api/proposals', proposalRouter);
app.use('/api', voteRouter);
app.use('/api/agents', pauseAgentRouter);
app.use('/api/agents', feedbackRouter); // Mount the feedback router
app.use('/api/onboarding', onboardingRouter); // Mount the onboarding router
app.use('/api/admin', adminRouter); // Mount the admin router
app.use('/api/chat', chatRouter); // Mount the chat router
app.use('/api/forum', forumRouter); // Mount the forum router
app.use('/api', negotiationRouter); // Mount the negotiation router
app.use('/api', negotiationFeedbackRouter); // Mount the negotiation feedback router
app.use('/api/agents', agentMeRouter); // Mount the agent "me" router
app.use('/api/agents', agentRouter); // Mount the main agent router
app.use('/api/issues', issuesRouter); // Mount the issues router

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (_req, res) => {
  res.send('NDNE backend is running');
});

// 404 handler - must come after all routes
app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Resource not found' });
});

// Global error handler - must be the last middleware
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`NDNE backend listening at http://localhost:${port}`);
  
  // Start the forum polling service after server is up
  if (process.env.DISCOURSE_URL && process.env.DISCOURSE_API_KEY && process.env.DISCOURSE_API_USERNAME) {
    startForumPollingService()
      .then(() => {
        logger.info('Forum polling service started successfully');
      })
      .catch(error => {
        logger.error('Failed to start forum polling service:', error);
      });
  } else {
    logger.warn('Forum polling service not started: Missing Discourse API configuration');
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { reason, promise });
  // Don't exit the process to maintain availability, but log it
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  // Give the logger time to process the error before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  try {
    await stopForumPollingService();
    logger.info('Forum polling service stopped successfully');
  } catch (error) {
    logger.error('Error stopping forum polling service:', error);
  }
  
  // Give services time to clean up before exiting
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  try {
    await stopForumPollingService();
    logger.info('Forum polling service stopped successfully');
  } catch (error) {
    logger.error('Error stopping forum polling service:', error);
  }
  
  // Give services time to clean up before exiting
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

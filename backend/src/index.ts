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

dotenv.config();

const requiredEnv = ['DB_URL', 'REDIS_URL', 'JWT_SECRET'];
requiredEnv.forEach(key => {
  if (!process.env[key]) {
    logger.error(`Missing env var: ${key}`);
    process.exit(1);
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

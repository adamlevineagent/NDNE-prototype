import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { generateKeyPair, encryptPrivateKey } from '../services/key-service';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';

const prisma = new PrismaClient();
const router = Router();

// Limit auth attempts to prevent abuse
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

router.post('/register', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  console.log(`[DEBUG-REG] Registration attempt for email: ${email}`);
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
  try {
    // Check database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[DEBUG-REG] Database connection successful');
    } catch (dbError) {
      console.error('[DEBUG-REG] Database connection failed:', dbError);
      return res.status(500).json({ error: 'Database connection error' });
    }
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    
    console.log('[DEBUG] Creating new user with email:', email);
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Generate and encrypt user keys
    console.log('[DEBUG] Generating user keys');
    let userPriv, userPub, encUserPriv;
    try {
      const userKeys = await generateKeyPair();
      userPriv = userKeys.privateKey;
      userPub = userKeys.publicKey;
      encUserPriv = encryptPrivateKey(userPriv);
      console.log('[DEBUG] User keys generated successfully');
    } catch (keyError) {
      console.error('[DEBUG] Error generating user keys:', keyError);
      return res.status(500).json({ error: 'Failed to generate keys' });
    }
    
    // Generate and encrypt agent keys
    console.log('[DEBUG] Generating agent keys');
    let agentPriv, agentPub, encAgentPriv;
    try {
      const agentKeys = await generateKeyPair();
      agentPriv = agentKeys.privateKey;
      agentPub = agentKeys.publicKey;
      encAgentPriv = encryptPrivateKey(agentPriv);
      console.log('[DEBUG] Agent keys generated successfully');
    } catch (keyError) {
      console.error('[DEBUG] Error generating agent keys:', keyError);
      return res.status(500).json({ error: 'Failed to generate keys' });
    }
    
    // Create user record
    let user;
    try {
      console.log('[DEBUG] Creating user in database');
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          publicKey: Buffer.from(userPub).toString('hex'),
          encryptedPrivKey: encUserPriv,
        },
      });
      console.log('[DEBUG] User created successfully:', user.id);
    } catch (userError: any) {
      console.error('[DEBUG] Error creating user:', userError.message);
      return res.status(500).json({ error: 'Failed to create user account' });
    }
    
    // Create agent record with placeholder identity
    let agent;
    try {
      console.log('[DEBUG] Creating agent in database');
      agent = await prisma.agent.create({
        data: {
          userId: user.id,
          name: 'Agent',
          color: '#000000',
          publicKey: Buffer.from(agentPub).toString('hex'),
          encryptedPrivKey: encAgentPriv,
          preferences: {},
          scenarioPreferences: {},
        },
      });
      console.log('[DEBUG] Agent created successfully:', agent.id);
    } catch (agentError: any) {
      console.error('[DEBUG] Error creating agent:', agentError.message);
      return res.status(500).json({ error: 'Failed to create agent account' });
    }
    
    try {
      // Triple check JWT secret is available and valid
      if (!process.env.JWT_SECRET) {
        console.error('[DEBUG-CRITICAL] JWT_SECRET is undefined during token generation!');
        return res.status(500).json({ error: 'Server configuration error: Missing JWT secret' });
      }
      
      if (process.env.JWT_SECRET === 'change-me') {
        console.error('[DEBUG-CRITICAL] JWT_SECRET is using placeholder value "change-me"!');
        return res.status(500).json({ error: 'Server configuration error: Invalid JWT secret' });
      }
      
      console.log('[DEBUG-CRITICAL] Generating JWT token with secret:',
        process.env.JWT_SECRET ? `${process.env.JWT_SECRET.substring(0, 3)}...${process.env.JWT_SECRET.substring(process.env.JWT_SECRET.length - 3)}` : 'MISSING');
      console.log('[DEBUG-CRITICAL] JWT secret length:', process.env.JWT_SECRET.length);
      console.log('[DEBUG-CRITICAL] JWT payload:', { userId: user.id, agentId: agent.id });
      
      const token = jwt.sign(
        { userId: user.id, agentId: agent.id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' } // Extend token lifetime to reduce login frequency
      );
      
      // Validate generated token immediately
      try {
        const verified = jwt.verify(token, process.env.JWT_SECRET) as any;
        console.log('[DEBUG-CRITICAL] Token verification successful:', {
          userId: verified.userId === user.id ? 'matches' : 'mismatch',
          agentId: verified.agentId === agent.id ? 'matches' : 'mismatch'
        });
      } catch (verifyError) {
        console.error('[DEBUG-CRITICAL] Token verification failed immediately after generation:', verifyError);
        return res.status(500).json({ error: 'Failed to verify authentication token' });
      }
      
      console.log('[DEBUG-CRITICAL] Token generated successfully, length:', token.length);
      console.log('[DEBUG-CRITICAL] Token prefix:', token.substring(0, 15) + '...');
      console.log('[DEBUG-CRITICAL] Registration complete, sending token');
      res.json({ token });
    } catch (tokenError) {
      console.error('[DEBUG-CRITICAL] Error generating token:', tokenError);
      console.error('[DEBUG-CRITICAL] JWT_SECRET defined:', !!process.env.JWT_SECRET);
      console.error('[DEBUG-CRITICAL] JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
      return res.status(500).json({ error: 'Failed to generate authentication token' });
    }
  } catch (error) {
    console.error('[DEBUG-REG] Unhandled error during registration:', error);
    // More detailed error logging
    if (error instanceof Error) {
      console.error('[DEBUG-REG] Error message:', error.message);
      console.error('[DEBUG-REG] Error stack:', error.stack);
    }
    res.status(500).json({ error: 'Internal error during registration' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
  try {
    console.log(`[DEBUG] Login attempt for email: ${email}`);
    
    // Check database connection by running a simple query
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[DEBUG] Database connection successful');
    } catch (dbError) {
      console.error('[DEBUG] Database connection failed:', dbError);
      return res.status(500).json({ error: 'Database connection error' });
    }
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('[DEBUG] User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('[DEBUG] User found, checking password');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      console.log('[DEBUG] Password invalid');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('[DEBUG] Password valid, looking for agent');
    const agent = await prisma.agent.findUnique({ where: { userId: user.id } });
    
    if (!agent) {
      console.error('[DEBUG] No agent found for user ID:', user.id);
      return res.status(500).json({ error: 'User account configuration error' });
    }
    
    console.log('[DEBUG] Agent found, creating JWT');
    if (!process.env.JWT_SECRET) {
      console.error('[DEBUG] JWT_SECRET is missing or undefined');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const token = jwt.sign({ userId: user.id, agentId: agent.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('[DEBUG] Login successful');
    
    res.json({ token });
  } catch (error: any) { // Explicitly type error as any to access .message
    console.error('[DEBUG] Login error details:', error);
    res.status(500).json({
      error: 'Internal error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add endpoint to get current user info
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication invalid' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        digestFrequency: true,
        digestTone: true,
        createdAt: true,
        updatedAt: true,
        role: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get agent info as well
    const agent = await prisma.agent.findFirst({
      where: { userId: userId },
      select: {
        id: true,
        name: true,
        color: true,
        preferences: true
      }
    });
    
    res.json({ data: { ...user, agent } });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

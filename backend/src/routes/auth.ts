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
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    // Generate and encrypt user keys
    const { privateKey: userPriv, publicKey: userPub } = await generateKeyPair();
    const encUserPriv = encryptPrivateKey(userPriv);
    // Generate and encrypt agent keys
    const { privateKey: agentPriv, publicKey: agentPub } = await generateKeyPair();
    const encAgentPriv = encryptPrivateKey(agentPriv);
    // Create user record
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        publicKey: Buffer.from(userPub).toString('hex'),
        encryptedPrivKey: encUserPriv,
      },
    });
    // Create agent record with placeholder identity
    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        name: 'Agent',
        color: '#000000',
        publicKey: Buffer.from(agentPub).toString('hex'),
        encryptedPrivKey: encAgentPriv,
        preferences: {},
      },
    });
    const token = jwt.sign({ userId: user.id, agentId: agent.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal error' });
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

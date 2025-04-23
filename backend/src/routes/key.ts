import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateKeyPair, encryptPrivateKey } from '../services/key-service';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const router = Router();

// Auth middleware (simple JWT check)
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// POST /api/keys/generate
router.post('/generate', requireAuth, async (req, res) => {
  const { userId, agentId } = req.user;
  const mode = process.env.KEY_STORAGE_MODE || 'server';
  try {
    const { privateKey, publicKey } = await generateKeyPair();
    if (mode === 'server') {
      // Encrypt and store in DB
      const encPriv = encryptPrivateKey(privateKey);
      await prisma.user.update({
        where: { id: userId },
        data: { publicKey: Buffer.from(publicKey).toString('hex'), encryptedPrivKey: encPriv }
      });
      res.json({ status: 'ok', publicKey: Buffer.from(publicKey).toString('hex') });
    } else {
      // Return to client, do not store privKey
      await prisma.user.update({
        where: { id: userId },
        data: { publicKey: Buffer.from(publicKey).toString('hex'), encryptedPrivKey: '' }
      });
      res.json({ publicKey: Buffer.from(publicKey).toString('hex'), privateKey: Buffer.from(privateKey).toString('hex') });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/keys/public
router.get('/public', requireAuth, async (req, res) => {
  const { userId } = req.user;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { publicKey: true } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ publicKey: user.publicKey });
});

export default router;

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define the structure of the JWT payload expected after verification
export interface UserJWTPayload {
    userId: string;
    agentId: string;
    // Add other fields from JWT payload if necessary
    [key: string]: any;
}

// Extend Express Request type to include the decoded user payload
export interface AuthenticatedRequest extends Request {
    user?: UserJWTPayload;
}

/**
 * Middleware to verify JWT token from Authorization header.
 * Attaches the decoded payload to req.user upon successful verification.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  console.log('[requireAuth] Authorization header:', auth);

  if (!auth || !auth.startsWith('Bearer ')) {
      console.warn('[requireAuth] Missing or invalid Authorization header');
      return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = auth.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('[requireAuth] JWT_SECRET environment variable is not set.');
        // Avoid exposing internal errors directly
        return res.status(500).json({ error: 'Server configuration error.' });
    }
    // Verify the token and cast the payload to our defined interface
    const payload = jwt.verify(token, secret) as UserJWTPayload;
    req.user = payload; // Attach user payload
    console.log('[requireAuth] Authenticated user:', payload);
    next();
  } catch (error) {
    console.error('[requireAuth] Token verification failed:', error);
    // Handle specific JWT errors if needed (e.g., TokenExpiredError)
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
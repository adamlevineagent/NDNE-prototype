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
  console.log('[DEBUG-AUTH] Authorization header present:', !!auth);
  
  // Log URL being accessed to trace authentication issues
  console.log('[DEBUG-AUTH] Request to protected endpoint:', req.method, req.originalUrl);

  if (!auth || !auth.startsWith('Bearer ')) {
      console.warn('[DEBUG-AUTH] Missing or invalid Authorization header format');
      return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = auth.split(' ')[1];
  console.log('[DEBUG-AUTH] Token length:', token.length);
  console.log('[DEBUG-AUTH] Token prefix:', token.substring(0, 15) + '...');
  
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('[DEBUG-AUTH-CRITICAL] JWT_SECRET environment variable is not set.');
        return res.status(500).json({ error: 'Server configuration error.' });
    }
    
    // Log some details about the JWT secret (safely)
    console.log('[DEBUG-AUTH] Using JWT secret with length:', secret.length);
    console.log('[DEBUG-AUTH] JWT secret first/last chars:',
      `${secret.substring(0, 3)}...${secret.substring(secret.length - 3)}`);
    
    // Add extra validation to prevent using the placeholder secret
    if (secret === 'change-me') {
      console.error('[DEBUG-AUTH-CRITICAL] Using placeholder JWT_SECRET "change-me"');
      return res.status(500).json({ error: 'Server configuration error: Invalid JWT secret' });
    }
    
    // Verify the token and cast the payload to our defined interface
    const payload = jwt.verify(token, secret) as UserJWTPayload;
    
    // Validate payload has expected properties
    if (!payload.userId || !payload.agentId) {
      console.error('[DEBUG-AUTH-CRITICAL] Token payload missing required fields:', payload);
      return res.status(401).json({ error: 'Invalid token payload.' });
    }
    
    req.user = payload; // Attach user payload
    console.log('[DEBUG-AUTH] Authenticated user:', {
      userId: payload.userId,
      agentId: payload.agentId,
      iat: payload.iat,
      exp: payload.exp
    });
    
    next();
  } catch (error) {
    const isTokenExpired = error instanceof jwt.TokenExpiredError;
    const isInvalidToken = error instanceof jwt.JsonWebTokenError;
    
    console.error('[DEBUG-AUTH-CRITICAL] Token verification failed:', {
      error: error instanceof Error ? error.message : String(error),
      type: isTokenExpired ? 'TokenExpiredError' :
            isInvalidToken ? 'JsonWebTokenError' : 'Other',
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 15) + '...'
    });
    
    // Handle specific JWT errors with better error messages
    if (isTokenExpired) {
      return res.status(401).json({ error: 'Token has expired. Please login again.' });
    } else if (isInvalidToken) {
      return res.status(401).json({ error: 'Invalid token. Please login again.' });
    }
    
    // Generic error response as fallback
    res.status(401).json({ error: 'Authentication failed.' });
  }
}
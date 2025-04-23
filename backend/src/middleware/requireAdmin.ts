import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '@prisma/client'; // Import Role enum

const prisma = new PrismaClient();

// Extend Request type to include user from requireAuth middleware
interface AuthenticatedRequest extends Request {
    user?: { userId: string; [key: string]: any };
}

/**
 * Middleware to ensure the authenticated user has the ADMIN role.
 * Requires JWT authentication (requireAuth) to run first.
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const userId = req.user?.userId;

    if (!userId) {
        // Should be caught by requireAuth, but good practice to check
        return res.status(401).json({ error: 'User not authenticated.' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true } // Only select the role
        });

        if (!user) {
            // User existed during JWT validation but not now? Unlikely but possible.
            return res.status(401).json({ error: 'Authenticated user not found.' });
        }

        if (user.role !== Role.ADMIN) {
            console.warn(`Forbidden: User ${userId} attempted admin action without ADMIN role.`);
            return res.status(403).json({ error: 'Forbidden: Requires admin privileges.' });
        }

        // User is an admin, proceed
        next();

    } catch (error) {
        console.error(`Error checking admin role for user ${userId}:`, error);
        res.status(500).json({ error: 'Internal server error during authorization check.' });
    }
}
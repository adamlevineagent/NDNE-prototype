import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as ed from '@noble/ed25519'; // Use ESM import style
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'; // For hex conversion

const prisma = new PrismaClient();

// Extend Request type to include user from requireAuth middleware
interface AuthenticatedRequest extends Request {
    user?: { userId: string; [key: string]: any };
}

/**
 * Middleware to verify an Ed25519 signature provided in the X-Signature header.
 * Assumes the request body is the signed payload (serialized as JSON string).
 * Requires JWT authentication (requireAuth) to run first to identify the user.
 */
export async function verifySignature(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const signatureHex = req.headers['x-signature'] as string;
    const userId = req.user?.userId;

    if (!signatureHex) {
        return res.status(400).json({ error: 'Missing X-Signature header.' });
    }

    if (!userId) {
        // Should be caught by requireAuth, but good practice to check
        return res.status(401).json({ error: 'User not authenticated.' });
    }

    // Important: Ensure body-parser (like express.json()) has run BEFORE this middleware
    if (!req.body) {
        console.error('verifySignature middleware requires request body, but req.body is missing. Ensure express.json() runs first.');
        return res.status(500).json({ error: 'Server configuration error: Missing request body.' });
    }

    try {
        // 1. Fetch the user's public key
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { publicKey: true } // Only select the public key
        });

        if (!user || !user.publicKey) {
            return res.status(401).json({ error: 'User public key not found or user does not exist.' });
        }

        // 2. Prepare the message that was signed
        //    Crucially, this MUST match exactly how the client signed it.
        //    Typically, the raw JSON string of the request body is signed.
        const message = JSON.stringify(req.body);
        const messageBytes = new TextEncoder().encode(message); // Convert message string to Uint8Array

        // 3. Convert hex signature and public key to bytes
        const signatureBytes = hexToBytes(signatureHex);
        const publicKeyBytes = hexToBytes(user.publicKey);

        // 4. Verify the signature (Note: verify is synchronous)
        const isValid = ed.verify(signatureBytes, messageBytes, publicKeyBytes);

        if (!isValid) {
            console.warn(`Signature verification failed for user ${userId}`);
            return res.status(403).json({ error: 'Invalid signature.' });
        }

        // Signature is valid, proceed to the next handler
        console.log(`Signature verified successfully for user ${userId}`);
        next();

    } catch (error: any) {
        console.error('Error during signature verification:', error);
        // Handle specific errors like invalid hex format
        if (error.message?.includes('Invalid hex string')) {
             return res.status(400).json({ error: 'Invalid signature format.' });
        }
        res.status(500).json({ error: 'Internal server error during signature verification.' });
    }
}
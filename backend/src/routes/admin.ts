import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios'; // Ensure axios is imported
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth'; // Import from centralized middleware
import { requireAdmin } from '../middleware/requireAdmin'; // Import the admin guard

const prisma = new PrismaClient();
const router = Router();

// In-memory cache for LLM models
let cachedModels: { id: string; name: string }[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Define body for setting default model
interface SetModelBody {
    defaultModel: string;
}

// Helper function for Audit Logging
async function logAdminAction(userId: string, action: string, details?: Prisma.InputJsonValue, targetId?: string) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                details,
                targetId,
            }
        });
        console.log(`Audit log created for action: ${action} by user ${userId}`);
    } catch (error) {
        console.error(`Failed to create audit log for action ${action} by user ${userId}:`, error);
        // Decide if failure to log should block the action or just be logged
    }
}


// PUT /api/admin/model - Set the default LLM model
// Requires authentication AND admin role
router.put('/model', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { defaultModel } = req.body as SetModelBody;
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
        return res.status(401).json({ error: 'Admin user ID not found in token.' });
    }

    if (!defaultModel || typeof defaultModel !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid defaultModel in request body.' });
    }

    try {
        const currentConfig = await prisma.systemConfig.findUnique({
             where: { id: 1 } // Assuming config has ID 1
        });
        const previousModel = currentConfig?.defaultModel;

        const updatedConfig = await prisma.systemConfig.update({
            where: { id: 1 },
            data: { defaultModel: defaultModel },
        });

        await logAdminAction(
            adminUserId,
            'UPDATE_DEFAULT_MODEL',
            { previousModel: previousModel, newModel: defaultModel },
            'SystemConfig:1'
        );

        res.status(200).json({ message: 'Default model updated successfully.', newModel: updatedConfig.defaultModel });

    } catch (error) {
        console.error('Error updating default model:', error);
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
             return res.status(404).json({ error: 'System configuration not found.' });
        }
        res.status(500).json({ error: 'Internal server error updating default model.' });
    }
});

// GET /api/admin/models - Fetch list of available LLM models
// Requires authentication AND admin role
router.get('/models', requireAuth, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
    const modelsEndpoint = process.env.OPENROUTER_MODELS_ENDPOINT || 'https://openrouter.ai/api/v1/models'; // Fallback URL

    try {
        const now = Date.now();
        // Return cached models if cache is valid
        if (cachedModels.length > 0 && now - cacheTimestamp < CACHE_TTL) {
            console.log('Returning cached models from cache');
            return res.status(200).json(cachedModels);
        }
        console.log(`Fetching models from ${modelsEndpoint}`);
        let modelsFromUpstream;
        try {
            const response = await axios.get(modelsEndpoint, {
                headers: {
                    'Accept': 'application/json',
                }
            });
            if (response.status !== 200 || !response.data || !response.data.data) {
                throw new Error(`Unexpected response: ${response.status}`);
            }
            modelsFromUpstream = response.data.data.map((model: any) => ({
                id: model.id,
                name: model.name || model.id,
            }));
            // Update cache
            cachedModels = modelsFromUpstream;
            cacheTimestamp = now;
            return res.status(200).json(modelsFromUpstream);
        } catch (fetchError: any) {
            console.error('Error fetching models, attempting fallback:', fetchError);
            if (cachedModels.length > 0) {
                console.log('Returning stale cached models');
                return res.status(200).json(cachedModels);
            }
            // No cache available, return error
            if (axios.isAxiosError(fetchError) && fetchError.response) {
                return res.status(fetchError.response.status || 502).json({ error: 'Failed to fetch models due to upstream error.', details: fetchError.response.data });
            }
            return res.status(500).json({ error: 'Internal server error fetching LLM models.' });
        }

    } catch (error: any) {
        console.error('Error fetching LLM models:', error.message);
        if (axios.isAxiosError(error) && error.response) {
            console.error('Upstream error details:', error.response.status, error.response.data);
             return res.status(error.response.status || 502).json({ error: 'Failed to fetch models due to upstream error.', details: error.response.data });
        }
        res.status(500).json({ error: 'Internal server error fetching LLM models.' });
    }
});


// GET /api/admin (placeholder index)
router.get('/', requireAuth, requireAdmin, (_req, res) => {
    res.json({ message: 'Admin endpoint index. Add specific endpoints as needed.' });
});


export default router;
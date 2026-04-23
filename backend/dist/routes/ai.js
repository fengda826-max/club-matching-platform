"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const providers_1 = require("../providers");
const AIService_1 = require("../services/AIService");
const ClubService_1 = require("../services/ClubService");
const router = express_1.default.Router();
// Lazy initialization
let aiService = null;
let clubService = null;
const prisma = new client_1.PrismaClient();
async function getAIService() {
    if (!aiService) {
        const config = (0, providers_1.loadConfigFromEnv)();
        const provider = (0, providers_1.createProvider)(config);
        await provider.initialize();
        aiService = new AIService_1.AIService(provider);
    }
    return aiService;
}
function getClubService() {
    if (!clubService) {
        clubService = new ClubService_1.ClubService(prisma);
    }
    return clubService;
}
/**
 * Check AI health
 * GET /api/ai/health
 */
router.get('/health', async (req, res) => {
    const ai = await getAIService();
    const healthy = await ai.checkHealth();
    const info = ai.getProviderInfo();
    res.json({
        success: true,
        data: {
            healthy,
            provider: info,
        },
    });
});
/**
 * Generate matching
 * POST /api/ai/matching
 */
router.post('/matching', async (req, res, next) => {
    try {
        const { preferences } = req.body;
        const ai = await getAIService();
        const clubs = getClubService();
        const allClubs = await clubs.getAllClubs();
        const result = await ai.generateMatching(preferences, allClubs);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Streaming chat
 * POST /api/ai/chat/stream
 */
router.post('/chat/stream', async (req, res, next) => {
    try {
        const { message, history } = req.body;
        const ai = await getAIService();
        const clubs = getClubService();
        const allClubs = await clubs.getAllClubs();
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });
        if ('flushHeaders' in res) {
            res.flushHeaders();
        }
        const stream = await ai.chat(message, history || [], allClubs);
        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
        res.end();
    }
    catch (err) {
        next(err);
    }
});
/**
 * Non-streaming chat
 * POST /api/ai/chat
 */
router.post('/chat', async (req, res, next) => {
    try {
        const { message, history } = req.body;
        const ai = await getAIService();
        const clubs = getClubService();
        const allClubs = await clubs.getAllClubs();
        const result = await ai.chatComplete(message, history || [], allClubs);
        res.json({
            success: true,
            data: { response: result },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Generate club description
 * POST /api/ai/generate-description
 */
router.post('/generate-description', async (req, res, next) => {
    try {
        const { name, category } = req.body;
        const ai = await getAIService();
        const description = await ai.generateDescription(name, category);
        res.json({
            success: true,
            data: { description },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Suggest tags
 * POST /api/ai/suggest-tags
 */
router.post('/suggest-tags', async (req, res, next) => {
    try {
        const { name, category, description } = req.body;
        const ai = await getAIService();
        const tags = await ai.suggestTags(name, category, description);
        res.json({
            success: true,
            data: { tags },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;

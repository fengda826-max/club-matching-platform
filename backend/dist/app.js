"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const clubs_1 = __importDefault(require("./routes/clubs"));
const ai_1 = __importDefault(require("./routes/ai"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const port = process.env.PORT || 3001;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5175';
// CORS configuration: allow any localhost port in development
// because Vite automatically switches ports when 5175 is occupied
const corsOptions = {
    credentials: true,
    origin: (origin, callback) => {
        // Allow requests with no origin (like curl/postman)
        if (!origin) {
            callback(null, true);
            return;
        }
        // Allow any localhost origin in development
        if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
            callback(null, true);
            return;
        }
        // Check against configured origin for exact match
        if (origin === corsOrigin) {
            callback(null, true);
            return;
        }
        // Reject other origins
        callback(new Error('Not allowed by CORS'), false);
    }
};
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, data: { status: 'ok', message: 'Club matching backend is running' } });
});
// API routes
app.use('/api/clubs', clubs_1.default);
app.use('/api/ai', ai_1.default);
// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});
// Host frontend static files in production (after build)
if (process.env.NODE_ENV === 'production') {
    const frontendDist = path_1.default.join(__dirname, '../../frontend/dist');
    app.use(express_1.default.static(frontendDist));
    // SPA fallback - all non-API routes return index.html for page refresh
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(frontendDist, 'index.html'));
    });
    console.log(`📦 Frontend static files hosted from: ${frontendDist}`);
}
// Start server
app.listen(port, () => {
    console.log(`🚀 Backend server running on http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/api/health`);
});
exports.default = app;

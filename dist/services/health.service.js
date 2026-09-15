import http from 'http';
import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { checkDatabaseConnection } from '../database/prisma.js';
import { checkRedisConnection } from '../queue/queue.client.js';
import AdminApiService from './admin-api.service.js';
function findPublicFile(filename) {
    const candidates = [
        path.resolve(process.cwd(), 'public/admin', filename),
        path.resolve(process.cwd(), 'public', filename),
        path.resolve(process.cwd(), filename),
    ];
    for (const c of candidates) {
        try {
            if (fs.existsSync(c))
                return c;
        }
        catch { }
    }
    return null;
}
let server;
export function startHealthServer() {
    const port = config.PORT || 3000;
    server = http.createServer(async (req, res) => {
        const rawUrl = req.url || '/';
        const parsedUrl = new URL(rawUrl, 'http://localhost');
        const pathname = parsedUrl.pathname;
        // 1. Admin REST API routes
        if (pathname.startsWith('/api/admin')) {
            const handled = await AdminApiService.handleRequest(req, res);
            if (handled)
                return;
        }
        // 2. Admin Dashboard Static Assets (Both root "/" and "/admin" load Admin Panel)
        if (pathname === '/' || pathname === '/admin' || pathname === '/admin/') {
            const filePath = findPublicFile('index.html');
            if (filePath) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(fs.readFileSync(filePath));
                return;
            }
        }
        if (pathname === '/admin/style.css' || pathname === '/style.css') {
            const filePath = findPublicFile('style.css');
            if (filePath) {
                res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
                res.end(fs.readFileSync(filePath));
                return;
            }
        }
        if (pathname === '/admin/app.js' || pathname === '/app.js') {
            const filePath = findPublicFile('app.js');
            if (filePath) {
                res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
                res.end(fs.readFileSync(filePath));
                return;
            }
        }
        // 3. Healthcheck endpoint
        if (pathname === '/health' || pathname === '/api/health') {
            const [dbOk, redisOk] = await Promise.all([
                checkDatabaseConnection(),
                checkRedisConnection(),
            ]);
            const responsePayload = {
                status: 'healthy',
                service: 'ai-media-upscaler-telegram-bot',
                environment: config.NODE_ENV,
                uptimeSeconds: Math.round(process.uptime()),
                timestamp: new Date().toISOString(),
                adminDashboard: `/admin`,
                checks: {
                    bot: 'online',
                    database: dbOk ? 'online' : 'offline/pending',
                    redis: redisOk ? 'online' : 'offline/pending',
                },
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(responsePayload, null, 2));
            return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            logger.warn(`[HEALTH_SERVER] Port ${port} is currently in use. Server will retry or run as background.`);
        }
        else {
            logger.warn('[HEALTH_SERVER] HTTP server issue:', err.message);
        }
    });
    server.listen(port, () => {
        logger.info(`[HEALTH_SERVER] HTTP Web Server & Admin Panel running at http://localhost:${port}/admin`);
    });
    return server;
}
export function stopHealthServer() {
    return new Promise((resolve) => {
        if (server) {
            server.close(() => {
                logger.debug('[HEALTH_SERVER] HTTP server closed.');
                resolve();
            });
        }
        else {
            resolve();
        }
    });
}
export default startHealthServer;
//# sourceMappingURL=health.service.js.map
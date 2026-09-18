import http from 'http';
import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { checkDatabaseConnection } from '../database/prisma.js';
import { checkRedisConnection } from '../queue/queue.client.js';
import AdminApiService from './admin-api.service.js';
import { bot } from '../bot/bot.instance.js';
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
let keepAliveTimer;
export function startKeepAlivePinger() {
    const targetUrl = config.KEEP_ALIVE_URL || config.RENDER_EXTERNAL_URL;
    if (!targetUrl) {
        logger.debug('[KEEP_ALIVE] No KEEP_ALIVE_URL or RENDER_EXTERNAL_URL configured. Self-pinger inactive.');
        return;
    }
    const pingUrl = targetUrl.replace(/\/$/, '') + '/health';
    logger.info(`[KEEP_ALIVE] 24/7 Render Keep-Alive active! Self-pinging ${pingUrl} every 9 minutes.`);
    setTimeout(async () => {
        try {
            await fetch(pingUrl);
            logger.debug(`[KEEP_ALIVE] Initial self-ping sent to ${pingUrl}`);
        }
        catch (err) {
            logger.debug(`[KEEP_ALIVE] Initial ping note: ${err.message}`);
        }
    }, 60000);
    keepAliveTimer = setInterval(async () => {
        try {
            const response = await fetch(pingUrl);
            logger.debug(`[KEEP_ALIVE] 9-min keep-alive ping sent to ${pingUrl}: status ${response.status}`);
        }
        catch (err) {
            logger.warn(`[KEEP_ALIVE] Keep-alive ping failed to ${pingUrl}: ${err.message}`);
        }
    }, 9 * 60 * 1000);
}
export function stopKeepAlivePinger() {
    if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = undefined;
    }
}
export function startHealthServer() {
    const port = config.PORT || 3000;
    server = http.createServer(async (req, res) => {
        const rawUrl = req.url || '/';
        const parsedUrl = new URL(rawUrl, 'http://localhost');
        const pathname = parsedUrl.pathname;
        // 0. Telegram Webhook endpoint for Render 24/7 deployment
        const isWebhookPath = pathname === config.WEBHOOK_PATH ||
            pathname === '/webhook' ||
            pathname === '/api/telegram-webhook';
        if (req.method === 'POST' && isWebhookPath) {
            try {
                let bodyStr = '';
                req.on('data', (chunk) => {
                    bodyStr += chunk;
                });
                req.on('end', async () => {
                    try {
                        const update = JSON.parse(bodyStr);
                        await bot.handleUpdate(update);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true }));
                    }
                    catch (updateErr) {
                        logger.error('[WEBHOOK] Error handling update:', updateErr);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: false, error: updateErr.message }));
                    }
                });
                return;
            }
            catch (err) {
                logger.error('[WEBHOOK] Request error:', err);
                res.writeHead(500);
                res.end();
                return;
            }
        }
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
    stopKeepAlivePinger();
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
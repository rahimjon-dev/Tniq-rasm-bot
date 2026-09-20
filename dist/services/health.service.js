import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { checkDatabaseConnection } from '../database/prisma.js';
import { checkRedisConnection } from '../queue/queue.client.js';
import AdminApiService from './admin-api.service.js';
import UserService from './user.service.js';
import store from './store.service.js';
import PlanService from './plan.service.js';
import UsageService from './usage.service.js';
import BackgroundService from './media/background.service.js';
import { getImageUpscalerProvider } from '../ai/providers/image/index.js';
import { processVideoJob } from '../queue/workers/video.worker.js';
import { bot } from '../bot/bot.instance.js';
import { getT } from '../i18n/index.js';
import { sendReviewInvitation } from '../bot/handlers/review.handler.js';
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
function readJsonBody(req, maxBytes = 50 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
            raw += chunk;
            if (raw.length > maxBytes) {
                reject(new Error('Hajm juda katta (maksimal 50MB)'));
            }
        });
        req.on('end', () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            }
            catch {
                reject(new Error('Noto\'g\'ri JSON ma\'lumot'));
            }
        });
        req.on('error', reject);
    });
}
let server;
let keepAliveTimer;
export function startKeepAlivePinger() {
    const targetUrl = config.KEEP_ALIVE_URL ||
        config.RENDER_EXTERNAL_URL ||
        'https://tniq-rasm-bot.onrender.com';
    const pingUrl = targetUrl.replace(/\/$/, '') + '/health';
    logger.info(`[KEEP_ALIVE] 24/7 Render Keep-Alive active! Self-pinging ${pingUrl} every 5 minutes.`);
    setTimeout(async () => {
        try {
            await fetch(pingUrl);
            logger.debug(`[KEEP_ALIVE] Initial self-ping sent to ${pingUrl}`);
        }
        catch (err) {
            logger.debug(`[KEEP_ALIVE] Initial ping note: ${err.message}`);
        }
    }, 20000);
    keepAliveTimer = setInterval(async () => {
        try {
            const response = await fetch(pingUrl);
            logger.debug(`[KEEP_ALIVE] 5-min keep-alive ping sent to ${pingUrl}: status ${response.status}`);
        }
        catch (err) {
            logger.warn(`[KEEP_ALIVE] Keep-alive ping failed to ${pingUrl}: ${err.message}`);
        }
    }, 5 * 60 * 1000);
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
        // Handle CORS preflight for Mini App and external API calls
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            });
            res.end();
            return;
        }
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
                        // Respond 200 OK immediately so Telegram never times out on webhook calls (5s rule)
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true }));
                        // Process update asynchronously in background
                        setImmediate(() => {
                            bot.handleUpdate(update).catch((updateErr) => {
                                logger.error('[WEBHOOK] Error handling update:', updateErr);
                            });
                        });
                    }
                    catch (updateErr) {
                        logger.error('[WEBHOOK] Error parsing update JSON:', updateErr);
                        res.writeHead(400, { 'Content-Type': 'application/json' });
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
        // 1.5 Telegram Mini App REST APIs
        if (pathname === '/api/miniapp/user-info') {
            const tid = parsedUrl.searchParams.get('telegramId');
            const user = tid ? store.getUser(tid) : null;
            const plan = user?.plan || 'FREE';
            const used = user?.dailyUsage?.images || 0;
            const limits = PlanService.getLimits(plan);
            const isUnlimited = limits.isUnlimitedImages;
            const customBg = tid ? UserService.getUserCustomBackground(tid) : null;
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({
                telegramId: tid,
                firstName: user?.firstName || 'Foydalanuvchi',
                plan,
                planDisplayName: PlanService.getPlanDisplayName(plan),
                isUnlimited,
                imagesUsed: used,
                imagesRemaining: isUnlimited ? 'Cheksiz' : Math.max(0, limits.dailyImages - used),
                dailyImagesLimit: isUnlimited ? '∞' : limits.dailyImages,
                dailyVideosLimit: isUnlimited ? '∞' : limits.dailyVideos,
                hasCustomBackground: !!(customBg && fs.existsSync(customBg)),
                customBackgroundUrl: customBg && fs.existsSync(customBg) ? `/api/miniapp/custom-bg?telegramId=${tid}` : null,
            }));
            return;
        }
        if (pathname === '/api/miniapp/custom-bg') {
            const tid = parsedUrl.searchParams.get('telegramId');
            const bgPath = tid ? UserService.getUserCustomBackground(tid) : null;
            if (bgPath && fs.existsSync(bgPath)) {
                res.writeHead(200, {
                    'Content-Type': 'image/jpeg',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache',
                });
                res.end(fs.readFileSync(bgPath));
                return;
            }
            res.writeHead(404, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ error: 'Maxsus fon topilmadi' }));
            return;
        }
        if (pathname === '/api/miniapp/reset-background' && (req.method === 'POST' || req.method === 'GET')) {
            const tid = parsedUrl.searchParams.get('telegramId');
            if (tid) {
                UserService.setUserCustomBackground(tid, null);
            }
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ success: true }));
            return;
        }
        if (pathname === '/api/miniapp/set-background' && req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
                const tid = body.telegramId;
                const imageBase64 = body.imageBase64;
                if (!tid || !imageBase64) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ success: false, error: 'telegramId va imageBase64 talab qilinadi' }));
                    return;
                }
                const user = store.getUser(tid);
                const userPlan = user?.plan || 'FREE';
                if (!PlanService.canUseCustomBackground(userPlan)) {
                    res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Maxsus fon faqat PRO tarif egalari uchun mavjud! PRO olish uchun @rahmonoov_19 bilan bog\'laning.',
                    }));
                    return;
                }
                const bgDir = path.resolve(process.cwd(), 'storage/backgrounds');
                fs.mkdirSync(bgDir, { recursive: true });
                const bgPath = path.join(bgDir, `bg_${tid}.jpg`);
                const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
                fs.writeFileSync(bgPath, Buffer.from(cleanBase64, 'base64'));
                UserService.setUserCustomBackground(tid, bgPath);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, message: 'Maxsus fon muvaffaqiyatli saqlandi!' }));
                return;
            }
            catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Xatolik yuz berdi' }));
                return;
            }
        }
        // 1.6 Telegram Mini App Reviews & Ratings REST APIs
        if (pathname === '/api/miniapp/reviews' && req.method === 'GET') {
            const stats = store.getAverageRating();
            const reviews = store.getRecentReviews(20);
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({
                success: true,
                average: stats.average,
                count: stats.count,
                breakdown: stats.breakdown,
                reviews,
            }));
            return;
        }
        if (pathname === '/api/miniapp/reviews' && req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
                const tid = body.telegramId;
                const rating = Number(body.rating) || 5;
                const comment = (body.comment || '').trim();
                if (!tid) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ success: false, error: 'telegramId talab qilinadi' }));
                    return;
                }
                const saved = store.addReview({
                    telegramId: tid,
                    rating,
                    comment,
                });
                // Notify Admin if there is a comment
                if (comment) {
                    const u = store.getUser(tid);
                    const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Mini App Foydalanuvchisi';
                    const username = u?.username ? `@${u.username}` : 'Mavjud emas';
                    const stars = '⭐'.repeat(saved.rating);
                    const nowStr = new Intl.DateTimeFormat('uz-UZ', {
                        timeZone: 'Asia/Tashkent',
                        dateStyle: 'short',
                        timeStyle: 'medium',
                    }).format(new Date());
                    for (const adminId of config.ADMIN_TELEGRAM_IDS) {
                        try {
                            await bot.telegram.sendMessage(Number(adminId), `🌟 <b>YANGI BAHOLASH VA IZOH (Mini App)!</b>\n\n` +
                                `👤 <b>Foydalanuvchi:</b> ${name} (${username})\n` +
                                `🆔 <b>Telegram ID:</b> <code>${tid}</code>\n` +
                                `⭐ <b>Baho:</b> ${stars} (${saved.rating}/5)\n` +
                                `💬 <b>Izoh:</b> <i>"${comment}"</i>\n` +
                                `📅 <b>Vaqt:</b> ${nowStr}`, { parse_mode: 'HTML' });
                        }
                        catch { }
                    }
                }
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, message: 'Fikringiz va bahoyingiz muvaffaqiyatli saqlandi!', review: saved }));
                return;
            }
            catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: err.message || 'Xatolik yuz berdi' }));
                return;
            }
        }
        if (pathname === '/api/miniapp/process' && req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
                const tid = body.telegramId;
                const type = (body.type || 'IMAGE').toUpperCase();
                const scale = parseInt(body.scale, 10) || 4;
                const imageBase64 = body.imageBase64;
                if (!tid) {
                    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ success: false, error: 'Telegram ID kiritilmadi' }));
                    return;
                }
                if (store.isUserBanned(tid)) {
                    res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ success: false, error: 'Hisobingiz bloklangan' }));
                    return;
                }
                const storedUser = store.getUser(tid);
                const userPlan = storedUser?.plan || 'FREE';
                const userId = storedUser?.id || String(tid);
                const lang = storedUser?.languageCode || 'uz';
                const t = getT(lang);
                if (type === 'IMAGE') {
                    if (!imageBase64) {
                        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ success: false, error: 'Rasm yuborilmadi' }));
                        return;
                    }
                    const quota = await UsageService.canProcessImage(userId, tid, userPlan);
                    if (!quota.allowed) {
                        res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({
                            success: false,
                            error: `Bugungi rasm limitingiz (${quota.maxLimit}) tugadi! Cheksiz PRO tarifga o'tish uchun @rahmonoov_19 bilan bog'laning.`,
                        }));
                        return;
                    }
                    const tempDir = path.resolve(process.cwd(), 'storage/temp');
                    fs.mkdirSync(tempDir, { recursive: true });
                    const fileId = crypto.randomUUID();
                    const inputPath = path.join(tempDir, `miniapp_in_${fileId}.jpg`);
                    const outputPath = path.join(tempDir, `miniapp_out_${fileId}.jpg`);
                    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
                    fs.writeFileSync(inputPath, Buffer.from(cleanBase64, 'base64'));
                    // Immediately respond 200 OK to the client so Mini App never times out or drops connection
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({
                        success: true,
                        message: 'Rasmingiz qabul qilindi! AI 4K tiniqlashtirish boshlandi va tayyor bo\'lgach Telegram botingizga yuboriladi.',
                        jobId: fileId,
                    }));
                    // Asynchronous processing in background:
                    setImmediate(async () => {
                        let progressMsg = null;
                        try {
                            try {
                                progressMsg = await bot.telegram.sendMessage(Number(tid), '⚡ <b>AI 4K Tiniqlashtirish boshlandi...</b>\n<i>Natija bir necha soniyada tayyorlanib yuboriladi.</i>', { parse_mode: 'HTML' });
                            }
                            catch { }
                            let processingInputPath = inputPath;
                            const customBg = UserService.getUserCustomBackground(tid);
                            if (PlanService.canUseCustomBackground(userPlan) && customBg && BackgroundService.hasCustomBackground(customBg)) {
                                try {
                                    const compositePath = path.join(tempDir, `miniapp_bg_${fileId}.jpg`);
                                    processingInputPath = await BackgroundService.replaceBackground(inputPath, customBg, compositePath);
                                }
                                catch (bgErr) {
                                    logger.warn('[MINIAPP_PROCESS] Background replace notice:', bgErr.message);
                                }
                            }
                            const scaleVal = scale === 2 ? 2 : 4;
                            const provider = getImageUpscalerProvider();
                            const startTime = Date.now();
                            const result = await provider.upscaleImage(processingInputPath, outputPath, {
                                scale: scaleVal,
                                format: 'jpg',
                            });
                            const duration = (Date.now() - startTime) / 1000;
                            const caption = t.complete_image(scaleVal, `${result.originalWidth}x${result.originalHeight}`, `${result.outputWidth}x${result.outputHeight}`, duration);
                            // Send to Telegram chat
                            try {
                                await bot.telegram.sendPhoto(Number(tid), { source: outputPath }, { caption, parse_mode: 'HTML' });
                                await bot.telegram.sendDocument(Number(tid), { source: outputPath, filename: `4k_upscaled_${scaleVal}x_${result.outputWidth}x${result.outputHeight}.jpg` }, { caption: t.doc_image_caption, parse_mode: 'HTML' });
                                // Send interactive review invitation
                                setTimeout(() => {
                                    sendReviewInvitation(Number(tid), lang).catch(() => { });
                                }, 1200);
                            }
                            catch (tgSendErr) {
                                logger.error('[MINIAPP_PROCESS] Failed to send photo to Telegram:', tgSendErr);
                            }
                            if (progressMsg) {
                                try {
                                    await bot.telegram.deleteMessage(Number(tid), progressMsg.message_id);
                                }
                                catch { }
                            }
                            await Promise.all([
                                UsageService.incrementImageUsage(userId, tid),
                                UsageService.recordJob({
                                    userId,
                                    telegramId: tid,
                                    type: 'IMAGE',
                                    scale: scaleVal,
                                    status: 'COMPLETED',
                                    inputResolution: `${result.originalWidth}x${result.originalHeight}`,
                                    outputResolution: `${result.outputWidth}x${result.outputHeight}`,
                                    inputSize: fs.existsSync(inputPath) ? fs.statSync(inputPath).size : 0,
                                    outputSize: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0,
                                    processingTimeSeconds: duration,
                                }),
                            ]);
                        }
                        catch (bgProcErr) {
                            logger.error('[MINIAPP_PROCESS] Background process error:', bgProcErr);
                            try {
                                await bot.telegram.sendMessage(Number(tid), `❌ <b>Rasmga ishlov berishda xatolik yuz berdi:</b>\n<code>${bgProcErr.message}</code>`, { parse_mode: 'HTML' });
                            }
                            catch { }
                        }
                        finally {
                            // Clean up temp files safely
                            setTimeout(() => {
                                try {
                                    if (fs.existsSync(inputPath))
                                        fs.unlinkSync(inputPath);
                                }
                                catch { }
                                try {
                                    if (fs.existsSync(outputPath))
                                        fs.unlinkSync(outputPath);
                                }
                                catch { }
                            }, 15000);
                        }
                    });
                    return;
                }
                if (type === 'VIDEO') {
                    const videoBase64 = body.videoBase64 || body.mediaBase64 || body.imageBase64;
                    if (!videoBase64) {
                        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ success: false, error: 'Video fayli yuborilmadi' }));
                        return;
                    }
                    const quota = await UsageService.canProcessVideo(userId, tid, userPlan);
                    if (!quota.allowed) {
                        res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({
                            success: false,
                            error: `Bugungi video limitingiz (${quota.maxLimit}) tugadi! Cheksiz PRO tarifga o'tish uchun @rahmonoov_19 bilan bog'laning.`,
                        }));
                        return;
                    }
                    const tempDir = path.resolve(process.cwd(), 'storage/temp');
                    const outDir = path.resolve(process.cwd(), config.paths.outputStorage);
                    fs.mkdirSync(tempDir, { recursive: true });
                    fs.mkdirSync(outDir, { recursive: true });
                    const fileId = crypto.randomUUID();
                    const targetResolution = (body.resolution || '4K');
                    const inputPath = path.join(tempDir, `miniapp_vid_in_${fileId}.mp4`);
                    const outputPath = path.join(outDir, `miniapp_vid_out_${fileId}_${targetResolution}.mp4`);
                    const cleanBase64 = videoBase64.replace(/^data:video\/\w+;base64,/, '').replace(/^data:application\/\w+;base64,/, '');
                    fs.writeFileSync(inputPath, Buffer.from(cleanBase64, 'base64'));
                    // Immediately respond 200 OK so Mini App never times out
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({
                        success: true,
                        message: 'Videongiz qabul qilindi! AI 4K tiniqlashtirish boshlandi va tayyor bo\'lgach Telegram botingizga yuboriladi.',
                        jobId: fileId,
                    }));
                    // Asynchronous video processing in background:
                    setImmediate(async () => {
                        try {
                            let scale = 2;
                            if (targetResolution === '4K')
                                scale = 4;
                            await processVideoJob({
                                jobId: fileId,
                                userId,
                                telegramChatId: Number(tid),
                                inputFilePath: inputPath,
                                outputFilePath: outputPath,
                                targetResolution,
                                scale,
                                language: lang,
                                createdAt: new Date().toISOString(),
                            });
                        }
                        catch (vidProcErr) {
                            logger.error('[MINIAPP_PROCESS] Video processing error:', vidProcErr);
                        }
                    });
                    return;
                }
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: 'Qo\'llab quvvatlanmaydigan media turi' }));
                return;
            }
            catch (procErr) {
                logger.error('[MINIAPP_PROCESS] Error processing request:', procErr);
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: procErr.message || 'Server xatosi' }));
                return;
            }
        }
        // 2. Telegram Mini App Static Assets (/app, /app/style.css, /app/app.js)
        if (pathname === '/app' || pathname === '/app/') {
            const filePath = path.resolve(process.cwd(), 'public/app/index.html');
            if (fs.existsSync(filePath)) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(fs.readFileSync(filePath));
                return;
            }
        }
        if (pathname === '/app/style.css') {
            const filePath = path.resolve(process.cwd(), 'public/app/style.css');
            if (fs.existsSync(filePath)) {
                res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
                res.end(fs.readFileSync(filePath));
                return;
            }
        }
        if (pathname === '/app/app.js') {
            const filePath = path.resolve(process.cwd(), 'public/app/app.js');
            if (fs.existsSync(filePath)) {
                res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
                res.end(fs.readFileSync(filePath));
                return;
            }
        }
        // 2.5 Admin Dashboard Static Assets (Both root "/" and "/admin" load Admin Panel)
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
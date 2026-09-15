import logger from '../../utils/logger.js';
// Cooldown tracker: telegramId -> lastMessageTimestamp
const userLastMessageTimes = new Map();
// Active processing lock: userId -> boolean
const activeJobLocks = new Set();
const MESSAGE_COOLDOWN_MS = 100; // 100ms anti-flood protection
export function acquireUserJobLock(userId) {
    if (activeJobLocks.has(userId)) {
        return false; // already has active job
    }
    activeJobLocks.add(userId);
    return true;
}
export function releaseUserJobLock(userId) {
    activeJobLocks.delete(userId);
}
export async function rateLimitMiddleware(ctx, next) {
    const telegramId = ctx.from?.id;
    if (!telegramId || ctx.callbackQuery) {
        return next();
    }
    const now = Date.now();
    const lastTime = userLastMessageTimes.get(telegramId);
    // Only block inhuman bot/script floods (< 100ms)
    if (lastTime && now - lastTime < MESSAGE_COOLDOWN_MS) {
        logger.debug(`[RATE_LIMIT] Blocked rapid spam from user ${telegramId}`);
        return;
    }
    userLastMessageTimes.set(telegramId, now);
    // Auto cleanup entries older than 5 minutes to prevent memory leaks
    if (userLastMessageTimes.size > 5000) {
        const cutoff = now - 300000;
        for (const [id, time] of userLastMessageTimes.entries()) {
            if (time < cutoff)
                userLastMessageTimes.delete(id);
        }
    }
    return next();
}
//# sourceMappingURL=rate-limit.middleware.js.map
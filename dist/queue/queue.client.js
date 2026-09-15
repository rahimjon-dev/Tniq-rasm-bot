import net from 'net';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import config from '../config/index.js';
import logger from '../utils/logger.js';
let redisInstance = null;
let imageQueueInstance = null;
let videoQueueInstance = null;
let isRedisConnected = false;
export function isRedisAvailable() {
    return isRedisConnected;
}
export async function isRedisReachable(timeoutMs = 500) {
    return new Promise((resolve) => {
        try {
            const url = new URL(config.REDIS_URL);
            const port = Number(url.port) || 6379;
            const host = url.hostname || '127.0.0.1';
            const socket = new net.Socket();
            let finished = false;
            const finish = (result) => {
                if (!finished) {
                    finished = true;
                    socket.destroy();
                    resolve(result);
                }
            };
            socket.setTimeout(timeoutMs);
            socket.once('connect', () => finish(true));
            socket.once('timeout', () => finish(false));
            socket.once('error', () => finish(false));
            socket.connect(port, host);
        }
        catch {
            resolve(false);
        }
    });
}
export async function checkRedisConnection() {
    const reachable = await isRedisReachable();
    if (!reachable) {
        isRedisConnected = false;
        return false;
    }
    try {
        if (!redisInstance) {
            redisInstance = new Redis(config.REDIS_URL, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
                lazyConnect: true,
                retryStrategy(times) {
                    return Math.min(times * 1000, 5000);
                },
            });
            redisInstance.on('error', (err) => {
                logger.debug('Redis connection error:', err.message);
            });
            await redisInstance.connect();
        }
        const pong = await redisInstance.ping();
        isRedisConnected = pong === 'PONG';
        return isRedisConnected;
    }
    catch {
        isRedisConnected = false;
        return false;
    }
}
export function getRedisClient() {
    return redisInstance;
}
export function getImageQueue() {
    if (!isRedisConnected || !redisInstance)
        return null;
    if (!imageQueueInstance) {
        imageQueueInstance = new Queue('image-upscale', {
            connection: redisInstance,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: 100,
                removeOnFail: 500,
            },
        });
        imageQueueInstance.on('error', (err) => logger.warn('BullMQ image queue error:', err.message));
    }
    return imageQueueInstance;
}
export function getVideoQueue() {
    if (!isRedisConnected || !redisInstance)
        return null;
    if (!videoQueueInstance) {
        videoQueueInstance = new Queue('video-upscale', {
            connection: redisInstance,
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: 'exponential', delay: 10000 },
                removeOnComplete: 50,
                removeOnFail: 200,
            },
        });
        videoQueueInstance.on('error', (err) => logger.warn('BullMQ video queue error:', err.message));
    }
    return videoQueueInstance;
}
export async function closeRedis() {
    if (redisInstance) {
        try {
            await redisInstance.quit();
        }
        catch { }
        redisInstance = null;
    }
    if (imageQueueInstance) {
        try {
            await imageQueueInstance.close();
        }
        catch { }
        imageQueueInstance = null;
    }
    if (videoQueueInstance) {
        try {
            await videoQueueInstance.close();
        }
        catch { }
        videoQueueInstance = null;
    }
    isRedisConnected = false;
}
// Safe compatibility proxies for existing imports
export const redisConnection = {
    async quit() {
        await closeRedis();
    },
};
export const imageQueue = {
    async add(name, data, opts) {
        const q = getImageQueue();
        if (q)
            return q.add(name, data, opts);
        throw new Error('Redis offline');
    },
    async getWaitingCount() {
        const q = getImageQueue();
        return q ? q.getWaitingCount() : 0;
    },
    async getActiveCount() {
        const q = getImageQueue();
        return q ? q.getActiveCount() : 0;
    },
    async close() {
        const q = getImageQueue();
        if (q)
            return q.close();
    },
};
export const videoQueue = {
    async add(name, data, opts) {
        const q = getVideoQueue();
        if (q)
            return q.add(name, data, opts);
        throw new Error('Redis offline');
    },
    async getWaitingCount() {
        const q = getVideoQueue();
        return q ? q.getWaitingCount() : 0;
    },
    async getActiveCount() {
        const q = getVideoQueue();
        return q ? q.getActiveCount() : 0;
    },
    async close() {
        const q = getVideoQueue();
        if (q)
            return q.close();
    },
};
//# sourceMappingURL=queue.client.js.map
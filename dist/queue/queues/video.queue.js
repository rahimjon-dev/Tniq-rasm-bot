import { videoQueue, checkRedisConnection } from '../queue.client.js';
import { processVideoJob } from '../workers/video.worker.js';
import logger from '../../utils/logger.js';
export async function enqueueVideoJob(payload) {
    const isRedisAlive = await checkRedisConnection();
    if (isRedisAlive) {
        await videoQueue.add(`video-${payload.jobId}`, payload, {
            jobId: payload.jobId,
        });
        logger.info(`[QUEUE] Enqueued video job #${payload.jobId} into BullMQ`);
    }
    else {
        logger.warn(`[QUEUE] Redis is not connected. Processing video job #${payload.jobId} directly in background.`);
        setImmediate(() => {
            processVideoJob(payload).catch((err) => {
                logger.error(`[DIRECT_VIDEO_PROCESS] Job failed:`, err);
            });
        });
    }
}
//# sourceMappingURL=video.queue.js.map
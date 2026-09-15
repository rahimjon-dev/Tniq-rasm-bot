import { imageQueue, checkRedisConnection } from '../queue.client.js';
import { ImageJobPayload } from '../../types/job.types.js';
import { processImageJob } from '../workers/image.worker.js';
import logger from '../../utils/logger.js';

export async function enqueueImageJob(payload: ImageJobPayload): Promise<void> {
  const isRedisAlive = await checkRedisConnection();

  if (isRedisAlive) {
    // Add to standard BullMQ queue
    await imageQueue.add(`image-${payload.jobId}`, payload, {
      jobId: payload.jobId,
    });
    logger.info(`[QUEUE] Enqueued image job #${payload.jobId} into BullMQ`);
  } else {
    // Graceful in-process fallback when Redis is offline
    logger.warn(`[QUEUE] Redis is not connected. Processing image job #${payload.jobId} directly in background.`);
    setImmediate(() => {
      processImageJob(payload).catch((err) => {
        logger.error(`[DIRECT_PROCESS] Job failed:`, err);
      });
    });
  }
}

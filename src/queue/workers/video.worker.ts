import fs from 'fs';
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queue.client.js';
import { VideoJobPayload } from '../../types/job.types.js';
import { getVideoUpscalerProvider } from '../../ai/providers/video/index.js';
import UsageService from '../../services/usage.service.js';
import ImageService from '../../services/media/image.service.js';
import { bot } from '../../bot/bot.instance.js';
import logger from '../../utils/logger.js';
import { getT } from '../../i18n/index.js';

export async function processVideoJob(payload: VideoJobPayload): Promise<void> {
  const { jobId, userId, telegramChatId, inputFilePath, outputFilePath, targetResolution, scale } = payload;
  const startTime = Date.now();
  let statusMsgId: number | undefined;

  const t = getT(payload.language);

  try {
    // 1. Notify user in Telegram
    const sent = await bot.telegram.sendMessage(
      telegramChatId,
      t.processing_video(targetResolution),
      { parse_mode: 'HTML' }
    );
    statusMsgId = sent.message_id;

    // 2. Execute AI Video Pipeline
    const provider = getVideoUpscalerProvider();

    const result = await provider.upscaleVideo(inputFilePath, outputFilePath, {
      targetResolution,
      scale,
    });

    // 3. Clean up status message
    if (statusMsgId) {
      try {
        await bot.telegram.deleteMessage(telegramChatId, statusMsgId);
      } catch {}
    }

    // 4. Deliver Enhanced Video
    const inputSize = fs.existsSync(inputFilePath) ? (await fs.promises.stat(inputFilePath)).size : 0;
    const duration = (Date.now() - startTime) / 1000;

    const caption = t.complete_video(targetResolution, duration);

    // Send as streamable Telegram video
    await bot.telegram.sendVideo(
      telegramChatId,
      { source: outputFilePath },
      {
        caption,
        parse_mode: 'HTML',
        supports_streaming: true,
      }
    );

    // Send as uncompressed document
    await bot.telegram.sendDocument(
      telegramChatId,
      { source: outputFilePath, filename: `upscaled_${targetResolution}_${result.outputResolution}.mp4` },
      { caption: `📁 <i>Asl sifatdagi video fayl (Document)</i>`, parse_mode: 'HTML' }
    );

    // 5. Update Database Records
    await Promise.all([
      UsageService.incrementVideoUsage(userId),
      UsageService.recordJob({
        userId,
        type: 'VIDEO',
        scale,
        status: 'COMPLETED',
        inputResolution: result.originalResolution,
        outputResolution: result.outputResolution,
        inputSize,
        outputSize: result.outputSizeBytes,
        processingTimeSeconds: duration,
      }),
    ]);

    logger.info(`[VIDEO_JOB_COMPLETED] Job=${jobId} User=${userId} Res=${targetResolution} Duration=${duration.toFixed(2)}s`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[VIDEO_JOB_FAILED] Job=${jobId}:`, { error: errorMsg });

    if (statusMsgId) {
      try {
        await bot.telegram.deleteMessage(telegramChatId, statusMsgId);
      } catch {}
    }

    await bot.telegram.sendMessage(
      telegramChatId,
      `❌ <b>Video processing encountered an issue:</b>\n<code>${errorMsg}</code>\n\nPlease try again with a shorter clip or contact support.`,
      { parse_mode: 'HTML' }
    );

    await UsageService.recordJob({
      userId,
      type: 'VIDEO',
      scale,
      status: 'FAILED',
      errorMessage: errorMsg,
    });
  } finally {
    // 6. Strict Cleanup
    await ImageService.safeDelete(inputFilePath);
    await ImageService.safeDelete(outputFilePath);
  }
}

// BullMQ Video Worker lifecycle
let videoWorkerInstance: Worker<VideoJobPayload> | null = null;

export function startVideoWorker(redis: any): Worker<VideoJobPayload> {
  if (videoWorkerInstance) return videoWorkerInstance;

  videoWorkerInstance = new Worker<VideoJobPayload>(
    'video-upscale',
    async (job: Job<VideoJobPayload>) => {
      logger.info(`[VIDEO_WORKER] Processing video job #${job.id} for user ${job.data.userId}`);
      await processVideoJob(job.data);
    },
    {
      connection: redis,
      concurrency: 1, // Process 1 video at a time to prevent GPU/CPU thrashing
    }
  );

  videoWorkerInstance.on('failed', (job, err) => {
    logger.error(`[VIDEO_WORKER_FAILED] Job #${job?.id} failed:`, err);
  });

  videoWorkerInstance.on('error', (err) => {
    logger.warn('BullMQ video worker Redis error:', err.message);
  });

  return videoWorkerInstance;
}

export async function stopVideoWorker(): Promise<void> {
  if (videoWorkerInstance) {
    try {
      await videoWorkerInstance.close();
    } catch {}
    videoWorkerInstance = null;
  }
}

export const videoWorker = {
  async close() {
    await stopVideoWorker();
  },
} as unknown as Worker<VideoJobPayload>;

export default videoWorker;


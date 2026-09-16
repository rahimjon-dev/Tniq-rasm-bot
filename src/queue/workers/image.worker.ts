import fs from 'fs';
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queue.client.js';
import { ImageJobPayload } from '../../types/job.types.js';
import { getImageUpscalerProvider } from '../../ai/providers/image/index.js';
import ImageService from '../../services/media/image.service.js';
import UsageService from '../../services/usage.service.js';
import { bot } from '../../bot/bot.instance.js';
import logger from '../../utils/logger.js';
import { getT } from '../../i18n/index.js';

export async function processImageJob(payload: ImageJobPayload): Promise<void> {
  const { jobId, userId, telegramChatId, inputFilePath, outputFilePath, scale } = payload;
  const startTime = Date.now();
  let statusMsgId: number | undefined;

  const t = getT(payload.language);

  try {
    // 1. Stage 1: Preparing
    const sent = await bot.telegram.sendMessage(
      telegramChatId,
      t.stage_preparing,
      { parse_mode: 'HTML' }
    );
    statusMsgId = sent.message_id;

    // 2. Stage 2: Generating
    try {
      await bot.telegram.editMessageText(
        telegramChatId,
        statusMsgId,
        undefined,
        t.stage_generating(scale),
        { parse_mode: 'HTML' }
      );
    } catch {}

    // Perform AI Upscale
    const provider = getImageUpscalerProvider();
    const result = await provider.upscaleImage(inputFilePath, outputFilePath, {
      scale,
      format: payload.format || 'jpg',
    });

    // 3. Stage 3: Enhancing & Uploading
    try {
      await bot.telegram.editMessageText(
        telegramChatId,
        statusMsgId,
        undefined,
        t.stage_uploading,
        { parse_mode: 'HTML' }
      );
    } catch {}

    // 4. Send Enhanced Image to User
    const inputSize = fs.existsSync(inputFilePath) ? (await fs.promises.stat(inputFilePath)).size : 0;
    const outputSize = fs.existsSync(outputFilePath) ? (await fs.promises.stat(outputFilePath)).size : 0;
    const duration = (Date.now() - startTime) / 1000;

    const caption = t.complete_image(
      scale,
      `${result.originalWidth}x${result.originalHeight}`,
      `${result.outputWidth}x${result.outputHeight}`,
      duration
    );

    // Send as compressed photo for instant viewing
    await bot.telegram.sendPhoto(
      telegramChatId,
      { source: outputFilePath },
      { caption, parse_mode: 'HTML' }
    );

    // Send as uncompressed document to prevent Telegram lossy re-compression
    await bot.telegram.sendDocument(
      telegramChatId,
      { source: outputFilePath, filename: `upscaled_${scale}x_${result.outputWidth}x${result.outputHeight}.jpg` },
      { caption: t.doc_image_caption, parse_mode: 'HTML' }
    );

    // Clean up status message
    if (statusMsgId) {
      try {
        await bot.telegram.deleteMessage(telegramChatId, statusMsgId);
      } catch {}
    }

    // 5. Update Database Records
    await Promise.all([
      UsageService.incrementImageUsage(userId, telegramChatId),
      UsageService.recordJob({
        userId,
        telegramId: telegramChatId,
        type: 'IMAGE',
        scale,
        status: 'COMPLETED',
        inputResolution: `${result.originalWidth}x${result.originalHeight}`,
        outputResolution: `${result.outputWidth}x${result.outputHeight}`,
        inputSize,
        outputSize,
        processingTimeSeconds: duration,
      }),
    ]);

    logger.info(`[JOB_COMPLETED] Job=${jobId} User=${userId} Scale=${scale}x Duration=${duration.toFixed(2)}s`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`[JOB_FAILED] Job=${jobId}:`, { error: errorMsg });

    UsageService.releaseImageReservation(telegramChatId);

    if (statusMsgId) {
      try {
        await bot.telegram.deleteMessage(telegramChatId, statusMsgId);
      } catch {}
    }

    await bot.telegram.sendMessage(
      telegramChatId,
      t.process_image_error(errorMsg),
      { parse_mode: 'HTML' }
    );

    await UsageService.recordJob({
      userId,
      telegramId: telegramChatId,
      type: 'IMAGE',
      scale,
      status: 'FAILED',
    });
  }
}

export let imageWorker: Worker;

export function startImageWorker(connection = redisConnection): Worker {
  imageWorker = new Worker(
    'image-upscale-queue',
    async (job: Job<ImageJobPayload>) => {
      logger.info(`[IMAGE_WORKER] Processing job: ${job.id}`);
      await processImageJob(job.data);
    },
    {
      connection,
      concurrency: 4,
    }
  );

  imageWorker.on('completed', (job: Job) => {
    logger.debug(`[IMAGE_WORKER] Job completed successfully: ${job.id}`);
  });

  imageWorker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`[IMAGE_WORKER] Job failed: ${job?.id}`, { error: err.message });
  });

  return imageWorker;
}

export default startImageWorker;

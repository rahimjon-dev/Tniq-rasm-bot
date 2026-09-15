import fs from 'fs';
import config from './config/index.js';
import logger from './utils/logger.js';
import { bot, registerBotCommands } from './bot/bot.instance.js';
import prisma, { checkDatabaseConnection } from './database/prisma.js';
import { redisConnection, checkRedisConnection, getRedisClient } from './queue/queue.client.js';
import { imageWorker, startImageWorker } from './queue/workers/image.worker.js';
import { videoWorker, startVideoWorker } from './queue/workers/video.worker.js';
import CleanupService from './services/media/cleanup.service.js';
import { startHealthServer, stopHealthServer } from './services/health.service.js';
import store from './services/store.service.js';

export async function bootstrap(): Promise<void> {
  logger.info('================================================================');
  logger.info('🚀 AI MEDIA UPSCALER TELEGRAM BOT - PRODUCTION ENGINE ONLINE');
  logger.info(`Environment: ${config.NODE_ENV} | Port: ${config.PORT}`);
  logger.info('================================================================');

  // 1. Ensure local storage directories exist
  for (const dir of [config.paths.tempStorage, config.paths.outputStorage]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Initialized storage directory: ${dir}`);
    }
  }

  // 2. Perform non-blocking health checks on external dependencies
  const [dbOk, redisOk] = await Promise.all([
    checkDatabaseConnection(),
    checkRedisConnection(),
  ]);

  logger.info(
    `Infrastructure Status: Database=${dbOk ? 'ONLINE (PostgreSQL)' : 'IN-MEMORY MODE'}, Redis=${redisOk ? 'ONLINE (BullMQ)' : 'IN-MEMORY ASYNC'}`
  );

  // Sync users from PostgreSQL into store on startup if database is online
  if (dbOk) {
    try {
      const dbUsers = await prisma.user.findMany({
        include: {
          subscription: true,
          _count: { select: { jobs: true } },
        },
      });
      store.syncFromDatabase(dbUsers);
    } catch (err) {
      logger.warn('Initial database sync error:', err);
    }
  }

  // 3. Start BullMQ workers if Redis is available
  if (redisOk) {
    const redis = getRedisClient();
    if (redis) {
      startImageWorker(redis);
      startVideoWorker(redis);
      logger.info('✅ BullMQ background queue workers active');
    }
  } else {
    logger.info('ℹ️ Direct background async processing active for media jobs');
  }

  // 4. Start automated periodic storage cleanup scheduler (every 30 mins)
  CleanupService.startScheduler(30);

  // 5. Start HTTP Health & Monitoring server (/health)
  startHealthServer();


  // 5. Register Telegram menu commands
  await registerBotCommands();

  // 6. Setup Robust Graceful Shutdown routines
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}. Initiating graceful shutdown sequence...`);

    // 1. Stop receiving new Telegram updates
    try {
      bot.stop(signal);
      logger.debug('Telegram bot polling stopped.');
    } catch {}

    // 2. Stop cleanup scheduler
    CleanupService.stopScheduler();

    // 3. Close BullMQ background workers
    try {
      await Promise.all([
        imageWorker.close(),
        videoWorker.close(),
      ]);
      logger.debug('BullMQ workers closed cleanly.');
    } catch (err) {
      logger.warn('Error while closing workers:', err);
    }

    // 4. Disconnect Redis
    try {
      await redisConnection.quit();
      logger.debug('Redis connection closed.');
    } catch {}

    // 5. Disconnect Prisma
    try {
      await prisma.$disconnect();
      logger.debug('Database connection disconnected.');
    } catch {}

    // 6. Stop HTTP health server
    await stopHealthServer();

    // 7. Flush persistent storage to disk
    try {
      store.flushSync();
      logger.debug('Persistent storage state saved.');
    } catch {}

    logger.info('All subsystems halted safely. Exiting process.');
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  // 7. Launch the Telegram Bot
  try {
    const botInfo = await bot.telegram.getMe();
    bot.launch().catch((err) => {
      logger.error('Telegram bot polling error:', err);
    });
    logger.info(`✅ Telegram Bot @${botInfo.username} is fully operational and receiving updates`);
  } catch (error) {
    logger.error('Failed to launch Telegram Bot:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}


export default bootstrap;

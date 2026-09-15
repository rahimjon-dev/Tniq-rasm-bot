import prisma, { isDatabaseAvailable } from '../database/prisma.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { UserPlan } from '../types/user.types.js';
import store from './store.service.js';

// In-memory usage store for offline development
const inMemoryUsage = new Map<string, { images: number; videos: number }>();

export class UsageService {
  private static getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  static getMaxImagesForPlan(plan: UserPlan): number {
    switch (plan) {
      case 'BUSINESS':
        return 999999; // Unlimited
      case 'PRO':
        return 50;
      case 'FREE':
      default:
        return config.FREE_DAILY_IMAGE_LIMIT;
    }
  }

  static async canProcessImage(userId: string, plan: UserPlan): Promise<{ allowed: boolean; remaining: number; maxLimit: number }> {
    const today = this.getTodayDateString();
    const maxLimit = this.getMaxImagesForPlan(plan);

    if (!isDatabaseAvailable()) {
      const key = `${userId}_${today}`;
      const record = inMemoryUsage.get(key) || { images: 0, videos: 0 };
      const remaining = Math.max(0, maxLimit - record.images);
      return {
        allowed: record.images < maxLimit,
        remaining,
        maxLimit,
      };
    }

    try {
      const usage = await prisma.usage.findUnique({
        where: { userId_date: { userId, date: today } },
      });

      const currentUsed = usage?.imageJobs || 0;
      const remaining = Math.max(0, maxLimit - currentUsed);
      return {
        allowed: currentUsed < maxLimit,
        remaining,
        maxLimit,
      };
    } catch {
      // In-memory fallback
      const key = `${userId}_${today}`;
      const record = inMemoryUsage.get(key) || { images: 0, videos: 0 };
      const remaining = Math.max(0, maxLimit - record.images);
      return {
        allowed: record.images < maxLimit,
        remaining,
        maxLimit,
      };
    }
  }


  static async incrementImageUsage(userId: string): Promise<void> {
    const today = this.getTodayDateString();
    if (!isDatabaseAvailable()) {
      const key = `${userId}_${today}`;
      const record = inMemoryUsage.get(key) || { images: 0, videos: 0 };
      record.images += 1;
      inMemoryUsage.set(key, record);
      return;
    }

    try {
      await prisma.usage.upsert({
        where: { userId_date: { userId, date: today } },
        update: {
          imageJobs: { increment: 1 },
          totalJobs: { increment: 1 },
        },
        create: {
          userId,
          date: today,
          imageJobs: 1,
          totalJobs: 1,
        },
      });
    } catch {
      const key = `${userId}_${today}`;
      const record = inMemoryUsage.get(key) || { images: 0, videos: 0 };
      record.images += 1;
      inMemoryUsage.set(key, record);
    }
  }

  static getMaxVideosForPlan(plan: UserPlan): number {
    switch (plan) {
      case 'BUSINESS':
        return 50;
      case 'PRO':
        return 15;
      case 'FREE':
      default:
        return config.FREE_DAILY_VIDEO_LIMIT;
    }
  }

  static async canProcessVideo(userId: string, plan: UserPlan): Promise<{ allowed: boolean; remaining: number; maxLimit: number }> {
    const today = this.getTodayDateString();
    const maxLimit = this.getMaxVideosForPlan(plan);

    if (!isDatabaseAvailable()) {
      const key = `${userId}_${today}`;
      const record = inMemoryUsage.get(key) || { images: 0, videos: 0 };
      const remaining = Math.max(0, maxLimit - record.videos);
      return {
        allowed: record.videos < maxLimit,
        remaining,
        maxLimit,
      };
    }

    try {
      const usage = await prisma.usage.findUnique({
        where: { userId_date: { userId, date: today } },
      });

      const currentUsed = usage?.videoJobs || 0;
      const remaining = Math.max(0, maxLimit - currentUsed);
      return {
        allowed: currentUsed < maxLimit,
        remaining,
        maxLimit,
      };
    } catch {
      const key = `${userId}_${today}`;
      const record = inMemoryUsage.get(key) || { images: 0, videos: 0 };
      const remaining = Math.max(0, maxLimit - record.videos);
      return {
        allowed: record.videos < maxLimit,
        remaining,
        maxLimit,
      };
    }
  }

  static async incrementVideoUsage(userId: string): Promise<void> {
    const today = this.getTodayDateString();
    if (!isDatabaseAvailable()) {
      const key = `${userId}_${today}`;
      const record = inMemoryUsage.get(key) || { images: 0, videos: 0 };
      record.videos += 1;
      inMemoryUsage.set(key, record);
      return;
    }

    try {
      await prisma.usage.upsert({
        where: { userId_date: { userId, date: today } },
        update: {
          videoJobs: { increment: 1 },
          totalJobs: { increment: 1 },
        },
        create: {
          userId,
          date: today,
          videoJobs: 1,
          totalJobs: 1,
        },
      });
    } catch {
      const key = `${userId}_${today}`;
      const record = inMemoryUsage.get(key) || { images: 0, videos: 0 };
      record.videos += 1;
      inMemoryUsage.set(key, record);
    }
  }

  static async recordJob(params: {
    userId: string;
    telegramId?: string | number | bigint;
    type: 'IMAGE' | 'VIDEO';
    scale: number;
    status: 'COMPLETED' | 'FAILED';
    inputResolution?: string;
    outputResolution?: string;
    inputSize?: number;
    outputSize?: number;
    processingTimeSeconds?: number;
    errorMessage?: string;
  }): Promise<string> {
    const tgId = params.telegramId ? params.telegramId.toString() : params.userId.replace(/^usr_|^mem-/, '');
    store.recordJob({
      telegramId: tgId,
      type: params.type,
      status: params.status,
      scale: params.scale,
      processingTime: params.processingTimeSeconds || 0,
      inputResolution: params.inputResolution,
      outputResolution: params.outputResolution,
    });

    if (!isDatabaseAvailable()) {
      return `job-local-${Date.now()}`;
    }

    try {
      const job = await prisma.mediaJob.create({
        data: {
          userId: params.userId,
          type: params.type,
          status: params.status,
          scale: params.scale,
          inputResolution: params.inputResolution,
          outputResolution: params.outputResolution,
          inputSize: params.inputSize ? BigInt(params.inputSize) : undefined,
          outputSize: params.outputSize ? BigInt(params.outputSize) : undefined,
          processingTime: params.processingTimeSeconds,
          errorMessage: params.errorMessage,
          completedAt: new Date(),
        },
      });
      return job.id;
    } catch (error) {
      logger.debug('Database offline, job logged locally:', {
        status: params.status,
        processingTime: params.processingTimeSeconds,
      });
      return `job-local-${Date.now()}`;
    }
  }

  static async getUserUsageSummary(userId: string, plan: UserPlan) {
    const today = this.getTodayDateString();
    const maxImages = this.getMaxImagesForPlan(plan);
    const maxVideos = this.getMaxVideosForPlan(plan);

    let imagesUsed = 0;
    let videosUsed = 0;

    if (!isDatabaseAvailable()) {
      const key = `${userId}_${today}`;
      const record = inMemoryUsage.get(key) || { images: 0, videos: 0 };
      imagesUsed = record.images;
      videosUsed = record.videos;

      return {
        plan,
        imagesUsed,
        imagesMax: maxImages,
        imagesRemaining: Math.max(0, maxImages - imagesUsed),
        videosUsed,
        videosMax: maxVideos,
        videosRemaining: Math.max(0, maxVideos - videosUsed),
        date: today,
      };
    }

    try {
      const usage = await prisma.usage.findUnique({
        where: { userId_date: { userId, date: today } },
      });
      if (usage) {
        imagesUsed = usage.imageJobs;
        videosUsed = usage.videoJobs;
      }
    } catch {
      const key = `${userId}_${today}`;
      const record = inMemoryUsage.get(key) || { images: 0, videos: 0 };
      imagesUsed = record.images;
      videosUsed = record.videos;
    }

    return {
      plan,
      imagesUsed,
      imagesMax: maxImages,
      imagesRemaining: Math.max(0, maxImages - imagesUsed),
      videosUsed,
      videosMax: maxVideos,
      videosRemaining: Math.max(0, maxVideos - videosUsed),
      date: today,
    };
  }

}

export default UsageService;

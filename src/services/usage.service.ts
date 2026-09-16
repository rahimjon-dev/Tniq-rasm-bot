import prisma, { isDatabaseAvailable } from '../database/prisma.js';
import logger from '../utils/logger.js';
import { UserPlan } from '../types/user.types.js';
import store from './store.service.js';
import PlanService from './plan.service.js';

// In-flight active reservations to prevent concurrent race condition limit bypasses
const inFlightReservations = new Map<string, { images: number; videos: number }>();

export class UsageService {
  /**
   * Current date string in Asia/Tashkent timezone (YYYY-MM-DD)
   */
  public static getTodayDateString(): string {
    return store.getTodayTashkent();
  }

  /**
   * Get quota summary for a user
   */
  static async getUserUsageSummary(userId: string, telegramId: string | number | bigint, plan: UserPlan) {
    const limits = PlanService.getLimits(plan);
    const storedUser = store.getUser(telegramId);
    const today = this.getTodayDateString();

    let imagesUsed = storedUser?.dailyUsage?.date === today ? (storedUser.dailyUsage.images || 0) : 0;
    let videosUsed = storedUser?.dailyUsage?.date === today ? (storedUser.dailyUsage.videos || 0) : 0;

    if (isDatabaseAvailable()) {
      try {
        const usage = await prisma.usage.findUnique({
          where: { userId_date: { userId, date: today } },
        });
        if (usage) {
          imagesUsed = Math.max(imagesUsed, usage.imageJobs);
          videosUsed = Math.max(videosUsed, usage.videoJobs);
        }
      } catch {}
    }

    const imagesRemaining = limits.isUnlimitedImages
      ? Infinity
      : Math.max(0, limits.dailyImages - imagesUsed);

    const videosRemaining = limits.isUnlimitedVideos
      ? Infinity
      : Math.max(0, limits.dailyVideos - videosUsed);

    return {
      date: today,
      plan: PlanService.normalizePlan(plan),
      imagesUsed,
      imagesMax: limits.dailyImages,
      imagesRemaining,
      isUnlimitedImages: limits.isUnlimitedImages,
      videosUsed,
      videosMax: limits.dailyVideos,
      videosRemaining,
      isUnlimitedVideos: limits.isUnlimitedVideos,
      canUse4K: limits.canUse4K,
      maxImageSizeMB: limits.maxImageSizeMB,
      maxVideoSizeMB: limits.maxVideoSizeMB,
      hasCustomBackground: limits.hasCustomBackground,
    };
  }

  /**
   * Check if user can process an image (server-side check)
   */
  static async canProcessImage(
    userId: string,
    telegramId: string | number | bigint,
    plan: UserPlan
  ): Promise<{ allowed: boolean; remaining: number | string; maxLimit: number | string }> {
    const limits = PlanService.getLimits(plan);
    if (limits.isUnlimitedImages) {
      return { allowed: true, remaining: 'Unlimited', maxLimit: 'Unlimited' };
    }

    const summary = await this.getUserUsageSummary(userId, telegramId, plan);
    const key = telegramId.toString();
    const inFlight = inFlightReservations.get(key)?.images || 0;
    const effectiveUsed = summary.imagesUsed + inFlight;

    const remaining = Math.max(0, limits.dailyImages - effectiveUsed);
    const allowed = effectiveUsed < limits.dailyImages;

    return {
      allowed,
      remaining,
      maxLimit: limits.dailyImages,
    };
  }

  /**
   * Check if user can process a video (server-side check)
   */
  static async canProcessVideo(
    userId: string,
    telegramId: string | number | bigint,
    plan: UserPlan
  ): Promise<{ allowed: boolean; remaining: number | string; maxLimit: number | string }> {
    const limits = PlanService.getLimits(plan);
    if (limits.isUnlimitedVideos) {
      return { allowed: true, remaining: 'Unlimited', maxLimit: 'Unlimited' };
    }

    const summary = await this.getUserUsageSummary(userId, telegramId, plan);
    const key = telegramId.toString();
    const inFlight = inFlightReservations.get(key)?.videos || 0;
    const effectiveUsed = summary.videosUsed + inFlight;

    const remaining = Math.max(0, limits.dailyVideos - effectiveUsed);
    const allowed = effectiveUsed < limits.dailyVideos;

    return {
      allowed,
      remaining,
      maxLimit: limits.dailyVideos,
    };
  }

  /**
   * Atomic reservation of quota to prevent race-condition concurrency bypasses
   */
  static async reserveImageQuota(
    userId: string,
    telegramId: string | number | bigint,
    plan: UserPlan
  ): Promise<boolean> {
    const check = await this.canProcessImage(userId, telegramId, plan);
    if (!check.allowed) return false;

    const key = telegramId.toString();
    const cur = inFlightReservations.get(key) || { images: 0, videos: 0 };
    cur.images += 1;
    inFlightReservations.set(key, cur);
    return true;
  }

  static releaseImageReservation(telegramId: string | number | bigint): void {
    const key = telegramId.toString();
    const cur = inFlightReservations.get(key);
    if (cur && cur.images > 0) {
      cur.images -= 1;
      if (cur.images === 0 && cur.videos === 0) inFlightReservations.delete(key);
    }
  }

  static async reserveVideoQuota(
    userId: string,
    telegramId: string | number | bigint,
    plan: UserPlan
  ): Promise<boolean> {
    const check = await this.canProcessVideo(userId, telegramId, plan);
    if (!check.allowed) return false;

    const key = telegramId.toString();
    const cur = inFlightReservations.get(key) || { images: 0, videos: 0 };
    cur.videos += 1;
    inFlightReservations.set(key, cur);
    return true;
  }

  static releaseVideoReservation(telegramId: string | number | bigint): void {
    const key = telegramId.toString();
    const cur = inFlightReservations.get(key);
    if (cur && cur.videos > 0) {
      cur.videos -= 1;
      if (cur.images === 0 && cur.videos === 0) inFlightReservations.delete(key);
    }
  }

  /**
   * Permanently increments image usage in persistent storage & PostgreSQL
   */
  static async incrementImageUsage(userId: string, telegramId: string | number | bigint): Promise<void> {
    this.releaseImageReservation(telegramId);
    store.incrementUsage(telegramId, 'IMAGE');

    const today = this.getTodayDateString();
    if (isDatabaseAvailable()) {
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
      } catch (err) {
        logger.debug('Prisma incrementImageUsage notice:', err);
      }
    }
  }

  /**
   * Permanently increments video usage in persistent storage & PostgreSQL
   */
  static async incrementVideoUsage(userId: string, telegramId: string | number | bigint): Promise<void> {
    this.releaseVideoReservation(telegramId);
    store.incrementUsage(telegramId, 'VIDEO');

    const today = this.getTodayDateString();
    if (isDatabaseAvailable()) {
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
      } catch (err) {
        logger.debug('Prisma incrementVideoUsage notice:', err);
      }
    }
  }

  /**
   * Record completed media job into persistent store and database
   */
  static async recordJob(params: {
    userId: string;
    telegramId: string | number | bigint;
    type: 'IMAGE' | 'VIDEO';
    scale: number;
    status: 'COMPLETED' | 'FAILED';
    inputResolution?: string;
    outputResolution?: string;
    inputSize?: number;
    outputSize?: number;
    processingTimeSeconds?: number;
  }): Promise<void> {
    store.recordJob({
      telegramId: params.telegramId,
      type: params.type,
      status: params.status,
      scale: params.scale,
      processingTime: params.processingTimeSeconds || 0,
      inputResolution: params.inputResolution,
      outputResolution: params.outputResolution,
    });

    if (isDatabaseAvailable()) {
      try {
        await prisma.mediaJob.create({
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
            completedAt: new Date(),
          },
        });
      } catch (err) {
        logger.debug('Prisma recordJob notice:', err);
      }
    }
  }

  /**
   * Reset user's daily usage (for Admin)
   */
  static async resetUserUsage(userId: string, telegramId: string | number | bigint): Promise<boolean> {
    store.resetUserDailyUsage(telegramId);
    inFlightReservations.delete(telegramId.toString());

    const today = this.getTodayDateString();
    if (isDatabaseAvailable()) {
      try {
        await prisma.usage.updateMany({
          where: { userId, date: today },
          data: { imageJobs: 0, videoJobs: 0, totalJobs: 0 },
        });
      } catch {}
    }
    return true;
  }
}

export default UsageService;

import prisma, { isDatabaseAvailable } from '../database/prisma.js';
import logger from '../utils/logger.js';
import { UserPlan } from '../types/user.types.js';
import store from './store.service.js';
import PlanService from './plan.service.js';

export class UserService {
  static async getUserLanguage(telegramId: number | bigint): Promise<string | null> {
    const stored = store.getUser(telegramId);
    if (stored && stored.languageCode) {
      return stored.languageCode;
    }

    if (!isDatabaseAvailable()) {
      return null;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
        select: { languageCode: true },
      });
      if (user?.languageCode) {
        store.saveUser({ telegramId, languageCode: user.languageCode });
        return user.languageCode;
      }
      return null;
    } catch {
      return null;
    }
  }

  static async setUserLanguage(telegramId: number | bigint, languageCode: string): Promise<void> {
    store.setUserLanguage(telegramId, languageCode);

    if (isDatabaseAvailable()) {
      try {
        await prisma.user.update({
          where: { telegramId: BigInt(telegramId) },
          data: { languageCode },
        });
      } catch {}
    }
  }

  static async findOrCreateUser(params: {
    telegramId: number | bigint;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    languageCode?: string | null;
    lastAction?: string | null;
    isExplicitLanguageChange?: boolean;
  }) {
    const telegramIdBigInt = BigInt(params.telegramId);

    // 1. Save to persistent store immediately with language protection
    const storedUser = store.saveUser({
      telegramId: params.telegramId,
      username: params.username,
      firstName: params.firstName,
      lastName: params.lastName,
      languageCode: params.languageCode,
      lastAction: params.lastAction || 'User /start',
      isExplicitLanguageChange: params.isExplicitLanguageChange,
    });

    if (!isDatabaseAvailable()) {
      return {
        id: storedUser.id,
        telegramId: telegramIdBigInt,
        username: storedUser.username,
        firstName: storedUser.firstName,
        lastName: storedUser.lastName,
        languageCode: storedUser.languageCode,
        isBanned: storedUser.isBanned,
        createdAt: new Date(storedUser.createdAt),
        updatedAt: new Date(storedUser.updatedAt),
        plan: storedUser.plan,
        subscription: {
          id: `sub_${storedUser.telegramId}`,
          userId: storedUser.id,
          plan: storedUser.plan,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    }

    try {
      const user = await prisma.user.upsert({
        where: { telegramId: telegramIdBigInt },
        update: {
          username: params.username || undefined,
          firstName: params.firstName || undefined,
          languageCode: params.isExplicitLanguageChange ? (params.languageCode || undefined) : undefined,
        },
        create: {
          telegramId: telegramIdBigInt,
          username: params.username || undefined,
          firstName: params.firstName || undefined,
          languageCode: params.languageCode || 'uz',
          subscription: {
            create: {
              plan: storedUser.plan === 'PREMIUM' ? 'PRO' : (storedUser.plan as any),
              status: 'ACTIVE',
            },
          },
        },
        include: {
          subscription: true,
        },
      });

      return {
        ...user,
        plan: storedUser.plan,
      };
    } catch (error) {
      logger.debug('Database error in findOrCreateUser, using persistent store:', error);
      return {
        id: storedUser.id,
        telegramId: telegramIdBigInt,
        username: storedUser.username,
        firstName: storedUser.firstName,
        lastName: storedUser.lastName,
        languageCode: storedUser.languageCode,
        isBanned: storedUser.isBanned,
        createdAt: new Date(storedUser.createdAt),
        updatedAt: new Date(storedUser.updatedAt),
        plan: storedUser.plan,
        subscription: {
          id: `sub_${storedUser.telegramId}`,
          userId: storedUser.id,
          plan: storedUser.plan,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    }
  }

  static async setUserPlan(telegramId: number | bigint | string, plan: UserPlan): Promise<boolean> {
    const normalized = PlanService.normalizePlan(plan);
    const ok = store.setUserPlan(telegramId, normalized);

    if (isDatabaseAvailable()) {
      try {
        const idBig = BigInt(telegramId);
        const user = await prisma.user.findUnique({ where: { telegramId: idBig } });
        if (user) {
          await prisma.subscription.upsert({
            where: { userId: user.id },
            update: { plan: normalized === 'PREMIUM' ? 'PRO' : (normalized as any) },
            create: {
              userId: user.id,
              plan: normalized === 'PREMIUM' ? 'PRO' : (normalized as any),
              status: 'ACTIVE',
            },
          });
        }
      } catch (err) {
        logger.debug('Prisma setUserPlan notice:', err);
      }
    }
    return ok;
  }

  static async upgradeUserSubscription(telegramId: number | bigint | string, plan: UserPlan, durationDays = 30): Promise<boolean> {
    return this.setUserPlan(telegramId, plan);
  }

  static async getUserTotalJobsCount(userId: string): Promise<number> {
    if (!isDatabaseAvailable()) {
      return 0;
    }
    try {
      return await prisma.mediaJob.count({
        where: { userId, status: 'COMPLETED' },
      });
    } catch {
      return 0;
    }
  }

  static async getUserHistory(userId: string, limit = 5) {
    if (!isDatabaseAvailable()) {
      return store.getRecentJobs(limit);
    }
    try {
      return await prisma.mediaJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch {
      return store.getRecentJobs(limit);
    }
  }

  static updateActivity(telegramId: number | bigint | string, action: string): void {
    store.updateUserActivity(telegramId, action);
  }

  static setUserCustomBackground(telegramId: number | bigint | string, backgroundPath: string | null): boolean {
    return store.setUserCustomBackground(telegramId, backgroundPath);
  }

  static getUserCustomBackground(telegramId: number | bigint | string): string | null {
    return store.getUserCustomBackground(telegramId);
  }
}

export default UserService;

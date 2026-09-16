import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { UserPlan } from '../types/user.types.js';
import PlanService from './plan.service.js';

export interface UserDailyUsage {
  date: string; // YYYY-MM-DD in Asia/Tashkent
  images: number;
  videos: number;
}

export interface StoredUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  plan: UserPlan;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
  lastActivityDate: string;
  lastAction: string | null;
  dailyUsage: UserDailyUsage;
  totalImages: number;
  totalVideos: number;
  totalJobs: number;
  customBackground: string | null;
  metadata?: Record<string, any>;
}

export interface StoredJob {
  id: string;
  telegramId: string;
  type: 'IMAGE' | 'VIDEO';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  scale: number;
  targetResolution?: string;
  inputResolution?: string;
  outputResolution?: string;
  processingTime?: number;
  createdAt: string;
}

interface DBStructure {
  users: Record<string, StoredUser>;
  jobs: StoredJob[];
  stats: {
    totalImages: number;
    totalVideos: number;
    failedJobs: number;
  };
}

class StoreService {
  private dbPath: string;
  private backupPath: string;
  private data: DBStructure;
  private saveTimeout: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor() {
    const storageDir = path.resolve(process.cwd(), 'storage');
    if (!fs.existsSync(storageDir)) {
      try {
        fs.mkdirSync(storageDir, { recursive: true });
      } catch {}
    }
    this.dbPath = path.join(storageDir, 'db.json');
    this.backupPath = path.join(storageDir, 'db.backup.json');
    this.data = this.loadData();

    // Auto-seed admin user so dashboard is never empty
    for (const adminId of config.ADMIN_TELEGRAM_IDS) {
      const idStr = adminId.toString();
      const today = this.getTodayTashkent();
      const now = new Date().toISOString();
      if (!this.data.users[idStr]) {
        this.data.users[idStr] = {
          id: `usr_${idStr}`,
          telegramId: idStr,
          username: 'admin',
          firstName: 'Administrator',
          lastName: '(Siz)',
          languageCode: 'uz',
          plan: 'PRO',
          isBanned: false,
          createdAt: now,
          updatedAt: now,
          lastActivityDate: now,
          lastAction: 'Admin Login',
          dailyUsage: { date: today, images: 0, videos: 0 },
          totalImages: 0,
          totalVideos: 0,
          totalJobs: 0,
          customBackground: null,
        };
      }
    }
    this.flushSync();

    // Register exit handlers to guarantee zero data loss on server restarts/deploys
    const handleExit = () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      this.flushSync();
    };

    process.once('beforeExit', handleExit);
    process.once('SIGINT', handleExit);
    process.once('SIGTERM', handleExit);
  }

  /**
   * Current date formatted in Asia/Tashkent timezone (YYYY-MM-DD)
   */
  public getTodayTashkent(): string {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  private loadData(): DBStructure {
    const candidatePaths = [
      this.dbPath,
      this.backupPath,
      path.resolve(process.cwd(), 'db.json'),
    ];

    const mergedUsers: Record<string, StoredUser> = {};
    const mergedJobs: StoredJob[] = [];
    let maxImages = 0;
    let maxVideos = 0;
    let maxFailed = 0;
    const today = this.getTodayTashkent();

    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.users === 'object') {
            for (const [k, u] of Object.entries(parsed.users as Record<string, any>)) {
              if (!mergedUsers[k] || new Date(u.updatedAt || u.createdAt).getTime() >= new Date(mergedUsers[k].updatedAt || mergedUsers[k].createdAt).getTime()) {
                const now = new Date().toISOString();
                mergedUsers[k] = {
                  id: u.id || `usr_${k}`,
                  telegramId: k,
                  username: u.username || null,
                  firstName: u.firstName || null,
                  lastName: u.lastName || null,
                  languageCode: u.languageCode || 'uz',
                  plan: PlanService.normalizePlan(u.plan),
                  isBanned: !!u.isBanned,
                  createdAt: u.createdAt || now,
                  updatedAt: u.updatedAt || now,
                  lastActivityDate: u.lastActivityDate || u.updatedAt || now,
                  lastAction: u.lastAction || 'Active',
                  dailyUsage: u.dailyUsage && u.dailyUsage.date === today
                    ? u.dailyUsage
                    : { date: today, images: 0, videos: 0 },
                  totalImages: u.totalImages || 0,
                  totalVideos: u.totalVideos || 0,
                  totalJobs: u.totalJobs || 0,
                  customBackground: u.customBackground || null,
                  metadata: u.metadata || {},
                };
              }
            }
          }
          if (Array.isArray(parsed.jobs)) {
            for (const j of parsed.jobs) {
              if (!mergedJobs.some((existing) => existing.id === j.id)) {
                mergedJobs.push(j);
              }
            }
          }
          if (parsed.stats) {
            maxImages = Math.max(maxImages, parsed.stats.totalImages || 0);
            maxVideos = Math.max(maxVideos, parsed.stats.totalVideos || 0);
            maxFailed = Math.max(maxFailed, parsed.stats.failedJobs || 0);
          }
        }
      } catch (err) {
        logger.debug(`[STORE] Path ${p} read notice:`, err);
      }
    }

    const userCount = Object.keys(mergedUsers).length;
    logger.info(`[STORE] Multi-source persistent database loaded. Total users: ${userCount}`);

    return {
      users: mergedUsers,
      jobs: mergedJobs.slice(0, 200),
      stats: {
        totalImages: maxImages,
        totalVideos: maxVideos,
        failedJobs: maxFailed,
      },
    };
  }

  /**
   * Synchronously and atomically flushes state across all storage locations:
   * 1. storage/db.json
   * 2. storage/db.backup.json
   * 3. db.json (root fallback)
   */
  public flushSync(): void {
    try {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }

      const serialized = JSON.stringify(this.data, null, 2);
      const targetPaths = [
        this.dbPath,
        this.backupPath,
        path.resolve(process.cwd(), 'db.json'),
      ];

      for (const target of targetPaths) {
        try {
          const targetDir = path.dirname(target);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          const tmp = `${target}.tmp`;
          fs.writeFileSync(tmp, serialized, 'utf-8');
          try {
            fs.renameSync(tmp, target);
          } catch {
            fs.writeFileSync(target, serialized, 'utf-8');
            try { fs.unlinkSync(tmp); } catch {}
          }
        } catch (targetErr) {
          logger.debug(`[STORE] Error writing target ${target}:`, targetErr);
        }
      }
    } catch (err) {
      logger.error('[STORE] Critical failure writing db.json / db.backup.json:', err);
    }
  }

  private saveToDisk(immediate = false): void {
    if (immediate) {
      this.flushSync();
      return;
    }

    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.flushSync();
    }, 50);
  }

  // --- Ban & Permissions ---
  isUserBanned(telegramId: number | bigint | string): boolean {
    const key = telegramId.toString();
    const user = this.data.users[key];
    return !!user?.isBanned;
  }

  setUserBan(telegramId: number | bigint | string, isBanned: boolean): boolean {
    const key = telegramId.toString();
    const existing = this.data.users[key];
    const now = new Date().toISOString();
    const today = this.getTodayTashkent();

    if (!existing) {
      this.data.users[key] = {
        id: `usr_${key}`,
        telegramId: key,
        username: null,
        firstName: `Foydalanuvchi ${key}`,
        lastName: null,
        languageCode: 'uz',
        plan: 'FREE',
        isBanned,
        createdAt: now,
        updatedAt: now,
        lastActivityDate: now,
        lastAction: isBanned ? 'Banned by Admin' : 'Unbanned by Admin',
        dailyUsage: { date: today, images: 0, videos: 0 },
        totalImages: 0,
        totalVideos: 0,
        totalJobs: 0,
        customBackground: null,
      };
    } else {
      existing.isBanned = isBanned;
      existing.updatedAt = now;
      existing.lastAction = isBanned ? 'Banned by Admin' : 'Active';
    }

    this.saveToDisk(true);
    logger.info(`[STORE] User ${key} ban status set to: ${isBanned}`);
    return true;
  }

  // --- Users ---
  saveUser(params: {
    telegramId: number | bigint | string;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    languageCode?: string | null;
    plan?: UserPlan;
    lastAction?: string | null;
  }): StoredUser {
    const key = params.telegramId.toString();
    const existing = this.data.users[key];
    const now = new Date().toISOString();
    const today = this.getTodayTashkent();

    const plan = params.plan
      ? PlanService.normalizePlan(params.plan)
      : (existing ? existing.plan : 'FREE');

    const updated: StoredUser = {
      id: existing ? existing.id : `usr_${key}`,
      telegramId: key,
      username: params.username !== undefined ? params.username : (existing?.username || null),
      firstName: params.firstName !== undefined ? params.firstName : (existing?.firstName || null),
      lastName: params.lastName !== undefined ? params.lastName : (existing?.lastName || null),
      languageCode: params.languageCode !== undefined ? params.languageCode : (existing?.languageCode || 'uz'),
      plan,
      isBanned: existing ? !!existing.isBanned : false,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      lastActivityDate: now,
      lastAction: params.lastAction || (existing?.lastAction || 'Active'),
      dailyUsage: existing && existing.dailyUsage && existing.dailyUsage.date === today
        ? existing.dailyUsage
        : { date: today, images: 0, videos: 0 },
      totalImages: existing ? existing.totalImages || 0 : 0,
      totalVideos: existing ? existing.totalVideos || 0 : 0,
      totalJobs: existing ? existing.totalJobs || 0 : 0,
      customBackground: existing ? existing.customBackground || null : null,
      metadata: existing ? existing.metadata || {} : {},
    };

    this.data.users[key] = updated;
    this.saveToDisk(true);
    return updated;
  }

  updateUserActivity(telegramId: number | bigint | string, action: string): void {
    const key = telegramId.toString();
    const user = this.data.users[key];
    if (user) {
      const now = new Date().toISOString();
      user.lastActivityDate = now;
      user.lastAction = action;
      user.updatedAt = now;
      this.saveToDisk();
    }
  }

  getUser(telegramId: number | bigint | string): StoredUser | null {
    const key = telegramId.toString();
    const user = this.data.users[key];
    if (!user) return null;

    // Auto-refresh daily usage if day has transitioned in Asia/Tashkent
    const today = this.getTodayTashkent();
    if (!user.dailyUsage || user.dailyUsage.date !== today) {
      user.dailyUsage = { date: today, images: 0, videos: 0 };
    }
    return user;
  }

  getAllUsers(query = '', page = 1, limit = 20, planFilter = '') {
    let list = Object.values(this.data.users);
    const trimmed = query.trim().toLowerCase();
    const today = this.getTodayTashkent();

    // Auto-reset dailyUsage for any user if date changed
    for (const u of list) {
      if (!u.dailyUsage || u.dailyUsage.date !== today) {
        u.dailyUsage = { date: today, images: 0, videos: 0 };
      }
    }

    if (planFilter && planFilter !== 'ALL') {
      const filterUpper = planFilter.toUpperCase();
      list = list.filter((u) => u.plan === filterUpper);
    }

    if (trimmed) {
      list = list.filter((u) => {
        const idMatch = u.telegramId.includes(trimmed);
        const userMatch = u.username?.toLowerCase().includes(trimmed);
        const nameMatch = u.firstName?.toLowerCase().includes(trimmed) || u.lastName?.toLowerCase().includes(trimmed);
        const planMatch = u.plan?.toLowerCase().includes(trimmed);
        const isAdminMatch = (trimmed === 'admin' || trimmed === 'administrator') &&
          config.ADMIN_TELEGRAM_IDS.some(aid => aid.toString() === u.telegramId);
        return idMatch || userMatch || nameMatch || planMatch || isAdminMatch;
      });
    }

    // Sort newest activity first
    list.sort((a, b) => new Date(b.lastActivityDate || b.updatedAt || b.createdAt).getTime() - new Date(a.lastActivityDate || a.updatedAt || a.createdAt).getTime());

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      users: paginated.map((u) => {
        const limits = PlanService.getLimits(u.plan);
        return {
          ...u,
          subscription: { plan: u.plan, status: 'ACTIVE' },
          remainingImages: limits.isUnlimitedImages ? 'Unlimited' : Math.max(0, limits.dailyImages - (u.dailyUsage?.images || 0)),
          remainingVideos: limits.isUnlimitedVideos ? 'Unlimited' : Math.max(0, limits.dailyVideos - (u.dailyUsage?.videos || 0)),
        };
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  setUserPlan(telegramId: number | bigint | string, plan: UserPlan): boolean {
    const key = telegramId.toString();
    if (this.data.users[key]) {
      this.data.users[key].plan = PlanService.normalizePlan(plan);
      this.data.users[key].updatedAt = new Date().toISOString();
      this.data.users[key].lastAction = `Plan changed to ${plan}`;
      this.saveToDisk(true);
      return true;
    }
    return false;
  }

  resetUserDailyUsage(telegramId: number | bigint | string): boolean {
    const key = telegramId.toString();
    if (this.data.users[key]) {
      const today = this.getTodayTashkent();
      this.data.users[key].dailyUsage = { date: today, images: 0, videos: 0 };
      this.data.users[key].updatedAt = new Date().toISOString();
      this.data.users[key].lastAction = 'Daily limits reset by Admin';
      this.saveToDisk(true);
      return true;
    }
    return false;
  }

  setUserCustomBackground(telegramId: number | bigint | string, backgroundPath: string | null): boolean {
    const key = telegramId.toString();
    if (this.data.users[key]) {
      this.data.users[key].customBackground = backgroundPath;
      this.data.users[key].updatedAt = new Date().toISOString();
      this.data.users[key].lastAction = backgroundPath ? 'Custom background set' : 'Custom background removed';
      this.saveToDisk(true);
      return true;
    }
    return false;
  }

  getUserCustomBackground(telegramId: number | bigint | string): string | null {
    const key = telegramId.toString();
    return this.data.users[key]?.customBackground || null;
  }

  incrementUsage(telegramId: number | bigint | string, type: 'IMAGE' | 'VIDEO'): void {
    const key = telegramId.toString();
    const today = this.getTodayTashkent();
    const user = this.data.users[key];

    if (user) {
      if (!user.dailyUsage || user.dailyUsage.date !== today) {
        user.dailyUsage = { date: today, images: 0, videos: 0 };
      }
      if (type === 'IMAGE') {
        user.dailyUsage.images += 1;
        user.totalImages = (user.totalImages || 0) + 1;
      } else {
        user.dailyUsage.videos += 1;
        user.totalVideos = (user.totalVideos || 0) + 1;
      }
      user.totalJobs = (user.totalJobs || 0) + 1;
      user.lastActivityDate = new Date().toISOString();
      user.lastAction = `Upscaled ${type}`;
      user.updatedAt = new Date().toISOString();
    }

    if (type === 'IMAGE') this.data.stats.totalImages++;
    if (type === 'VIDEO') this.data.stats.totalVideos++;

    this.saveToDisk(true);
  }

  getAllActiveTelegramIds(): number[] {
    return Object.values(this.data.users)
      .filter((u) => !u.isBanned)
      .map((u) => Number(u.telegramId));
  }

  // Bidirectional sync with PostgreSQL database
  syncFromDatabase(dbUsers: any[]): void {
    let count = 0;
    const today = this.getTodayTashkent();
    const now = new Date().toISOString();

    for (const u of dbUsers) {
      const key = u.telegramId.toString();
      const existing = this.data.users[key];
      const plan = PlanService.normalizePlan((u.subscription?.plan as UserPlan) || existing?.plan || 'FREE');
      const isBanned = u.isBanned !== undefined ? u.isBanned : (existing?.isBanned || false);

      this.data.users[key] = {
        id: u.id || existing?.id || `usr_${key}`,
        telegramId: key,
        username: u.username || existing?.username || null,
        firstName: u.firstName || existing?.firstName || null,
        lastName: u.lastName || existing?.lastName || null,
        languageCode: u.languageCode || existing?.languageCode || 'uz',
        plan,
        isBanned,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : (existing?.createdAt || now),
        updatedAt: now,
        lastActivityDate: existing?.lastActivityDate || now,
        lastAction: existing?.lastAction || 'Active',
        dailyUsage: existing && existing.dailyUsage && existing.dailyUsage.date === today
          ? existing.dailyUsage
          : { date: today, images: 0, videos: 0 },
        totalImages: existing ? existing.totalImages || 0 : 0,
        totalVideos: existing ? existing.totalVideos || 0 : 0,
        totalJobs: existing?.totalJobs || u._count?.jobs || 0,
        customBackground: existing?.customBackground || null,
        metadata: existing?.metadata || {},
      };
      count++;
    }

    if (count > 0) {
      this.saveToDisk(true);
      logger.info(`[STORE] Synchronized ${count} users from database into persistent store.`);
    }
  }

  // --- Jobs ---
  recordJob(job: {
    telegramId: string | number | bigint;
    type: 'IMAGE' | 'VIDEO';
    status: 'COMPLETED' | 'FAILED';
    scale: number;
    processingTime: number;
    targetResolution?: string;
    inputResolution?: string;
    outputResolution?: string;
  }) {
    const key = job.telegramId.toString();

    if (job.status === 'FAILED') {
      this.data.stats.failedJobs++;
    }

    const newJob: StoredJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      telegramId: key,
      type: job.type,
      status: job.status,
      scale: job.scale,
      targetResolution: job.targetResolution,
      inputResolution: job.inputResolution,
      outputResolution: job.outputResolution,
      processingTime: job.processingTime,
      createdAt: new Date().toISOString(),
    };

    this.data.jobs.unshift(newJob);
    if (this.data.jobs.length > 200) {
      this.data.jobs = this.data.jobs.slice(0, 200);
    }

    this.saveToDisk(true);
  }

  getRecentJobs(limit = 25) {
    return this.data.jobs.slice(0, limit).map((j) => {
      const u = this.data.users[j.telegramId];
      return {
        ...j,
        user: u ? { telegramId: u.telegramId, firstName: u.firstName, username: u.username } : null,
      };
    });
  }

  /**
   * Detailed metrics for Admin Dashboard
   */
  getDetailedStats() {
    const users = Object.values(this.data.users);
    const today = this.getTodayTashkent();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    let activeUsers = 0;
    let newUsersToday = 0;
    let freeUsers = 0;
    let premiumUsers = 0;
    let proUsers = 0;
    let imagesToday = 0;
    let videosToday = 0;

    for (const u of users) {
      // Active in last 24h
      const lastActive = new Date(u.lastActivityDate || u.updatedAt || u.createdAt).getTime();
      if (lastActive >= oneDayAgo) {
        activeUsers++;
      }

      // New users today
      const createdDate = u.createdAt ? u.createdAt.split('T')[0] : '';
      if (createdDate === today) {
        newUsersToday++;
      }

      // Plan counts
      if (u.plan === 'PRO' || (u.plan as any) === 'BUSINESS') {
        proUsers++;
      } else if (u.plan === 'PREMIUM') {
        premiumUsers++;
      } else {
        freeUsers++;
      }

      // Today usage
      if (u.dailyUsage && u.dailyUsage.date === today) {
        imagesToday += (u.dailyUsage.images || 0);
        videosToday += (u.dailyUsage.videos || 0);
      }
    }

    const totalUsers = users.length;
    // At least 1 active if total > 0
    if (activeUsers === 0 && totalUsers > 0) activeUsers = totalUsers;

    const totalJobs = this.data.stats.totalImages + this.data.stats.totalVideos;
    const successRatePercent = totalJobs > 0
      ? Math.round(((totalJobs - this.data.stats.failedJobs) / totalJobs) * 100)
      : 100;

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      imagesToday,
      videosToday,
      freeUsers,
      premiumUsers,
      proUsers,
      totalImages: this.data.stats.totalImages,
      totalVideos: this.data.stats.totalVideos,
      totalJobs,
      failedJobs: this.data.stats.failedJobs,
      successRatePercent,
    };
  }
}

export const store = new StoreService();
export default store;

import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { UserPlan } from '../types/user.types.js';

export interface StoredUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  languageCode: string | null;
  plan: UserPlan;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
  totalJobs: number;
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
  private data: DBStructure;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    const storageDir = path.resolve(process.cwd(), 'storage');
    if (!fs.existsSync(storageDir)) {
      try {
        fs.mkdirSync(storageDir, { recursive: true });
      } catch {}
    }
    this.dbPath = path.join(storageDir, 'db.json');
    this.data = this.loadData();
  }

  private loadData(): DBStructure {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      logger.warn('[STORE] Failed to load storage/db.json, initializing fresh store:', e);
    }

    return {
      users: {},
      jobs: [],
      stats: {
        totalImages: 0,
        totalVideos: 0,
        failedJobs: 0,
      },
    };
  }

  private saveToDisk() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (err) {
        logger.error('[STORE] Failed to write db.json:', err);
      }
    }, 100);
  }

  // --- Users ---
  saveUser(params: {
    telegramId: number | bigint;
    username?: string | null;
    firstName?: string | null;
    languageCode?: string | null;
    plan?: UserPlan;
  }): StoredUser {
    const key = params.telegramId.toString();
    const existing = this.data.users[key];

    const now = new Date().toISOString();
    const updated: StoredUser = {
      id: existing ? existing.id : `usr_${key}`,
      telegramId: key,
      username: params.username !== undefined ? params.username : (existing?.username || null),
      firstName: params.firstName !== undefined ? params.firstName : (existing?.firstName || null),
      languageCode: params.languageCode !== undefined ? params.languageCode : (existing?.languageCode || 'uz'),
      plan: params.plan || existing?.plan || 'FREE',
      isBanned: existing ? existing.isBanned : false,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      totalJobs: existing ? existing.totalJobs : 0,
    };

    this.data.users[key] = updated;
    this.saveToDisk();
    logger.info(`[STORE] User saved/updated: ID=${key}, Name=${updated.firstName}, Plan=${updated.plan}`);
    return updated;
  }

  getUser(telegramId: number | bigint): StoredUser | null {
    const key = telegramId.toString();
    return this.data.users[key] || null;
  }

  getAllUsers(query = '', page = 1, limit = 20) {
    let list = Object.values(this.data.users);
    const trimmed = query.trim().toLowerCase();

    if (trimmed) {
      list = list.filter((u) => {
        const idMatch = u.telegramId.includes(trimmed);
        const userMatch = u.username?.toLowerCase().includes(trimmed);
        const nameMatch = u.firstName?.toLowerCase().includes(trimmed);
        return idMatch || userMatch || nameMatch;
      });
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      users: paginated.map((u) => ({
        ...u,
        subscription: { plan: u.plan, status: 'ACTIVE' },
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  setUserBan(telegramId: number | bigint, isBanned: boolean): boolean {
    const key = telegramId.toString();
    if (this.data.users[key]) {
      this.data.users[key].isBanned = isBanned;
      this.data.users[key].updatedAt = new Date().toISOString();
      this.saveToDisk();
      return true;
    }
    return false;
  }

  setUserPlan(telegramId: number | bigint, plan: UserPlan): boolean {
    const key = telegramId.toString();
    if (this.data.users[key]) {
      this.data.users[key].plan = plan;
      this.data.users[key].updatedAt = new Date().toISOString();
      this.saveToDisk();
      return true;
    }
    return false;
  }

  getAllActiveTelegramIds(): number[] {
    return Object.values(this.data.users)
      .filter((u) => !u.isBanned)
      .map((u) => Number(u.telegramId));
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
    if (this.data.users[key]) {
      this.data.users[key].totalJobs = (this.data.users[key].totalJobs || 0) + 1;
    }

    if (job.type === 'IMAGE') this.data.stats.totalImages++;
    if (job.type === 'VIDEO') this.data.stats.totalVideos++;
    if (job.status === 'FAILED') this.data.stats.failedJobs++;

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
    // Keep last 100 jobs
    if (this.data.jobs.length > 100) {
      this.data.jobs = this.data.jobs.slice(0, 100);
    }

    this.saveToDisk();
  }

  getRecentJobs(limit = 20) {
    return this.data.jobs.slice(0, limit).map((j) => {
      const u = this.data.users[j.telegramId];
      return {
        ...j,
        user: u ? { telegramId: u.telegramId, firstName: u.firstName, username: u.username } : null,
      };
    });
  }

  getStats() {
    const totalUsers = Object.keys(this.data.users).length;
    const totalJobs = this.data.stats.totalImages + this.data.stats.totalVideos;
    const successRatePercent = totalJobs > 0
      ? Math.round(((totalJobs - this.data.stats.failedJobs) / totalJobs) * 100)
      : 100;

    return {
      totalUsers,
      totalJobs,
      imageJobs: this.data.stats.totalImages,
      videoJobs: this.data.stats.totalVideos,
      failedJobs: this.data.stats.failedJobs,
      successRatePercent,
    };
  }
}

export const store = new StoreService();
export default store;

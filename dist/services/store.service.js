import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import logger from '../utils/logger.js';
class StoreService {
    dbPath;
    backupPath;
    data;
    saveTimeout = null;
    isShuttingDown = false;
    constructor() {
        const storageDir = path.resolve(process.cwd(), 'storage');
        if (!fs.existsSync(storageDir)) {
            try {
                fs.mkdirSync(storageDir, { recursive: true });
            }
            catch { }
        }
        this.dbPath = path.join(storageDir, 'db.json');
        this.backupPath = path.join(storageDir, 'db.backup.json');
        this.data = this.loadData();
        // Auto-seed admin user so dashboard is never empty
        for (const adminId of config.ADMIN_TELEGRAM_IDS) {
            const idStr = adminId.toString();
            if (!this.data.users[idStr]) {
                this.data.users[idStr] = {
                    id: `usr_${idStr}`,
                    telegramId: idStr,
                    username: 'admin',
                    firstName: 'Administrator (Siz)',
                    languageCode: 'uz',
                    plan: 'BUSINESS',
                    isBanned: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    totalJobs: 0,
                };
            }
        }
        this.flushSync();
        // Register exit handlers to guarantee zero data loss on server restarts/deploys
        const handleExit = () => {
            if (this.isShuttingDown)
                return;
            this.isShuttingDown = true;
            this.flushSync();
        };
        process.once('beforeExit', handleExit);
        process.once('SIGINT', handleExit);
        process.once('SIGTERM', handleExit);
    }
    loadData() {
        // 1. Try loading primary db.json
        try {
            if (fs.existsSync(this.dbPath)) {
                const raw = fs.readFileSync(this.dbPath, 'utf-8');
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed.users === 'object') {
                    return {
                        users: parsed.users || {},
                        jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
                        stats: parsed.stats || { totalImages: 0, totalVideos: 0, failedJobs: 0 },
                    };
                }
            }
        }
        catch (e) {
            logger.warn('[STORE] Primary db.json read error, attempting backup load:', e);
        }
        // 2. Try loading backup db.backup.json
        try {
            if (fs.existsSync(this.backupPath)) {
                const raw = fs.readFileSync(this.backupPath, 'utf-8');
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed.users === 'object') {
                    logger.info('[STORE] Successfully recovered database state from db.backup.json');
                    return {
                        users: parsed.users || {},
                        jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
                        stats: parsed.stats || { totalImages: 0, totalVideos: 0, failedJobs: 0 },
                    };
                }
            }
        }
        catch (e) {
            logger.warn('[STORE] Backup db.backup.json read error:', e);
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
    /**
     * Synchronously and atomically flushes all current in-memory state to disk
     * Writes to a temporary file first, then atomically renames to prevent corruption.
     */
    flushSync() {
        try {
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = null;
            }
            const serialized = JSON.stringify(this.data, null, 2);
            // 1. Write primary db.json atomically
            const tmpPrimary = `${this.dbPath}.tmp`;
            fs.writeFileSync(tmpPrimary, serialized, 'utf-8');
            try {
                fs.renameSync(tmpPrimary, this.dbPath);
            }
            catch {
                fs.writeFileSync(this.dbPath, serialized, 'utf-8');
                try {
                    fs.unlinkSync(tmpPrimary);
                }
                catch { }
            }
            // 2. Write backup db.backup.json atomically
            const tmpBackup = `${this.backupPath}.tmp`;
            fs.writeFileSync(tmpBackup, serialized, 'utf-8');
            try {
                fs.renameSync(tmpBackup, this.backupPath);
            }
            catch {
                fs.writeFileSync(this.backupPath, serialized, 'utf-8');
                try {
                    fs.unlinkSync(tmpBackup);
                }
                catch { }
            }
        }
        catch (err) {
            logger.error('[STORE] Critical failure writing db.json / db.backup.json:', err);
        }
    }
    saveToDisk(immediate = false) {
        if (immediate) {
            this.flushSync();
            return;
        }
        if (this.saveTimeout)
            clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.flushSync();
        }, 50);
    }
    // --- Ban & Permissions ---
    isUserBanned(telegramId) {
        const key = telegramId.toString();
        const user = this.data.users[key];
        return !!user?.isBanned;
    }
    setUserBan(telegramId, isBanned) {
        const key = telegramId.toString();
        const existing = this.data.users[key];
        const now = new Date().toISOString();
        if (!existing) {
            this.data.users[key] = {
                id: `usr_${key}`,
                telegramId: key,
                username: null,
                firstName: `Foydalanuvchi ${key}`,
                languageCode: 'uz',
                plan: 'FREE',
                isBanned,
                createdAt: now,
                updatedAt: now,
                totalJobs: 0,
            };
        }
        else {
            existing.isBanned = isBanned;
            existing.updatedAt = now;
        }
        this.saveToDisk(true);
        logger.info(`[STORE] User ${key} ban status set to: ${isBanned}`);
        return true;
    }
    // --- Users ---
    saveUser(params) {
        const key = params.telegramId.toString();
        const existing = this.data.users[key];
        const now = new Date().toISOString();
        const updated = {
            id: existing ? existing.id : `usr_${key}`,
            telegramId: key,
            username: params.username !== undefined ? params.username : (existing?.username || null),
            firstName: params.firstName !== undefined ? params.firstName : (existing?.firstName || null),
            languageCode: params.languageCode !== undefined ? params.languageCode : (existing?.languageCode || 'uz'),
            plan: params.plan || existing?.plan || 'FREE',
            // Strictly maintain ban state across any update
            isBanned: existing ? !!existing.isBanned : false,
            createdAt: existing ? existing.createdAt : now,
            updatedAt: now,
            totalJobs: existing ? existing.totalJobs : 0,
        };
        this.data.users[key] = updated;
        this.saveToDisk(true);
        return updated;
    }
    getUser(telegramId) {
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
                const planMatch = u.plan?.toLowerCase().includes(trimmed);
                const isAdminMatch = (trimmed === 'admin' || trimmed === 'administrator') &&
                    config.ADMIN_TELEGRAM_IDS.some(aid => aid.toString() === u.telegramId);
                return idMatch || userMatch || nameMatch || planMatch || isAdminMatch;
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
    setUserPlan(telegramId, plan) {
        const key = telegramId.toString();
        if (this.data.users[key]) {
            this.data.users[key].plan = plan;
            this.data.users[key].updatedAt = new Date().toISOString();
            this.saveToDisk(true);
            return true;
        }
        return false;
    }
    getAllActiveTelegramIds() {
        return Object.values(this.data.users)
            .filter((u) => !u.isBanned)
            .map((u) => Number(u.telegramId));
    }
    // Bidirectional sync with PostgreSQL database
    syncFromDatabase(dbUsers) {
        let count = 0;
        for (const u of dbUsers) {
            const key = u.telegramId.toString();
            const existing = this.data.users[key];
            const plan = u.subscription?.plan || existing?.plan || 'FREE';
            const isBanned = u.isBanned !== undefined ? u.isBanned : (existing?.isBanned || false);
            this.data.users[key] = {
                id: u.id || existing?.id || `usr_${key}`,
                telegramId: key,
                username: u.username || existing?.username || null,
                firstName: u.firstName || existing?.firstName || null,
                languageCode: u.languageCode || existing?.languageCode || 'uz',
                plan,
                isBanned,
                createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : (existing?.createdAt || new Date().toISOString()),
                updatedAt: new Date().toISOString(),
                totalJobs: existing?.totalJobs || u._count?.jobs || 0,
            };
            count++;
        }
        if (count > 0) {
            this.saveToDisk(true);
            logger.info(`[STORE] Synchronized ${count} users from database into persistent store.`);
        }
    }
    // --- Jobs ---
    recordJob(job) {
        const key = job.telegramId.toString();
        if (this.data.users[key]) {
            this.data.users[key].totalJobs = (this.data.users[key].totalJobs || 0) + 1;
            this.data.users[key].updatedAt = new Date().toISOString();
        }
        if (job.type === 'IMAGE')
            this.data.stats.totalImages++;
        if (job.type === 'VIDEO')
            this.data.stats.totalVideos++;
        if (job.status === 'FAILED')
            this.data.stats.failedJobs++;
        const newJob = {
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
        // Keep last 150 jobs
        if (this.data.jobs.length > 150) {
            this.data.jobs = this.data.jobs.slice(0, 150);
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
//# sourceMappingURL=store.service.js.map
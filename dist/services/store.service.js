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
        const candidatePaths = [
            this.dbPath,
            this.backupPath,
            path.resolve(process.cwd(), 'db.json'),
        ];
        const mergedUsers = {};
        const mergedJobs = [];
        let maxImages = 0;
        let maxVideos = 0;
        let maxFailed = 0;
        for (const p of candidatePaths) {
            try {
                if (fs.existsSync(p)) {
                    const raw = fs.readFileSync(p, 'utf-8');
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed.users === 'object') {
                        for (const [k, u] of Object.entries(parsed.users)) {
                            if (!mergedUsers[k] || new Date(u.updatedAt || u.createdAt).getTime() >= new Date(mergedUsers[k].updatedAt || mergedUsers[k].createdAt).getTime()) {
                                mergedUsers[k] = u;
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
            }
            catch (err) {
                logger.debug(`[STORE] Path ${p} read notice:`, err);
            }
        }
        const userCount = Object.keys(mergedUsers).length;
        logger.info(`[STORE] Multi-source database loaded. Total persistent users: ${userCount}`);
        return {
            users: mergedUsers,
            jobs: mergedJobs.slice(0, 150),
            stats: {
                totalImages: maxImages,
                totalVideos: maxVideos,
                failedJobs: maxFailed,
            },
        };
    }
    /**
     * Synchronously and atomically flushes all current in-memory state to disk
     * Writes to temporary files first, then atomically renames to prevent corruption.
     */
    flushSync() {
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
                    }
                    catch {
                        fs.writeFileSync(target, serialized, 'utf-8');
                        try {
                            fs.unlinkSync(tmp);
                        }
                        catch { }
                    }
                }
                catch (targetErr) {
                    logger.debug(`[STORE] Error writing target ${target}:`, targetErr);
                }
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
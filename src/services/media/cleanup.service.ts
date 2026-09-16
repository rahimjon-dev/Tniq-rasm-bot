import fs from 'fs';
import path from 'path';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

export class CleanupService {
  private static cleanupIntervalId?: NodeJS.Timeout;

  /**
   * Scan storage directories and delete files older than maxAgeMinutes
   */
  static async cleanOldFiles(maxAgeMinutes = 60): Promise<{ deletedCount: number; freedBytes: number }> {
    const cutoff = Date.now() - maxAgeMinutes * 60 * 1000;
    // Critical Retention: NEVER delete outputStorage! Keep completed user media permanent!
    // Only sweep temporary workdirs and scratch files in tempStorage.
    const targets = [config.paths.tempStorage];

    let deletedCount = 0;
    let freedBytes = 0;

    for (const dir of targets) {
      if (!fs.existsSync(dir)) continue;

      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          try {
            const stats = await fs.promises.stat(fullPath);

            // Delete directories (e.g. video working frames directories)
            if (entry.isDirectory()) {
              if (stats.mtimeMs < cutoff) {
                await fs.promises.rm(fullPath, { recursive: true, force: true });
                deletedCount++;
                logger.debug(`[CLEANUP] Reclaimed orphaned workdir: ${entry.name}`);
              }
            } else if (entry.isFile()) {
              // Delete individual files older than cutoff
              if (stats.mtimeMs < cutoff) {
                freedBytes += stats.size;
                await fs.promises.unlink(fullPath);
                deletedCount++;
              }
            }
          } catch (err) {
            // File might have already been deleted by worker, ignore
          }
        }
      } catch (err) {
        logger.warn(`[CLEANUP] Failed to scan directory: ${dir}`, err);
      }
    }

    if (deletedCount > 0) {
      const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);
      logger.info(`[CLEANUP] Swept storage: removed ${deletedCount} orphaned files/folders, freed ${freedMB} MB`);
    }

    return { deletedCount, freedBytes };
  }

  /**
   * Start recurring background cleanup timer (every 30 minutes)
   */
  static startScheduler(intervalMinutes = 30): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }

    logger.info(`[CLEANUP] Automated storage cleanup scheduler started (every ${intervalMinutes}m)`);

    // Run once on startup
    this.cleanOldFiles(60).catch((e) => logger.warn('[CLEANUP] Initial run failed:', e));

    this.cleanupIntervalId = setInterval(() => {
      this.cleanOldFiles(60).catch((e) => logger.warn('[CLEANUP] Periodic run failed:', e));
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop background scheduler during graceful shutdown
   */
  static stopScheduler(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
      logger.debug('[CLEANUP] Automated cleanup scheduler stopped.');
    }
  }
}

export default CleanupService;

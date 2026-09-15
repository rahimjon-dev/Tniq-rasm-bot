export declare class CleanupService {
    private static cleanupIntervalId?;
    /**
     * Scan storage directories and delete files older than maxAgeMinutes
     */
    static cleanOldFiles(maxAgeMinutes?: number): Promise<{
        deletedCount: number;
        freedBytes: number;
    }>;
    /**
     * Start recurring background cleanup timer (every 30 minutes)
     */
    static startScheduler(intervalMinutes?: number): void;
    /**
     * Stop background scheduler during graceful shutdown
     */
    static stopScheduler(): void;
}
export default CleanupService;

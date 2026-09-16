export class PlanService {
    static PLANS = {
        FREE: {
            dailyImages: 70,
            dailyVideos: 20,
            isUnlimitedImages: false,
            isUnlimitedVideos: false,
            hasCustomBackground: false,
            canUse4K: false,
            maxImageSizeMB: 20,
            maxVideoSizeMB: 50,
        },
        PREMIUM: {
            dailyImages: 150,
            dailyVideos: 50,
            isUnlimitedImages: false,
            isUnlimitedVideos: false,
            hasCustomBackground: false,
            canUse4K: true,
            maxImageSizeMB: 50,
            maxVideoSizeMB: 100,
        },
        PRO: {
            dailyImages: Infinity,
            dailyVideos: Infinity,
            isUnlimitedImages: true,
            isUnlimitedVideos: true,
            hasCustomBackground: true,
            canUse4K: true,
            maxImageSizeMB: 100,
            maxVideoSizeMB: 200,
        },
        // Backward compatibility for legacy BUSINESS records -> treated as PRO
        BUSINESS: {
            dailyImages: Infinity,
            dailyVideos: Infinity,
            isUnlimitedImages: true,
            isUnlimitedVideos: true,
            hasCustomBackground: true,
            canUse4K: true,
            maxImageSizeMB: 100,
            maxVideoSizeMB: 200,
        },
    };
    /**
     * Normalize plan string to standard canonical plan
     */
    static normalizePlan(plan) {
        if (!plan)
            return 'FREE';
        const upper = plan.toUpperCase();
        if (upper === 'PRO' || upper === 'BUSINESS')
            return 'PRO';
        if (upper === 'PREMIUM')
            return 'PREMIUM';
        return 'FREE';
    }
    /**
     * Get plan entitlements and limits
     */
    static getLimits(plan) {
        const normalized = this.normalizePlan(plan);
        return this.PLANS[normalized] || this.PLANS.FREE;
    }
    /**
     * Check if plan allows custom background
     */
    static canUseCustomBackground(plan) {
        return this.getLimits(plan).hasCustomBackground;
    }
    /**
     * Get human readable plan name in user's language
     */
    static getPlanDisplayName(plan, lang = 'uz') {
        const normalized = this.normalizePlan(plan);
        switch (normalized) {
            case 'PRO':
                return lang === 'ru' ? '💎 PRO (Безлимит)' : lang === 'en' ? '💎 PRO (Unlimited)' : '💎 PRO (Cheksiz)';
            case 'PREMIUM':
                return lang === 'ru' ? '⭐ PREMIUM (150/50)' : lang === 'en' ? '⭐ PREMIUM (150/50)' : '⭐ PREMIUM (150/50)';
            case 'FREE':
            default:
                return lang === 'ru' ? '🎁 FREE (70/20)' : lang === 'en' ? '🎁 FREE (70/20)' : '🎁 FREE (70/20)';
        }
    }
}
export default PlanService;
//# sourceMappingURL=plan.service.js.map
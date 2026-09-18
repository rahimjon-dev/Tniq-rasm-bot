import { UserPlan, PlanLimits } from '../types/user.types.js';

export class PlanService {
  private static readonly PLANS: Record<string, PlanLimits> = {
    FREE: {
      dailyImages: 50,
      dailyVideos: 10,
      isUnlimitedImages: false,
      isUnlimitedVideos: false,
      hasCustomBackground: false,
      canUse4K: true,
      maxImageSizeMB: 20,
      maxVideoSizeMB: 50,
    },
    PREMIUM: {
      dailyImages: 70,
      dailyVideos: 30,
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
  static normalizePlan(plan?: string | null): UserPlan {
    if (!plan) return 'FREE';
    const upper = plan.toUpperCase();
    if (upper === 'PRO' || upper === 'BUSINESS') return 'PRO';
    if (upper === 'PREMIUM') return 'PREMIUM';
    return 'FREE';
  }

  /**
   * Get plan entitlements and limits
   */
  static getLimits(plan?: string | null): PlanLimits {
    const normalized = this.normalizePlan(plan);
    return this.PLANS[normalized] || this.PLANS.FREE;
  }

  /**
   * Check if plan allows custom background
   */
  static canUseCustomBackground(plan?: string | null): boolean {
    return this.getLimits(plan).hasCustomBackground;
  }

  /**
   * Get human readable plan name in user's language
   */
  static getPlanDisplayName(plan?: string | null, lang = 'uz'): string {
    const normalized = this.normalizePlan(plan);
    switch (normalized) {
      case 'PRO':
        return lang === 'ru' ? '👑 PRO (Безлимит)' : lang === 'en' ? '👑 PRO (Unlimited)' : '👑 PRO (Cheksiz)';
      case 'PREMIUM':
        return lang === 'ru' ? '⭐ PREMIUM (70/30)' : lang === 'en' ? '⭐ PREMIUM (70/30)' : '⭐ PREMIUM (70/30)';
      case 'FREE':
      default:
        return lang === 'ru' ? '🎁 FREE (50/10)' : lang === 'en' ? '🎁 FREE (50/10)' : '🎁 FREE (50/10)';
    }
  }
}

export default PlanService;

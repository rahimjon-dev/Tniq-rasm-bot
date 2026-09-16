import { UserPlan, PlanLimits } from '../types/user.types.js';
export declare class PlanService {
    private static readonly PLANS;
    /**
     * Normalize plan string to standard canonical plan
     */
    static normalizePlan(plan?: string | null): UserPlan;
    /**
     * Get plan entitlements and limits
     */
    static getLimits(plan?: string | null): PlanLimits;
    /**
     * Check if plan allows custom background
     */
    static canUseCustomBackground(plan?: string | null): boolean;
    /**
     * Get human readable plan name in user's language
     */
    static getPlanDisplayName(plan?: string | null, lang?: string): string;
}
export default PlanService;

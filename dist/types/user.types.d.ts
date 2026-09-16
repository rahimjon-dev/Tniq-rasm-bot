export type UserPlan = 'FREE' | 'PREMIUM' | 'PRO' | 'BUSINESS';
export interface UserSessionState {
    step?: 'IDLE' | 'AWAITING_IMAGE' | 'AWAITING_VIDEO' | 'SELECTING_RESOLUTION' | 'AWAITING_PRO_BACKGROUND';
    pendingMediaId?: string;
    selectedScale?: 2 | 4;
}
export interface PlanLimits {
    dailyImages: number;
    dailyVideos: number;
    isUnlimitedImages: boolean;
    isUnlimitedVideos: boolean;
    hasCustomBackground: boolean;
    canUse4K: boolean;
    maxImageSizeMB: number;
    maxVideoSizeMB: number;
}
export interface UserQuotaSummary {
    plan: UserPlan;
    imagesUsedToday: number;
    imagesMaxLimit: number;
    imagesRemainingToday: number;
    isUnlimitedImages: boolean;
    videosUsedToday: number;
    videosMaxLimit: number;
    videosRemainingToday: number;
    isUnlimitedVideos: boolean;
    maxImageSizeMB: number;
    maxVideoSizeMB: number;
    canUse4K: boolean;
}

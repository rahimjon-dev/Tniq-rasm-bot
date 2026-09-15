export type UserPlan = 'FREE' | 'PRO' | 'BUSINESS';

export interface UserSessionState {
  step?: 'IDLE' | 'AWAITING_IMAGE' | 'AWAITING_VIDEO' | 'SELECTING_RESOLUTION';
  pendingMediaId?: string;
  selectedScale?: 2 | 4;
}

export interface UserQuotaSummary {
  plan: UserPlan;
  imagesRemainingToday: number;
  videosRemainingToday: number;
  maxImageSizeMB: number;
  maxVideoSizeMB: number;
  canUse4K: boolean;
}

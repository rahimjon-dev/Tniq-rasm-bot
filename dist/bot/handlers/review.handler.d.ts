import { Context } from 'telegraf';
export declare const pendingReviewRatings: Map<number, {
    rating: number;
    timestamp: number;
}>;
/**
 * Send interactive star rating invitation after image/video processing completes
 */
export declare function sendReviewInvitation(telegramChatId: number, lang?: string): Promise<void>;
/**
 * Handle user clicking ⭐ 1 - 5 star buttons
 */
export declare function handleStarRatingCallback(ctx: Context, rating: number): Promise<void>;
/**
 * Check if the incoming text message is a review comment from a pending user
 */
export declare function checkAndProcessReviewComment(ctx: Context): Promise<boolean>;
/**
 * Handle manual /review or /rate command or button
 */
export declare function handleReviewCommand(ctx: Context): Promise<void>;

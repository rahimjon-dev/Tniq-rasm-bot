export declare class BackgroundService {
    /**
     * Automatically composites a foreground photo onto a user's custom background.
     * Steps:
     * 1. Validate both files exist.
     * 2. Inspect original image dimensions.
     * 3. Prepare background image (resize to match foreground aspect ratio and resolution).
     * 4. Perform subject segmentation & alpha blending.
     * 5. Return path to composite image.
     */
    static replaceBackground(inputPhotoPath: string, customBackgroundPath: string, outputPath: string): Promise<string>;
    /**
     * Check if a custom background exists for given user
     */
    static hasCustomBackground(customBackgroundPath?: string | null): boolean;
}
export default BackgroundService;

export interface ValidatedImage {
    localPath: string;
    width: number;
    height: number;
    sizeBytes: number;
    format: string;
}
export declare class ImageService {
    static validateFileSize(sizeBytes: number): boolean;
    static downloadTelegramFile(fileUrl: string, destinationPath: string): Promise<void>;
    static inspectAndValidate(filePath: string): Promise<ValidatedImage>;
    static safeDelete(filePath?: string): Promise<void>;
}
export default ImageService;

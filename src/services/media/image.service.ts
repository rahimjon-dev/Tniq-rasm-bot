import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

export interface ValidatedImage {
  localPath: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
}

export class ImageService {
  static validateFileSize(sizeBytes: number): boolean {
    const maxBytes = config.MAX_IMAGE_SIZE_MB * 1024 * 1024;
    return sizeBytes <= maxBytes;
  }

  static async downloadTelegramFile(fileUrl: string, destinationPath: string): Promise<void> {
    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file from Telegram: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await fs.promises.writeFile(destinationPath, Buffer.from(arrayBuffer));
  }

  static async inspectAndValidate(filePath: string): Promise<ValidatedImage> {
    const stats = await fs.promises.stat(filePath);
    if (!this.validateFileSize(stats.size)) {
      throw new Error(`File exceeds maximum allowed size of ${config.MAX_IMAGE_SIZE_MB}MB.`);
    }

    const meta = await sharp(filePath).metadata();
    if (!meta.width || !meta.height) {
      throw new Error('Invalid image file: could not read dimensions.');
    }

    const allowedFormats = ['jpeg', 'png', 'webp', 'jpg'];
    if (!meta.format || !allowedFormats.includes(meta.format.toLowerCase())) {
      throw new Error(`Unsupported image format: ${meta.format || 'unknown'}. Please send JPG, PNG, or WebP.`);
    }

    return {
      localPath: filePath,
      width: meta.width,
      height: meta.height,
      sizeBytes: stats.size,
      format: meta.format,
    };
  }

  static async safeDelete(filePath?: string): Promise<void> {
    if (filePath && fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        logger.warn(`Could not delete temp file: ${filePath}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

export default ImageService;

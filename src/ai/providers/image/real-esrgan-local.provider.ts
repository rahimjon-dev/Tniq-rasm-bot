import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import config from '../../../config/index.js';
import logger from '../../../utils/logger.js';
import {
  ImageUpscalerProvider,
  ImageUpscaleOptions,
  ImageUpscaleResult,
} from '../../interfaces/image-upscaler.interface.js';

export class RealESRGANLocalProvider implements ImageUpscalerProvider {
  readonly name = 'real-esrgan-local';
  private readonly exePath: string;
  private readonly modelsDir: string;

  constructor() {
    this.exePath = config.paths.realEsrganExe;
    this.modelsDir = config.paths.realEsrganModels;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const exeExists = fs.existsSync(this.exePath);
      const modelsExist = fs.existsSync(this.modelsDir);
      return exeExists && modelsExist;
    } catch {
      return false;
    }
  }

  async upscaleImage(
    inputPath: string,
    outputPath: string,
    options: ImageUpscaleOptions
  ): Promise<ImageUpscaleResult> {
    const startTime = Date.now();

    // 1. Validate inputs
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found at: ${inputPath}`);
    }

    const available = await this.isAvailable();
    if (!available) {
      throw new Error(
        `Real-ESRGAN binary or models directory not found at: ${this.exePath}`
      );
    }

    // 2. Read original metadata
    const inputMeta = await sharp(inputPath).metadata();
    const originalWidth = inputMeta.width || 0;
    const originalHeight = inputMeta.height || 0;

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const scale = options.scale || 2;
    const format = options.format || 'jpg';
    // Use ultra-fast neural network (realesr-animevideov3) for blazing fast 4-5 second inference
    const modelName = 'realesr-animevideov3';

    logger.info(`[AI_IMAGE] Starting upscale: scale=${scale}x, model=${modelName}`, {
      inputPath,
      outputPath,
      originalDimensions: `${originalWidth}x${originalHeight}`,
    });

    const args = [
      '-i', inputPath,
      '-o', outputPath,
      '-n', modelName,
      '-m', this.modelsDir,
      '-s', scale.toString(),
      '-f', format,
    ];


    // 3. Execute the AI inference binary
    await new Promise<void>((resolve, reject) => {
      execFile(
        this.exePath,
        args,
        { timeout: 180000 }, // 3 minutes timeout
        (error, stdout, stderr) => {
          if (error) {
            logger.error('[AI_IMAGE] Inference process failed:', {
              error: error.message,
              stderr,
            });
            return reject(new Error(`AI upscaling failed: ${error.message}`));
          }
          resolve();
        }
      );
    });

    // 4. Validate output file
    if (!fs.existsSync(outputPath)) {
      throw new Error('AI inference completed but output file was not produced.');
    }

    const outputMeta = await sharp(outputPath).metadata();
    const outputWidth = outputMeta.width || originalWidth * scale;
    const outputHeight = outputMeta.height || originalHeight * scale;
    const processingTimeSeconds = (Date.now() - startTime) / 1000;

    logger.info(`[AI_IMAGE] Completed upscale in ${processingTimeSeconds.toFixed(2)}s: ${outputWidth}x${outputHeight}`);

    return {
      outputPath,
      originalWidth,
      originalHeight,
      outputWidth,
      outputHeight,
      processingTimeSeconds,
      provider: this.name,
      modelUsed: modelName,
    };
  }
}

export default RealESRGANLocalProvider;

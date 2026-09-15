import config from '../../../config/index.js';
import { ImageUpscalerProvider } from '../../interfaces/image-upscaler.interface.js';
import { RealESRGANLocalProvider } from './real-esrgan-local.provider.js';

export function getImageUpscalerProvider(): ImageUpscalerProvider {
  switch (config.AI_IMAGE_PROVIDER) {
    case 'real-esrgan-local':
    default:
      return new RealESRGANLocalProvider();
  }
}

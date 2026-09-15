import config from '../../../config/index.js';
import { VideoUpscalerProvider } from '../../interfaces/video-upscaler.interface.js';
import { RealESRGANVideoProvider } from './real-esrgan-video.provider.js';

export function getVideoUpscalerProvider(): VideoUpscalerProvider {
  switch (config.AI_VIDEO_PROVIDER) {
    case 'real-esrgan-video-local':
    default:
      return new RealESRGANVideoProvider();
  }
}

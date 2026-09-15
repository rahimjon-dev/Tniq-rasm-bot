import config from '../../../config/index.js';
import { RealESRGANVideoProvider } from './real-esrgan-video.provider.js';
export function getVideoUpscalerProvider() {
    switch (config.AI_VIDEO_PROVIDER) {
        case 'real-esrgan-video-local':
        default:
            return new RealESRGANVideoProvider();
    }
}
//# sourceMappingURL=index.js.map
import config from '../../../config/index.js';
import { RealESRGANLocalProvider } from './real-esrgan-local.provider.js';
export function getImageUpscalerProvider() {
    switch (config.AI_IMAGE_PROVIDER) {
        case 'real-esrgan-local':
        default:
            return new RealESRGANLocalProvider();
    }
}
//# sourceMappingURL=index.js.map
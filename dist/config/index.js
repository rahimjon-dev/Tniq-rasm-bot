import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
// Load environment variables from .env
dotenv.config();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    // Telegram
    BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required in .env'),
    ADMIN_TELEGRAM_IDS: z
        .string()
        .default('')
        .transform((val) => val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((id) => BigInt(id))),
    // Database & Redis
    DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/ai_upscaler?schema=public'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    // Storage
    STORAGE_TEMP_DIR: z.string().default('storage/temp'),
    STORAGE_OUTPUT_DIR: z.string().default('storage/outputs'),
    // Limits
    FREE_DAILY_IMAGE_LIMIT: z.coerce.number().default(500),
    FREE_DAILY_VIDEO_LIMIT: z.coerce.number().default(50),
    MAX_IMAGE_SIZE_MB: z.coerce.number().default(20),
    MAX_VIDEO_SIZE_MB: z.coerce.number().default(50),
    MAX_VIDEO_DURATION_SECONDS: z.coerce.number().default(30),
    // AI Providers
    AI_IMAGE_PROVIDER: z.string().default('real-esrgan-local'),
    AI_VIDEO_PROVIDER: z.string().default('real-esrgan-video-local'),
    REPLICATE_API_TOKEN: z.string().optional(),
    RUNWARE_API_KEY: z.string().optional(),
    // Local model paths
    REAL_ESRGAN_PATH: z.string().default('./realesrgan/realesrgan-ncnn-vulkan.exe'),
    REAL_ESRGAN_MODELS_DIR: z.string().default('./realesrgan/models'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Configuration validation error:');
    console.error(parsed.error.format());
    throw new Error('Invalid environment configuration. Please check your .env file.');
}
export const config = {
    ...parsed.data,
    paths: {
        tempStorage: path.resolve(process.cwd(), parsed.data.STORAGE_TEMP_DIR),
        outputStorage: path.resolve(process.cwd(), parsed.data.STORAGE_OUTPUT_DIR),
        realEsrganExe: path.resolve(process.cwd(), parsed.data.REAL_ESRGAN_PATH),
        realEsrganModels: path.resolve(process.cwd(), parsed.data.REAL_ESRGAN_MODELS_DIR),
    },
};
export default config;
//# sourceMappingURL=index.js.map
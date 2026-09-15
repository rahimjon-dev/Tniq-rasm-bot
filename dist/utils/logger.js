import winston from 'winston';
const { combine, timestamp, printf, colorize, errors, json } = winston.format;
const isProduction = process.env.NODE_ENV === 'production';
// Development friendly formatter
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${stack || message}${metaString}`;
});
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), isProduction ? json() : combine(colorize(), devFormat)),
    defaultMeta: { service: 'ai-media-upscaler' },
    transports: [
        new winston.transports.Console()
    ]
});
export default logger;
//# sourceMappingURL=logger.js.map
import bootstrap from './app.js';
import logger from './utils/logger.js';

bootstrap().catch((err) => {
  logger.error('Fatal error during application startup:', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});

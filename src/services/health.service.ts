import http from 'http';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { checkDatabaseConnection } from '../database/prisma.js';
import { checkRedisConnection } from '../queue/queue.client.js';

let server: http.Server | undefined;

export function startHealthServer(): http.Server {
  const port = config.PORT || 3000;

  server = http.createServer(async (req, res) => {
    const url = req.url || '/';

    if (url === '/health' || url === '/') {
      const [dbOk, redisOk] = await Promise.all([
        checkDatabaseConnection(),
        checkRedisConnection(),
      ]);

      const responsePayload = {
        status: 'healthy',
        service: 'ai-media-upscaler-telegram-bot',
        environment: config.NODE_ENV,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        checks: {
          bot: 'online',
          database: dbOk ? 'online' : 'offline/pending',
          redis: redisOk ? 'online' : 'offline/pending',
        },
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responsePayload, null, 2));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`[HEALTH_SERVER] Port ${port} is currently in use. Health server skipped.`);
    } else {
      logger.warn('[HEALTH_SERVER] HTTP server issue:', err.message);
    }
  });

  server.listen(port, () => {
    logger.info(`[HEALTH_SERVER] HTTP monitoring server listening on port ${port} (/health)`);
  });

  return server;
}


export function stopHealthServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        logger.debug('[HEALTH_SERVER] HTTP server closed.');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

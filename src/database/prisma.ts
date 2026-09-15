import net from 'net';
import { PrismaClient } from '@prisma/client';
import config from '../config/index.js';
import logger from '../utils/logger.js';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
    ],
  });

// Log prisma queries in development
if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}

let isDbConnected = false;

export function isDatabaseAvailable(): boolean {
  return isDbConnected;
}

export async function isPostgresReachable(timeoutMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const url = new URL(config.DATABASE_URL);
      const port = Number(url.port) || 5432;
      const host = url.hostname || '127.0.0.1';

      const socket = new net.Socket();
      let finished = false;

      const finish = (result: boolean) => {
        if (!finished) {
          finished = true;
          socket.destroy();
          resolve(result);
        }
      };

      socket.setTimeout(timeoutMs);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));

      socket.connect(port, host);
    } catch {
      resolve(false);
    }
  });
}

export async function checkDatabaseConnection(): Promise<boolean> {
  const reachable = await isPostgresReachable();
  if (!reachable) {
    isDbConnected = false;
    logger.info('Database is offline. Running in resilient in-memory mode.');
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbConnected = true;
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    isDbConnected = false;
    logger.warn('PostgreSQL database query failed, running in in-memory mode');
    return false;
  }
}

export default prisma;


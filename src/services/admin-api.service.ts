import { IncomingMessage, ServerResponse } from 'http';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import AdminService from './admin.service.js';
import { UserPlan } from '../types/user.types.js';

export class AdminApiService {
  /**
   * Parse JSON body from request
   */
  private static async parseBody<T = any>(req: IncomingMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1e6) {
          // 1MB flood protection
          req.destroy();
          reject(new Error('Payload too large'));
        }
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(new Error('Invalid JSON format'));
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * Verify if request is authorized
   */
  private static isAuthorized(req: IncomingMessage, urlObj: URL): boolean {
    const headerKey = req.headers['x-admin-key'];
    const queryKey = urlObj.searchParams.get('key');
    const authHeader = req.headers['authorization'];

    const expected = config.ADMIN_SECRET_KEY;
    if (!expected) return true; // Open if no key set

    if (headerKey === expected) return true;
    if (queryKey === expected) return true;
    if (authHeader && authHeader === `Bearer ${expected}`) return true;

    return false;
  }

  private static sendJson(res: ServerResponse, statusCode: number, data: any) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
    });
    res.end(JSON.stringify(data));
  }

  /**
   * Main router for /api/admin/* endpoints
   */
  static async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const rawUrl = req.url || '/';
    const parsedUrl = new URL(rawUrl, 'http://localhost');
    const pathname = parsedUrl.pathname;

    if (!pathname.startsWith('/api/admin')) {
      return false; // Not an admin API route
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
      });
      res.end();
      return true;
    }

    // 1. Auth check route
    if (pathname === '/api/admin/auth/verify' && req.method === 'POST') {
      try {
        const body = await this.parseBody(req);
        const isValid = body.key === config.ADMIN_SECRET_KEY;
        this.sendJson(res, isValid ? 200 : 401, {
          success: isValid,
          message: isValid ? 'Authenticated' : 'Invalid Secret Key',
        });
        return true;
      } catch (err: any) {
        this.sendJson(res, 400, { error: err.message });
        return true;
      }
    }

    // All subsequent admin routes require authorization
    if (!this.isAuthorized(req, parsedUrl)) {
      this.sendJson(res, 401, { error: 'Unauthorized. Invalid or missing admin key.' });
      return true;
    }

    try {
      // 2. System stats
      if (pathname === '/api/admin/stats' && req.method === 'GET') {
        const stats = await AdminService.getSystemStats();
        this.sendJson(res, 200, { success: true, stats });
        return true;
      }

      // 3. Search and list users
      if (pathname === '/api/admin/users' && req.method === 'GET') {
        const query = parsedUrl.searchParams.get('q') || '';
        const page = parseInt(parsedUrl.searchParams.get('page') || '1', 10);
        const limit = parseInt(parsedUrl.searchParams.get('limit') || '15', 10);

        const result = await AdminService.searchUsers(query, page, limit);
        this.sendJson(res, 200, { success: true, ...result });
        return true;
      }

      // 4. Ban / Unban user
      const banMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/ban$/);
      if (banMatch && req.method === 'POST') {
        const telegramId = banMatch[1];
        const body = await this.parseBody(req);
        const isBanned = body.isBanned !== undefined ? body.isBanned : true;

        const success = isBanned
          ? await AdminService.banUser(telegramId)
          : await AdminService.unbanUser(telegramId);

        this.sendJson(res, success ? 200 : 400, {
          success,
          message: success
            ? `User ${telegramId} ${isBanned ? 'banned' : 'unbanned'}`
            : 'Action failed',
        });
        return true;
      }

      // 5. Update user plan
      const planMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/plan$/);
      if (planMatch && req.method === 'POST') {
        const telegramId = planMatch[1];
        const body = await this.parseBody(req);
        const plan = (body.plan || 'PRO').toUpperCase() as UserPlan;
        const durationDays = body.durationDays || 30;

        const success = await AdminService.setPlan(parseInt(telegramId, 10), plan, durationDays);
        this.sendJson(res, success ? 200 : 400, {
          success,
          message: success ? `Plan updated to ${plan}` : 'Failed to update plan',
        });
        return true;
      }

      // 6. Broadcast message
      if (pathname === '/api/admin/broadcast' && req.method === 'POST') {
        const body = await this.parseBody(req);
        const text = (body.text || '').trim();
        const mediaUrl = (body.mediaUrl || '').trim();

        if (!text && !mediaUrl) {
          this.sendJson(res, 400, { error: 'Xabar matni yoki media havolasi kiritilishi shart' });
          return true;
        }

        const result = await AdminService.broadcastMessage({
          text,
          mediaType: body.mediaType || 'text',
          mediaUrl: mediaUrl || undefined,
          buttonText: body.buttonText || undefined,
          buttonUrl: body.buttonUrl || undefined,
        });
        this.sendJson(res, 200, { success: true, result });
        return true;
      }

      // 7. Recent jobs
      if (pathname === '/api/admin/jobs' && req.method === 'GET') {
        const limit = parseInt(parsedUrl.searchParams.get('limit') || '20', 10);
        const jobs = await AdminService.getRecentJobs(limit);
        this.sendJson(res, 200, { success: true, jobs });
        return true;
      }

      this.sendJson(res, 404, { error: 'Admin API endpoint not found' });
      return true;
    } catch (e: any) {
      logger.error('[ADMIN_API] Error processing request:', e);
      this.sendJson(res, 500, { error: e.message || 'Internal Server Error' });
      return true;
    }
  }
}

export default AdminApiService;

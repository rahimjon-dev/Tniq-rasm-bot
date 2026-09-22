import config from '../config/index.js';
import logger from '../utils/logger.js';
import AdminService from './admin.service.js';
import store from './store.service.js';
export class AdminApiService {
    /**
     * Parse JSON body from request
     */
    static async parseBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
                if (body.length > 1e6) {
                    req.destroy();
                    reject(new Error('Payload too large'));
                }
            });
            req.on('end', () => {
                try {
                    resolve(body ? JSON.parse(body) : {});
                }
                catch {
                    resolve({});
                }
            });
            req.on('error', reject);
        });
    }
    /**
     * Verify if request is authorized
     */
    static isAuthorized(req, urlObj) {
        const headerKey = req.headers['x-admin-key'];
        const queryKey = urlObj.searchParams.get('key');
        const authHeader = req.headers['authorization'];
        const expected = config.ADMIN_SECRET_KEY;
        if (!expected)
            return true;
        if (headerKey === expected)
            return true;
        if (queryKey === expected)
            return true;
        if (authHeader && authHeader === `Bearer ${expected}`)
            return true;
        return false;
    }
    static sendJson(res, statusCode, data) {
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
    static async handleRequest(req, res) {
        const rawUrl = req.url || '/';
        const parsedUrl = new URL(rawUrl, 'http://localhost');
        const pathname = parsedUrl.pathname;
        if (!pathname.startsWith('/api/admin')) {
            return false;
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
            }
            catch (err) {
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
                const planFilter = parsedUrl.searchParams.get('plan') || '';
                const statusFilter = parsedUrl.searchParams.get('status') || '';
                const result = await AdminService.searchUsers(query, page, limit, planFilter, statusFilter);
                this.sendJson(res, 200, { success: true, ...result });
                return true;
            }
            // 4. User detail
            if (pathname === '/api/admin/users/detail' && req.method === 'GET') {
                const id = parsedUrl.searchParams.get('id');
                if (!id) {
                    this.sendJson(res, 400, { error: 'User ID is required' });
                    return true;
                }
                const user = await AdminService.getUserDetails(id);
                if (!user) {
                    this.sendJson(res, 404, { error: 'User not found' });
                    return true;
                }
                this.sendJson(res, 200, { success: true, user });
                return true;
            }
            // 5. Ban / Unban user
            const banMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/ban$/);
            if ((banMatch || pathname === '/api/admin/users/ban') && req.method === 'POST') {
                const body = await this.parseBody(req);
                const telegramId = banMatch ? banMatch[1] : body.telegramId;
                const isBanned = body.isBanned !== undefined ? body.isBanned : true;
                if (!telegramId) {
                    this.sendJson(res, 400, { error: 'Telegram ID is required' });
                    return true;
                }
                const success = await AdminService.setUserBanStatus(telegramId, isBanned);
                this.sendJson(res, success ? 200 : 400, {
                    success,
                    message: success
                        ? `Foydalanuvchi ${telegramId} ${isBanned ? 'bloklandi' : 'blokdan chiqarildi'}`
                        : 'Amal bajarilmadi',
                });
                return true;
            }
            // 6. Update user plan
            const planMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/plan$/);
            if ((planMatch || pathname === '/api/admin/users/plan') && req.method === 'POST') {
                const body = await this.parseBody(req);
                const telegramId = planMatch ? planMatch[1] : body.telegramId;
                const plan = (body.plan || 'PRO').toUpperCase();
                if (!telegramId) {
                    this.sendJson(res, 400, { error: 'Telegram ID is required' });
                    return true;
                }
                const success = await AdminService.updateUserPlan(telegramId, plan);
                this.sendJson(res, success ? 200 : 400, {
                    success,
                    message: success ? `Tarif ${plan} ga yangilandi` : 'Tarifni yangilab bo\'lmadi',
                });
                return true;
            }
            // 7. Reset user daily usage
            const resetMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/reset-usage$/);
            if ((resetMatch || pathname === '/api/admin/users/reset-usage') && req.method === 'POST') {
                const body = await this.parseBody(req);
                const telegramId = resetMatch ? resetMatch[1] : body.telegramId;
                if (!telegramId) {
                    this.sendJson(res, 400, { error: 'Telegram ID is required' });
                    return true;
                }
                const success = await AdminService.resetUserDailyUsage(telegramId);
                this.sendJson(res, success ? 200 : 400, {
                    success,
                    message: success ? `Foydalanuvchi ${telegramId} kunlik limiti yangilandi` : 'Limitni yangilab bo\'lmadi',
                });
                return true;
            }
            // 8. Broadcast message
            if (pathname === '/api/admin/broadcast' && req.method === 'POST') {
                const body = await this.parseBody(req);
                const text = (body.text || body.message || '').trim();
                const mediaUrl = (body.mediaUrl || '').trim();
                if (!text && !mediaUrl) {
                    this.sendJson(res, 400, { error: 'Xabar matni yoki media havolasi kiritilishi shart' });
                    return true;
                }
                const result = await AdminService.broadcastMessage(text, {
                    mediaType: body.mediaType || 'none',
                    mediaUrl: mediaUrl || undefined,
                    buttonText: body.buttonText || undefined,
                    buttonUrl: body.buttonUrl || undefined,
                });
                this.sendJson(res, 200, { success: true, result });
                return true;
            }
            // 9. Search, filter, and paginate media jobs
            if (pathname === '/api/admin/jobs' && req.method === 'GET') {
                const query = parsedUrl.searchParams.get('q') || '';
                const type = parsedUrl.searchParams.get('type') || '';
                const status = parsedUrl.searchParams.get('status') || '';
                const page = parseInt(parsedUrl.searchParams.get('page') || '1', 10);
                const limit = parseInt(parsedUrl.searchParams.get('limit') || '20', 10);
                const result = await AdminService.getJobs({
                    query,
                    type,
                    status,
                    page,
                    limit,
                });
                this.sendJson(res, 200, { success: true, ...result });
                return true;
            }
            // 10. Reviews & Ratings API
            if (pathname === '/api/admin/reviews' && req.method === 'GET') {
                const query = parsedUrl.searchParams.get('q') || '';
                const ratingFilter = parsedUrl.searchParams.get('rating') || '';
                const page = parseInt(parsedUrl.searchParams.get('page') || '1', 10);
                const limit = parseInt(parsedUrl.searchParams.get('limit') || '20', 10);
                const result = store.getReviews({
                    query,
                    ratingFilter,
                    page,
                    limit,
                });
                const ratingStats = store.getAverageRating();
                this.sendJson(res, 200, {
                    success: true,
                    ratingStats,
                    ...result,
                });
                return true;
            }
            if (pathname.startsWith('/api/admin/reviews/') && req.method === 'DELETE') {
                const reviewId = pathname.replace('/api/admin/reviews/', '');
                const success = store.deleteReview(reviewId);
                this.sendJson(res, success ? 200 : 404, {
                    success,
                    message: success ? 'Izoh muvaffaqiyatli o\'chirildi' : 'Izoh topilmadi',
                });
                return true;
            }
            this.sendJson(res, 404, { error: 'Admin API endpoint not found' });
            return true;
        }
        catch (e) {
            logger.error('[ADMIN_API] Error processing request:', e);
            this.sendJson(res, 500, { error: e.message || 'Internal Server Error' });
            return true;
        }
    }
}
export default AdminApiService;
//# sourceMappingURL=admin-api.service.js.map
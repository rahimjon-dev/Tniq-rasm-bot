import { IncomingMessage, ServerResponse } from 'http';
export declare class AdminApiService {
    /**
     * Parse JSON body from request
     */
    private static parseBody;
    /**
     * Verify if request is authorized
     */
    private static isAuthorized;
    private static sendJson;
    /**
     * Main router for /api/admin/* endpoints
     */
    static handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean>;
}
export default AdminApiService;

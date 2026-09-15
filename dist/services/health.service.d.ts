import http from 'http';
export declare function startHealthServer(): http.Server;
export declare function stopHealthServer(): Promise<void>;
export default startHealthServer;

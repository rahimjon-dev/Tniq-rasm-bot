import http from 'http';
export declare function startKeepAlivePinger(): void;
export declare function stopKeepAlivePinger(): void;
export declare function startHealthServer(): http.Server;
export declare function stopHealthServer(): Promise<void>;
export default startHealthServer;

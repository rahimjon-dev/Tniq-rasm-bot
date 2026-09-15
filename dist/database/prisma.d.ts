import { PrismaClient } from '@prisma/client';
declare global {
    var prismaGlobal: PrismaClient | undefined;
}
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function isDatabaseAvailable(): boolean;
export declare function isPostgresReachable(timeoutMs?: number): Promise<boolean>;
export declare function checkDatabaseConnection(): Promise<boolean>;
export default prisma;

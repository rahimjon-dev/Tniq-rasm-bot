import { Worker } from 'bullmq';
import { ImageJobPayload } from '../../types/job.types.js';
export declare function processImageJob(payload: ImageJobPayload): Promise<void>;
export declare let imageWorker: Worker;
export declare function startImageWorker(connection?: import("ioredis").default<"legacy">): Worker;
export default startImageWorker;

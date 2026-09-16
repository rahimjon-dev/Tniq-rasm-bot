import { Worker } from 'bullmq';
import { VideoJobPayload } from '../../types/job.types.js';
export declare function processVideoJob(payload: VideoJobPayload): Promise<void>;
export declare let videoWorker: Worker;
export declare function startVideoWorker(connection?: import("ioredis").default<"legacy">): Worker;
export default startVideoWorker;

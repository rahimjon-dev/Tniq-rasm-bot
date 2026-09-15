import { Worker } from 'bullmq';
import { ImageJobPayload } from '../../types/job.types.js';
export declare function processImageJob(payload: ImageJobPayload): Promise<void>;
export declare function startImageWorker(redis: any): Worker<ImageJobPayload>;
export declare function stopImageWorker(): Promise<void>;
export declare const imageWorker: Worker<ImageJobPayload>;
export default imageWorker;

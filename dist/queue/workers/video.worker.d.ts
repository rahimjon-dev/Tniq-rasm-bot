import { Worker } from 'bullmq';
import { VideoJobPayload } from '../../types/job.types.js';
export declare function processVideoJob(payload: VideoJobPayload): Promise<void>;
export declare function startVideoWorker(redis: any): Worker<VideoJobPayload>;
export declare function stopVideoWorker(): Promise<void>;
export declare const videoWorker: Worker<VideoJobPayload>;
export default videoWorker;

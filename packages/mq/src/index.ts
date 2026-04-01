import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

export interface TaskPayload {
  uid: string;       // "platform:raw_uid"
  platform: string;
  channel: string;
  messageId: string;
  content: string;
  agentId: string;   // which registered agent handles this task (resolved before enqueue)
  meta?: Record<string, unknown>;
}

export interface ResultPayload {
  uid: string;
  messageId: string;
  platform: string;
  channel: string;
  reply: string;
}

export const TASK_QUEUE   = "openclaw:tasks";
export const RESULT_QUEUE = "openclaw:results";

export function createRedis() {
  return new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
}

export const createTaskQueue   = (r: IORedis) => new Queue<TaskPayload>(TASK_QUEUE, { connection: r });
export const createResultQueue = (r: IORedis) => new Queue<ResultPayload>(RESULT_QUEUE, { connection: r });

export const createTaskWorker = (r: IORedis, handler: (job: Job<TaskPayload>) => Promise<void>) =>
  new Worker<TaskPayload>(TASK_QUEUE, handler, {
    connection: r,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 4),
  });

export const createResultWorker = (r: IORedis, handler: (job: Job<ResultPayload>) => Promise<void>) =>
  new Worker<ResultPayload>(RESULT_QUEUE, handler, { connection: r, concurrency: 8 });

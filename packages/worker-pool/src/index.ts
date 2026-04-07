/**
 * @openclaw/worker-pool
 *
 * ONE stateless worker process. Scale with: docker compose up --scale worker=N
 *
 * 1. Pull job from Task MQ
 * 2. Resolve agentId via AgentRegistry — throws if not found or disabled
 * 3. Resolve user dir via @openclaw/storage (COS or local, auto-selected)
 * 4. Load SOUL.md + skills
 * 5. Dispatch to agent via @openclaw/agent-adapters (type-based routing)
 * 6. Push ResultPayload → Result MQ
 */
import { createRedis, createTaskWorker, createResultQueue, TaskPayload, ResultPayload } from "@openclaw/mq";
import { createStorage, IStorageAdapter } from "@openclaw/storage";
import { AgentRegistry, AgentConfig } from "@openclaw/agent-registry";
import { createAgentAdapter, AgentRequest } from "@openclaw/agent-adapters";

const redis       = createRedis();
const resultQueue = createResultQueue(redis);
const registry    = new AgentRegistry(redis);

// Storage is initialized once at startup (async factory)
let storage: IStorageAdapter;
createStorage().then(s => {
  storage = s;
  console.log(`[worker] storage: ${process.env.COS_BUCKET ? "COS (cos://" + process.env.COS_BUCKET + ")" : "LocalStorage"}`);
});

async function runAgent(payload: TaskPayload, agentCfg: AgentConfig): Promise<string> {
  const { uid, content, platform, channel, messageId, meta } = payload;

  await storage.ensureUserDir(uid);

  const soul   = await storage.readFile(uid, "SOUL.md").catch(() => "");
  const skills = await storage.listFiles(uid, "skills").catch(() => [] as string[]);

  const adapter = createAgentAdapter(agentCfg);

  const req: AgentRequest = {
    uid, platform, channel, messageId, content,
    soul:  soul || undefined,
    skills: skills.length ? skills : undefined,
    meta,
  };

  const { reply } = await adapter.run(req);
  return reply;
}

const worker = createTaskWorker(redis, async (job) => {
  const { agentId } = job.data;
  console.log(`[worker] job ${job.id} for ${job.data.uid} agent=${agentId}`);
  try {
    const agentCfg = await registry.getOrThrow(agentId);
    const reply    = await runAgent(job.data, agentCfg);
    const result: ResultPayload = {
      uid:       job.data.uid,
      messageId: job.data.messageId,
      platform:  job.data.platform,
      channel:   job.data.channel,
      reply,
    };
    await resultQueue.add("result", result);
    console.log(`[worker] done ${job.id}`);
  } catch (err) {
    console.error(`[worker] failed ${job.id}:`, err);
    throw err; // triggers BullMQ retry
  }
});

worker.on("error", err => console.error("[worker]", err));
console.log(`[worker] ready · concurrency=${process.env.WORKER_CONCURRENCY ?? 4}`);

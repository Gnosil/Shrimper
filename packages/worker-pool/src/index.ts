/**
 * @openclaw/worker-pool
 *
 * ONE stateless worker process. Scale with: docker compose up --scale worker=N
 *
 * 1. Pull job from Task MQ
 * 2. Resolve agentId via AgentRegistry — throws if not found or disabled
 * 3. Resolve user dir via @openclaw/storage
 * 4. Load SOUL.md + skills
 * 5. Run agent (dispatched by type — adapters package in next PR)
 * 6. Push ResultPayload → Result MQ
 */
import { createRedis, createTaskWorker, createResultQueue, TaskPayload, ResultPayload } from "@openclaw/mq";
import { LocalStorage } from "@openclaw/storage";
import { AgentRegistry, AgentConfig } from "@openclaw/agent-registry";
// import { OpenClaw } from "openclaw";  // ← cloud service SDK

const redis       = createRedis();
const resultQueue = createResultQueue(redis);
const registry    = new AgentRegistry(redis);

async function runAgent(payload: TaskPayload, agentCfg: AgentConfig): Promise<string> {
  const { uid, content } = payload;

  await LocalStorage.ensureUserDir(uid);

  // Load user context from their isolated dir
  const soul   = await LocalStorage.readFile(uid, "SOUL.md").catch(() => "");
  const skills = await LocalStorage.listFiles(uid, "skills").catch(() => [] as string[]);

  // ── TODO: dispatch to real agent via @openclaw/agent-adapters (next PR) ──
  // const adapter = createAgentAdapter(agentCfg);
  // const reply   = await adapter.run({ content, soul, skills });
  // ─────────────────────────────────────────────────────────────────────────

  const reply = `[stub] agent=${agentCfg.name} uid=${uid} skills=[${skills.join(",")}] → "${content}"`;
  return reply;
}

const worker = createTaskWorker(redis, async (job) => {
  const { agentId } = job.data;
  console.log(`[worker] job ${job.id} for ${job.data.uid} agent=${agentId}`);
  try {
    // Fail fast: throws AgentNotFoundError or AgentDisabledError
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

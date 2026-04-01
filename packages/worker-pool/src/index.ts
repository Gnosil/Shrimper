/**
 * @openclaw/worker-pool
 *
 * ONE stateless worker process. Scale with: docker compose up --scale worker=N
 *
 * 1. Pull job from Task MQ
 * 2. Resolve user dir via @openclaw/storage
 * 3. Load SOUL.md + skills
 * 4. Run OpenClaw agent loop (external cloud SDK)
 * 5. Push ResultPayload → Result MQ
 */
import { createRedis, createTaskWorker, createResultQueue, TaskPayload, ResultPayload } from "@openclaw/mq";
import { LocalStorage } from "@openclaw/storage";
// import { OpenClaw } from "openclaw";  // ← cloud service SDK

const redis       = createRedis();
const resultQueue = createResultQueue(redis);

async function runAgent(payload: TaskPayload): Promise<string> {
  const { uid, content } = payload;

  await LocalStorage.ensureUserDir(uid);

  // Load user context from their isolated dir
  const soul   = await LocalStorage.readFile(uid, "SOUL.md").catch(() => "");
  const skills = await LocalStorage.listFiles(uid, "skills").catch(() => [] as string[]);

  // ── Replace this stub with real OpenClaw SDK call ──────────────────────
  // const agent = new OpenClaw({ apiKey: process.env.OPENCLAW_API_KEY, soul, skills });
  // const reply = await agent.run(content);
  // ────────────────────────────────────────────────────────────────────────

  const reply = `[stub] uid=${uid} skills=[${skills.join(",")}] → "${content}"`;
  return reply;
}

const worker = createTaskWorker(redis, async (job) => {
  console.log(`[worker] job ${job.id} for ${job.data.uid}`);
  try {
    const reply = await runAgent(job.data);
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

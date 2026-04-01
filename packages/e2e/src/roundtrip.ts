/**
 * FULL ROUND-TRIP TEST (single process, no docker needed)
 * npx ts-node --esm src/roundtrip.ts
 *
 * Spins up BOTH a task consumer (simulated worker) and a result consumer
 * in the same process, fires a message, and asserts the reply arrives
 * within 5 seconds.
 *
 * Requires only: Redis running on localhost:6379
 */
import {
  createRedis, createTaskQueue, createResultQueue,
  createTaskWorker, createResultWorker,
  TaskPayload, ResultPayload,
} from "@openclaw/mq";
import { LocalStorage } from "@openclaw/storage";
import crypto from "crypto";

const redis        = createRedis();
const taskQueue    = createTaskQueue(redis);
const resultQueue  = createResultQueue(redis);

const TEST_UID     = "feishu:e2e_test_user";
const TEST_CONTENT = "What is 2 + 2?";
const messageId    = crypto.randomUUID();

// ── Simulated worker (what worker-pool does) ──────────────────────────────
const taskWorker = createTaskWorker(redis, async (job) => {
  const { uid, content } = job.data as TaskPayload;

  // Storage check
  await LocalStorage.ensureUserDir(uid);
  const skills = await LocalStorage.listFiles(uid, "skills").catch(() => [] as string[]);

  // Stub reply (replace with OpenClaw SDK)
  const reply = `[agent] skills=[${skills.join(",") || "none"}] → answer to "${content}": 4`;

  const result: ResultPayload = {
    uid,
    messageId:  job.data.messageId,
    platform:   job.data.platform,
    channel:    job.data.channel,
    reply,
  };
  await resultQueue.add("result", result);
});

// ── Result watcher ────────────────────────────────────────────────────────
let passed = false;

const resultWorker = createResultWorker(redis, async (job) => {
  const r: ResultPayload = job.data;
  if (r.messageId !== messageId) return; // ignore stale results

  console.log("\n" + "═".repeat(60));
  console.log("✅  ROUND-TRIP TEST PASSED");
  console.log("═".repeat(60));
  console.log(`   uid:    ${r.uid}`);
  console.log(`   reply:  ${r.reply}`);
  console.log("═".repeat(60) + "\n");
  passed = true;
  cleanup();
});

async function cleanup() {
  await taskWorker.close();
  await resultWorker.close();
  await redis.quit();
  process.exit(passed ? 0 : 1);
}

// Timeout guard
const timeout = setTimeout(() => {
  console.error("\n❌  ROUND-TRIP TEST FAILED — no reply within 5 s");
  console.error("   Is Redis running? Check REDIS_URL env var.\n");
  cleanup();
}, 5000);

async function main() {
  console.log("\n🧪 openclaw-platform round-trip test");
  console.log("   firing message:", TEST_CONTENT);

  await taskQueue.add("task", {
    uid:       TEST_UID,
    platform:  "feishu",
    channel:   "e2e_channel",
    messageId,
    content:   TEST_CONTENT,
  } satisfies TaskPayload);

  console.log("   waiting for result …");
}

main().catch(e => { console.error(e); process.exit(1); });

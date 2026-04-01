/**
 * STEP 2 — watch Result MQ for replies
 * npx ts-node --esm src/watch.ts
 *
 * Blocks and prints every ResultPayload that arrives on the result queue.
 * This replaces what channel-server would do (routing back to IM adapter).
 *
 * Press Ctrl+C to stop.
 */
import { createRedis, createResultWorker, ResultPayload } from "@openclaw/mq";

const redis = createRedis();

console.log("\n👂 watching Result MQ for replies … (Ctrl+C to stop)\n");

const worker = createResultWorker(redis, async (job) => {
  const r: ResultPayload = job.data;
  const ts = new Date().toISOString();

  console.log("─".repeat(60));
  console.log(`✅ RESULT received at ${ts}`);
  console.log(`   uid:       ${r.uid}`);
  console.log(`   platform:  ${r.platform}`);
  console.log(`   messageId: ${r.messageId}`);
  console.log(`   reply:\n\n     ${r.reply}\n`);
});

worker.on("error", e => console.error("❌ worker error:", e));
process.on("SIGINT", async () => {
  await worker.close();
  await redis.quit();
  process.exit(0);
});

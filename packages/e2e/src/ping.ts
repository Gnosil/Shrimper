/**
 * STEP 0 — sanity check
 * npx ts-node --esm src/ping.ts
 *
 * Just pings Redis and shows queue depths.
 * If this fails → Redis isn't up.
 */
import { createRedis, TASK_QUEUE, RESULT_QUEUE } from "@openclaw/mq";

const redis = createRedis();

async function main() {
  console.log("\n🔌 pinging Redis …");
  const pong = await redis.ping();
  console.log(`   Redis: ${pong}`);

  const taskDepth   = await redis.llen(`bull:${TASK_QUEUE}:wait`);
  const resultDepth = await redis.llen(`bull:${RESULT_QUEUE}:wait`);
  console.log(`   Task MQ depth:   ${taskDepth}`);
  console.log(`   Result MQ depth: ${resultDepth}`);
  console.log("\n✅ Redis OK\n");
  await redis.quit();
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });

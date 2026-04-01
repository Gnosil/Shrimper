/**
 * STEP 1 — inject a fake message into Task MQ
 * npx ts-node --esm src/fire.ts [message] [uid]
 *
 * Simulates what channel-server would do after receiving an IM message.
 * Run this WHILE worker-pool is running to see the full round trip.
 */
import { createRedis, createTaskQueue, TaskPayload } from "@openclaw/mq";
import crypto from "crypto";

const redis     = createRedis();
const taskQueue = createTaskQueue(redis);

const content   = process.argv[2] ?? "帮我查一下明天的天气";
const uid       = process.argv[3] ?? "feishu:test_user_001";
const messageId = crypto.randomUUID();

const payload: TaskPayload = {
  uid,
  platform:  uid.split(":")[0],
  channel:   "test_channel_001",
  messageId,
  content,
  agentId:   process.env.DEFAULT_AGENT_ID ?? "openclaw-default",
};

async function main() {
  console.log("\n🚀 firing test message into Task MQ …");
  console.log(`   uid:       ${payload.uid}`);
  console.log(`   content:   "${payload.content}"`);
  console.log(`   messageId: ${payload.messageId}`);

  const job = await taskQueue.add("task", payload, { priority: 2 });
  console.log(`\n✅ job enqueued: ${job.id}`);
  console.log("   → now watch your worker-pool logs for processing output");
  console.log("   → run 'watch.ts' in another terminal to catch the result\n");

  await redis.quit();
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });

/**
 * @openclaw/channel-server
 *
 * Deployment modes (set via env):
 *   LOCAL  — CHANNEL_MODE=local   → Telegram polling only, no public URL needed
 *   CLOUD  — CHANNEL_MODE=cloud   → All adapters, requires PUBLIC_URL for webhooks
 *   HYBRID — CHANNEL_MODE=hybrid  → Polling adapters run locally,
 *                                    webhook adapters point to a cloud instance
 *
 * The ONLY required external dependency is REDIS_URL.
 * Channel-server can run on laptop, VPS, or any cloud — as long as Redis is reachable.
 *
 * For local webhook development:
 *   npx ngrok http 3000          ← gets you a public URL
 *   PUBLIC_URL=https://abc.ngrok.io pnpm dev
 */

import express    from "express";
import { createRedis, createTaskQueue, createResultWorker, TaskPayload } from "@openclaw/mq";
import { SubscriptionService } from "@openclaw/subscription";
import { FeishuAdapter }   from "./adapters/feishu.js";
import { TelegramAdapter } from "./adapters/telegram.js";
import { DingTalkAdapter } from "./adapters/dingtalk.js";
import { IChannelAdapter, InboundMessage } from "./adapters/types.js";
import crypto from "crypto";

// ── Config ─────────────────────────────────────────────────────────────────
const PORT        = Number(process.env.CHANNEL_PORT  ?? 3000);
const MODE        = (process.env.CHANNEL_MODE        ?? "local") as "local" | "cloud" | "hybrid";
const PUBLIC_URL  = process.env.PUBLIC_URL            ?? "";   // needed for webhooks

// ── Infrastructure ─────────────────────────────────────────────────────────
const redis      = createRedis();
const taskQueue  = createTaskQueue(redis);
const subService = new SubscriptionService(redis);
const app        = express();
app.use(express.json());

// ── Adapters ───────────────────────────────────────────────────────────────
// polling = can run locally with no public URL
// webhook = needs PUBLIC_URL (cloud or ngrok)
const pollingAdapters: IChannelAdapter[] = [
  new TelegramAdapter(),   // uses Bot API long-polling
  // new DiscordGatewayAdapter(),
];

const webhookAdapters: IChannelAdapter[] = [
  new FeishuAdapter(),
  new DingTalkAdapter(),
  // new WeComAdapter(),
];

// Which adapters to activate based on MODE
const activeAdapters: IChannelAdapter[] = MODE === "local"
  ? pollingAdapters
  : MODE === "hybrid"
  ? [...pollingAdapters, ...webhookAdapters]   // all, but PUBLIC_URL must be set
  : [...pollingAdapters, ...webhookAdapters];  // cloud: same, but deployed with real URL

const adapterMap = new Map(activeAdapters.map(a => [a.platform, a]));

// ── Core message handler (shared by all adapters) ──────────────────────────
async function handleInbound(msg: InboundMessage) {
  const uid = `${msg.platform}:${msg.uid}`;

  if (!(await subService.isAllowed(uid))) {
    await adapterMap.get(msg.platform)?.send(msg.channel, msg.uid,
      "您的订阅已过期，请续费后继续使用。");
    return;
  }

  const payload: TaskPayload = {
    uid,
    platform:  msg.platform,
    channel:   msg.channel,
    messageId: msg.messageId ?? crypto.randomUUID(),
    content:   msg.content,
  };

  await taskQueue.add("task", payload, { priority: 2 });
  console.log(`[channel] queued → ${uid} "${msg.content.slice(0, 40)}"`);
}

// ── Webhook HTTP endpoints (for cloud/hybrid mode) ─────────────────────────
// Each webhook adapter registers its own route here.
// Feishu pushes to POST /webhook/feishu
// DingTalk pushes to POST /webhook/dingtalk  etc.
app.post("/webhook/:platform", async (req, res) => {
  const { platform } = req.params;
  const adapter = adapterMap.get(platform);
  if (!adapter || !("handleWebhook" in adapter)) {
    return res.status(404).json({ error: `no webhook adapter for ${platform}` });
  }
  try {
    // Each adapter parses the raw body into an InboundMessage
    const msg = await (adapter as any).handleWebhook(req);
    if (msg) await handleInbound(msg);
    res.json({ ok: true });
  } catch (e: any) {
    console.error(`[channel] webhook error (${platform}):`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// Health + deployment info
app.get("/health", (_, res) => res.json({
  ok: true,
  mode: MODE,
  publicUrl: PUBLIC_URL || "(not set — webhook adapters won't receive)",
  adapters: activeAdapters.map(a => a.platform),
}));

// ── Result MQ → route replies back to IM ───────────────────────────────────
createResultWorker(redis, async (job) => {
  const { platform, channel, uid, reply } = job.data;
  const rawUid  = uid.replace(`${platform}:`, "");
  const adapter = adapterMap.get(platform);
  if (!adapter) { console.error(`[channel] unknown platform: ${platform}`); return; }
  await adapter.send(channel, rawUid, reply);
  console.log(`[channel] delivered → ${uid}`);
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n[channel-server] ── mode: ${MODE.toUpperCase()} ──`);
  console.log(`[channel-server] HTTP :${PORT}  (health → GET /health)`);

  if (MODE !== "local") {
    if (!PUBLIC_URL) {
      console.warn("[channel-server] ⚠️  PUBLIC_URL not set — webhook adapters won't receive messages");
      console.warn("                    For local dev: npx ngrok http 3000");
    } else {
      webhookAdapters.forEach(a =>
        console.log(`[channel-server] webhook → ${PUBLIC_URL}/webhook/${a.platform}`)
      );
    }
  }

  // Start polling adapters (they connect outbound, no public URL needed)
  pollingAdapters.forEach(a => {
    if (activeAdapters.includes(a)) a.listen(handleInbound);
  });

  // Webhook adapters don't call listen() — they receive via HTTP POST above
  console.log(`[channel-server] adapters: ${activeAdapters.map(a => a.platform).join(", ")}\n`);
});

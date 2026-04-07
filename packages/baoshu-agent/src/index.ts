/**
 * @openclaw/baoshu-agent
 *
 * Express HTTP server — called by worker-pool via HttpAgentAdapter.
 *
 * POST /run              { uid, platform, channel, messageId, content, soul?, skills? }
 *                         → { reply: string }
 *
 * POST /webhook/wechat   WeChat Pay payment notification webhook
 *
 * GET  /health           { status: "ok", payment: "wechat" | "mock", model: string }
 */
import express, { Request, Response } from "express";
import IORedis from "ioredis";
import { ContextStore } from "./context.js";
import { runBaoshu } from "./agent.js";
import {
  handleWechatWebhook,
  handleStripeWebhook,
  isPaymentMockMode,
  getPaymentProvider,
} from "./payment.js";
import { logger } from "./logger.js";

const PORT = Number(process.env.BAOSHU_PORT ?? 3001);
const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
const ctx = new ContextStore(redis);

const app = express();

// Raw body parser for webhook routes (need signature verification)
app.use(express.raw({ type: "application/json", verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));

// Parse JSON for all routes EXCEPT webhooks
app.use((req, _res, next) => {
  const isWebhook = req.path === "/webhook/wechat" || req.path === "/webhook/stripe";
  if (!isWebhook && Buffer.isBuffer(req.body)) {
    req.body = JSON.parse(req.body.toString("utf-8"));
  }
  next();
});

// ── Agent endpoint ────────────────────────────────────────────────────────
app.post("/run", async (req: Request, res: Response) => {
  const { uid, content, soul } = req.body as {
    uid: string; content: string; soul?: string;
  };

  if (!uid || !content) {
    return res.status(400).json({ error: "uid and content are required" });
  }

  try {
    const reply = await runBaoshu({ uid, content, soul }, ctx);
    logger.info({ uid, replyLen: reply.length }, "[baoshu] replied");
    return res.json({ reply });
  } catch (err: any) {
    logger.error({ uid, err: err.message }, "[baoshu] run error");
    return res.status(500).json({ error: err.message });
  }
});

// ── WeChat Pay webhook ────────────────────────────────────────────────────
app.post("/webhook/wechat", async (req: Request, res: Response) => {
  try {
    const headers = Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k, String(v ?? "")])
    );
    const uid = await handleWechatWebhook(req.body as Buffer, headers);
    if (uid) logger.info({ uid }, "[payment] WeChat subscription activated via webhook");
    return res.json({ code: "SUCCESS", message: "成功" });
  } catch (err: any) {
    logger.error({ err: err.message }, "[payment] wechat webhook error");
    return res.status(400).json({ error: err.message });
  }
});

// ── Stripe webhook ────────────────────────────────────────────────────────
// T-19: POST /webhook/stripe route with raw body parser
app.post("/webhook/stripe", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["stripe-signature"] as string;
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    const rawBody = (req as any).rawBody as Buffer;
    const result = await handleStripeWebhook(rawBody, signature);

    if (result) {
      logger.info(
        { uid: result.uid, plan: result.plan },
        "[payment] Stripe subscription activated via webhook"
      );
    }

    return res.json({ received: true });
  } catch (err: any) {
    logger.error({ err: err.message }, "[payment] stripe webhook error");
    return res.status(400).json({ error: err.message });
  }
});

// ── Health ────────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  const provider = getPaymentProvider();
  res.json({
    status: "ok",
    agent: "baoshu",
    payment: provider,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  });
});

app.listen(PORT, () => {
  logger.info(`[baoshu-agent] listening on :${PORT}`);
  logger.info(`[baoshu-agent] model: ${process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6"}`);
  logger.info(`[baoshu-agent] payment: ${isPaymentMockMode() ? "MOCK (WeChat Pay not configured)" : "WeChat Pay LIVE"}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn("[baoshu-agent] ANTHROPIC_API_KEY not set — agent calls will fail");
  }
});

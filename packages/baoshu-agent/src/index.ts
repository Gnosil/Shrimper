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

// 导入新技能
import * as LeadGen from "./skills/leadgen/index.js";
import * as SalesCoach from "./skills/salescoach/index.js";

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
    skills: ["leadgen", "salescoach"],
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 获客技能 API (LeadGen Skill)
// ═══════════════════════════════════════════════════════════════════════════

// 生成内容
app.post("/skills/leadgen/content", async (req: Request, res: Response) => {
  try {
    const result = await LeadGen.generateContent(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, "[leadgen] content generation failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 批量生成多平台内容
app.post("/skills/leadgen/content/multi", async (req: Request, res: Response) => {
  try {
    const { topic, ipProfile } = req.body;
    const result = await LeadGen.generateMultiPlatformContent(topic, ipProfile);
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, "[leadgen] multi-platform content failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 创建线索
app.post("/skills/leadgen/leads", async (req: Request, res: Response) => {
  try {
    const { agentId, ...data } = req.body;
    const lead = await LeadGen.createLead(agentId, data);
    res.json({ success: true, data: lead });
  } catch (err: any) {
    logger.error({ err: err.message }, "[leadgen] create lead failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 批量导入线索
app.post("/skills/leadgen/leads/import", async (req: Request, res: Response) => {
  try {
    const { agentId, leads } = req.body;
    const result = await LeadGen.importLeads(agentId, leads);
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, "[leadgen] import leads failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取线索列表
app.get("/skills/leadgen/leads", async (req: Request, res: Response) => {
  try {
    const { agentId, status, intent, source } = req.query as any;
    const leads = await LeadGen.getLeadsByAgent(agentId, { status, intent, source });
    res.json({ success: true, data: leads });
  } catch (err: any) {
    logger.error({ err: err.message }, "[leadgen] get leads failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取线索详情
app.get("/skills/leadgen/leads/:id", async (req: Request, res: Response) => {
  try {
    const lead = await LeadGen.getLead(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: "Lead not found" });
    res.json({ success: true, data: lead });
  } catch (err: any) {
    logger.error({ err: err.message }, "[leadgen] get lead failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 生成Cold Message
app.post("/skills/leadgen/cold-message", async (req: Request, res: Response) => {
  try {
    const result = await LeadGen.generateColdMessage(req.body);
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, "[leadgen] generate cold message failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 培训技能 API (SalesCoach Skill)
// ═══════════════════════════════════════════════════════════════════════════

// 创建产品
app.post("/skills/salescoach/products", async (req: Request, res: Response) => {
  try {
    const product = await SalesCoach.createProduct(req.body);
    res.json({ success: true, data: product });
  } catch (err: any) {
    logger.error({ err: err.message }, "[salescoach] create product failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取产品列表
app.get("/skills/salescoach/products", async (_req: Request, res: Response) => {
  try {
    const products = await SalesCoach.listProducts();
    res.json({ success: true, data: products });
  } catch (err: any) {
    logger.error({ err: err.message }, "[salescoach] list products failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取产品详情
app.get("/skills/salescoach/products/:id", async (req: Request, res: Response) => {
  try {
    const product = await SalesCoach.getProduct(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: "Product not found" });
    res.json({ success: true, data: product });
  } catch (err: any) {
    logger.error({ err: err.message }, "[salescoach] get product failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 产品问答
app.post("/skills/salescoach/products/:id/ask", async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    const result = await SalesCoach.askProductQuestion(req.params.id, question);
    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err: err.message }, "[salescoach] ask question failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 从文本创建复盘报告
app.post("/skills/salescoach/reviews/text", async (req: Request, res: Response) => {
  try {
    const { agentId, transcript, leadId } = req.body;
    const report = await SalesCoach.createReviewFromTranscript(agentId, transcript, leadId);
    res.json({ success: true, data: report });
  } catch (err: any) {
    logger.error({ err: err.message }, "[salescoach] create review from text failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取复盘报告列表
app.get("/skills/salescoach/reviews", async (req: Request, res: Response) => {
  try {
    const { agentId } = req.query as any;
    const reviews = await SalesCoach.getReviewsByAgent(agentId);
    res.json({ success: true, data: reviews });
  } catch (err: any) {
    logger.error({ err: err.message }, "[salescoach] get reviews failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取能力趋势
app.get("/skills/salescoach/trends", async (req: Request, res: Response) => {
  try {
    const { agentId, limit } = req.query as any;
    const trends = await SalesCoach.getCapabilityTrend(agentId, Number(limit) || 10);
    res.json({ success: true, data: trends });
  } catch (err: any) {
    logger.error({ err: err.message }, "[salescoach] get trends failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  logger.info(`[baoshu-agent] listening on :${PORT}`);
  logger.info(`[baoshu-agent] model: ${process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6"}`);
  logger.info(`[baoshu-agent] payment: ${isPaymentMockMode() ? "MOCK (WeChat Pay not configured)" : "WeChat Pay LIVE"}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn("[baoshu-agent] ANTHROPIC_API_KEY not set — agent calls will fail");
  }
});

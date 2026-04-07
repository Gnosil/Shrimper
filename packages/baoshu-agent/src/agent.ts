/**
 * Main Baoshu agent conversation loop.
 *
 * Flow:
 *  1. Load history from ContextStore (5-turn ring buffer)
 *  2. Check payment intent → return payment link immediately if triggered
 *  3. Call Claude claude-sonnet-4-6 with SOUL + history + message
 *  4. Run compliance check on reply (keyword + MiniMax)
 *  5. Persist turns to ContextStore
 *  6. Return reply
 */
import Anthropic from "@anthropic-ai/sdk";
import { ContextStore, Turn } from "./context.js";
import { keywordCheck, minimaxAudit } from "./compliance.js";
import { detectPaymentIntent, createPaymentLink } from "./payment.js";
import { logger } from "./logger.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DEFAULT_SOUL = `你是保叔，一位专业的AI保险经纪人助手。
你帮助用户理解保险产品、分析保险需求、解答保险疑问。
你的回答简洁、专业、友好，始终遵守中国保险销售合规要求。
绝不承诺"保本保收益"，绝不误导销售。`;

export interface RunInput {
  uid:     string;
  content: string;
  soul?:   string;
}

export async function runBaoshu(input: RunInput, ctx: ContextStore): Promise<string> {
  const { uid, content, soul } = input;

  // ── 1. Check payment intent before LLM call ───────────────────────────────
  const plan = detectPaymentIntent(content);
  if (plan) {
    try {
      const { url, isMock } = await createPaymentLink({ uid, plan });
      const planLabel = plan === "annual" ? "年度会员" : "月度会员";
      const suffix    = isMock ? "\n\n（支付功能开发中，敬请期待）" : "";
      return `您好！点击下方链接完成${planLabel}订阅：\n${url}${suffix}\n\n订阅后即可无限次使用保叔AI助手。`;
    } catch (err) {
      logger.error({ uid, err }, "[agent] payment link creation failed");
      // Fall through to normal reply
    }
  }

  // ── 2. Load conversation history ──────────────────────────────────────────
  const history = await ctx.getHistory(uid);
  const messages: Anthropic.MessageParam[] = [
    ...history.map(t => ({ role: t.role, content: t.content } as Anthropic.MessageParam)),
    { role: "user", content },
  ];

  // ── 3. Call Claude ────────────────────────────────────────────────────────
  const response = await anthropic.messages.create({
    model:      process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 1024,
    system:     soul ?? DEFAULT_SOUL,
    messages,
  });

  const reply = response.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("");

  // ── 4. Compliance check ───────────────────────────────────────────────────
  const kwResult = keywordCheck(reply);
  if (kwResult.blocked) {
    logger.warn({ uid, reason: kwResult.reason }, "[agent] reply blocked by keyword filter");
    return "抱歉，我无法回答该问题。如需了解更多，请联系您的专属客户经理。";
  }

  const mmResult = await minimaxAudit(reply);
  if (mmResult.blocked) {
    logger.warn({ uid, reason: mmResult.reason }, "[agent] reply blocked by MiniMax audit");
    return "抱歉，我无法提供相关建议。请咨询持牌保险顾问获取专业意见。";
  }

  // ── 5. Persist conversation turns ─────────────────────────────────────────
  await ctx.push(uid, { role: "user",      content });
  await ctx.push(uid, { role: "assistant", content: reply });

  return reply;
}

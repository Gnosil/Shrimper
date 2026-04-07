/**
 * Main Baoshu agent conversation loop.
 *
 * Flow:
 *  1. Check subscription / paywall (T-20)
 *  2. Classify intent (T-08) → if "付费咨询" trigger payment
 *  3. Load history from ContextStore (5-turn ring buffer)
 *  4. Call Claude claude-sonnet-4-6 with SOUL + history + message
 *  5. Run compliance check on reply (keyword + MiniMax)
 *  6. Persist turns to ContextStore
 *  7. Return reply
 */
import Anthropic from "@anthropic-ai/sdk";
import { ContextStore, Turn } from "./context.js";
import { keywordCheck, minimaxAudit } from "./compliance.js";
import {
  detectPaymentIntent,
  createPaymentLink,
  isSubscribed,
  activateSubscription,
} from "./payment.js";
import { classifyIntent, Intent } from "./minimax.js";
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

// Free tier: 3 messages per user
const FREE_MESSAGE_LIMIT = 3;
const userMessageCounts = new Map<string, number>();

export async function runBaoshu(input: RunInput, ctx: ContextStore): Promise<string> {
  const { uid, content, soul } = input;

  // ── 1. Check subscription / paywall (T-20) ────────────────────────────────
  const subscribed = isSubscribed(uid);
  const messageCount = userMessageCounts.get(uid) ?? 0;

  if (!subscribed && messageCount >= FREE_MESSAGE_LIMIT) {
    // User has exhausted free tier
    logger.info({ uid, messageCount }, "[agent] free tier exhausted, requesting payment");
    return buildPaywallMessage();
  }

  // ── 2. Intent classification & payment trigger ────────────────────────────
  const intent = await classifyIntent(content);
  logger.debug({ uid, intent }, "[agent] intent classified");

  if (intent === "付费咨询") {
    const plan = detectPaymentIntent(content) ?? "monthly";
    try {
      const { url } = await createPaymentLink({ uid, plan });
      return buildPaymentPrompt(plan, url);
    } catch (err) {
      logger.error({ uid, err }, "[agent] payment link creation failed");
      // Fall through to normal reply
    }
  }

  // Also check explicit payment triggers (backward compatibility)
  const plan = detectPaymentIntent(content);
  if (plan) {
    try {
      const { url } = await createPaymentLink({ uid, plan });
      return buildPaymentPrompt(plan, url);
    } catch (err) {
      logger.error({ uid, err }, "[agent] payment link creation failed");
    }
  }

  // ── 3. Load conversation history ──────────────────────────────────────────
  const history = await ctx.getHistory(uid);
  const messages: Anthropic.MessageParam[] = [
    ...history.map(t => ({ role: t.role, content: t.content } as Anthropic.MessageParam)),
    { role: "user", content },
  ];

  // ── 4. Call Claude ────────────────────────────────────────────────────────
  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 1024,
    system: soul ?? DEFAULT_SOUL,
    messages,
  });

  const reply = response.content
    .filter(b => b.type === "text")
    .map(b => (b as { type: "text"; text: string }).text)
    .join("");

  // ── 5. Compliance check ───────────────────────────────────────────────────
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

  // ── 6. Persist conversation turns ─────────────────────────────────────────
  await ctx.push(uid, { role: "user", content });
  await ctx.push(uid, { role: "assistant", content: reply });

  // ── 7. Update message count for free tier tracking ────────────────────────
  if (!subscribed) {
    userMessageCounts.set(uid, messageCount + 1);
  }

  return reply;
}

// ── Helper functions ────────────────────────────────────────────────────────

function buildPaywallMessage(): string {
  return `🔒 您已使用完免费额度（${FREE_MESSAGE_LIMIT}条消息）

升级会员后可享受：
• 无限次保险咨询
• 个性化方案推荐
• 理赔协助指导
• 7×24小时在线

发送"订阅"或"购买"查看会员套餐。`;
}

function buildPaymentPrompt(plan: "monthly" | "annual", url: string): string {
  const planLabel = plan === "annual" ? "年度会员" : "月度会员";
  return `您好！点击下方链接完成${planLabel}订阅：

${url}

订阅后即可无限次使用保叔AI助手。`;
}

// Export for testing
export { userMessageCounts, FREE_MESSAGE_LIMIT };

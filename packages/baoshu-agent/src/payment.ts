/**
 * Payment integration — Stripe Checkout + WeChat Pay (微信支付)
 *
 * MVP: Stripe Checkout (global, fast setup)
 * Fallback: WeChat Pay when merchant credentials are approved
 *
 * Triggers: agent detects user says "购买", "订阅", "付款", "buy", "subscribe"
 */
import { logger } from "./logger.js";

export type Plan = "monthly" | "annual";

export interface PaymentLink {
  url: string;
  plan: Plan;
  isMock: boolean;
  provider: "stripe" | "wechat" | "mock";
}

// ── Config ────────────────────────────────────────────────────────────────────
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY ?? "";
const STRIPE_PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL ?? "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

const WECHAT_MCH_ID = process.env.WECHAT_MCH_ID ?? "";
const WECHAT_MCH_KEY = process.env.WECHAT_MCH_KEY ?? "";

const APP_URL = process.env.APP_URL ?? "http://localhost:3001";

// Determine payment provider
const USE_STRIPE = STRIPE_SECRET_KEY && STRIPE_PRICE_MONTHLY && STRIPE_PRICE_ANNUAL;
const USE_WECHAT = WECHAT_MCH_ID && WECHAT_MCH_KEY;
const MOCK_MODE = !USE_STRIPE && !USE_WECHAT;

// Subscription prices (for display)
export const PRICE_DISPLAY = {
  monthly: "¥29",
  annual: "¥299",
};

// ── In-memory subscription store (MVP) ────────────────────────────────────────
const subscriptions = new Map<string, { plan: Plan; activatedAt: Date }>();

export function isSubscribed(uid: string): boolean {
  return subscriptions.has(uid);
}

export function getSubscription(uid: string): { plan: Plan; activatedAt: Date } | null {
  return subscriptions.get(uid) ?? null;
}

export function activateSubscription(uid: string, plan: Plan): void {
  subscriptions.set(uid, { plan, activatedAt: new Date() });
  logger.info({ uid, plan }, "[payment] Subscription activated");
}

// ── Stripe Integration ────────────────────────────────────────────────────────

/**
 * Create Stripe Checkout payment link
 * T-17: createPaymentLink()
 */
export async function createPaymentLink(opts: {
  uid: string;
  plan: Plan;
}): Promise<PaymentLink> {
  if (MOCK_MODE) {
    logger.warn({ uid: opts.uid, plan: opts.plan }, "[payment] MOCK MODE — returning placeholder URL");
    const mockUrl = `${APP_URL}/payment/mock?uid=${encodeURIComponent(opts.uid)}&plan=${opts.plan}`;
    return { url: mockUrl, plan: opts.plan, isMock: true, provider: "mock" };
  }

  if (!USE_STRIPE) {
    throw new Error("Stripe not configured — set STRIPE_SECRET_KEY and STRIPE_PRICE_*");
  }

  // Dynamic import to avoid requiring stripe when not configured
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  const priceId = opts.plan === "annual" ? STRIPE_PRICE_ANNUAL : STRIPE_PRICE_MONTHLY;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/payment/success?uid=${opts.uid}&plan=${opts.plan}`,
    cancel_url: `${APP_URL}/payment/cancel`,
    metadata: {
      feishu_open_id: opts.uid,
      plan: opts.plan,
    },
    subscription_data: {
      metadata: {
        feishu_open_id: opts.uid,
        plan: opts.plan,
      },
    },
  });

  return {
    url: session.url!,
    plan: opts.plan,
    isMock: false,
    provider: "stripe",
  };
}

/**
 * Handle Stripe webhook
 * T-18: handleWebhook()
 */
export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string
): Promise<{ uid: string; plan: Plan } | null> {
  if (MOCK_MODE) {
    // Mock: parse mock callback (for dev testing)
    try {
      const data = JSON.parse(rawBody.toString("utf-8")) as {
        event_type?: string;
        uid?: string;
        plan?: Plan;
      };
      if (data.event_type === "checkout.session.completed" && data.uid) {
        logger.info({ uid: data.uid }, "[payment] mock subscription activated");
        return { uid: data.uid, plan: data.plan ?? "monthly" };
      }
    } catch { /* ignore */ }
    return null;
  }

  if (!USE_STRIPE || !STRIPE_WEBHOOK_SECRET) {
    logger.error("[payment] Stripe webhook secret not configured");
    return null;
  }

  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as {
        metadata?: { feishu_open_id?: string; plan?: string };
      };
      const uid = session.metadata?.feishu_open_id;
      const plan = (session.metadata?.plan as Plan) ?? "monthly";

      if (uid) {
        logger.info({ uid, plan, event: event.type }, "[payment] Stripe subscription confirmed");
        return { uid, plan };
      }
    }

    return null;
  } catch (err) {
    logger.error({ error: String(err) }, "[payment] Stripe webhook error");
    throw new Error(`Webhook error: ${err}`);
  }
}

// ── WeChat Pay webhook handler ────────────────────────────────────────────────
// Called by POST /webhook/wechat
// Returns uid (open_id) so caller can activate subscription
export async function handleWechatWebhook(
  rawBody: Buffer,
  headers: Record<string, string>
): Promise<string | null> {
  if (MOCK_MODE) {
    // Mock: parse mock callback (for dev testing)
    try {
      const data = JSON.parse(rawBody.toString("utf-8")) as {
        event_type?: string;
        uid?: string;
      };
      if (data.event_type === "TRANSACTION.SUCCESS" && data.uid) {
        logger.info({ uid: data.uid }, "[payment] mock subscription activated");
        return data.uid;
      }
    } catch { /* ignore */ }
    return null;
  }

  // TODO: Verify WeChat Pay signature and decrypt notification when live
  logger.error("[payment] WeChat Pay webhook handler not implemented");
  return null;
}

// ── Payment intent detection ───────────────────────────────────────────────────
const PAYMENT_TRIGGERS = ["购买", "订阅", "付款", "续费", "buy", "subscribe", "payment", "价格", "多少钱", "开通"];

export function detectPaymentIntent(text: string): Plan | null {
  const lower = text.toLowerCase();
  if (!PAYMENT_TRIGGERS.some(t => lower.includes(t))) return null;
  return lower.includes("年") || lower.includes("annual") ? "annual" : "monthly";
}

export function isPaymentMockMode(): boolean {
  return MOCK_MODE;
}

export function getPaymentProvider(): "stripe" | "wechat" | "mock" {
  if (USE_STRIPE) return "stripe";
  if (USE_WECHAT) return "wechat";
  return "mock";
}

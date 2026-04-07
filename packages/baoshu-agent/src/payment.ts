/**
 * Payment integration — WeChat Pay (微信支付)
 *
 * MVP: Mock mode — returns a placeholder URL until merchant credentials are approved.
 * When WECHAT_MCH_ID and WECHAT_API_V3_KEY are set, switches to real WeChat Pay JSAPI.
 *
 * Triggers: agent detects user says "购买", "订阅", "付款", "buy", "subscribe"
 *
 * TODO: Replace MOCK_MODE with real WxPay SDK call once merchant account is approved.
 */
import { logger } from "./logger.js";

export type Plan = "monthly" | "annual";

export interface PaymentLink {
  url:    string;
  plan:   Plan;
  isMock: boolean;
}

// ── Config ────────────────────────────────────────────────────────────────────
const MCH_ID      = process.env.WECHAT_MCH_ID     ?? "";
const API_V3_KEY  = process.env.WECHAT_API_V3_KEY ?? "";
const NOTIFY_URL  = process.env.WECHAT_NOTIFY_URL ?? `${process.env.APP_URL ?? "http://localhost:3001"}/webhook/wechat`;
const APP_URL     = process.env.APP_URL            ?? "http://localhost:3001";

// Mock mode: active when merchant credentials are absent
const MOCK_MODE   = !MCH_ID || !API_V3_KEY;

// Subscription prices (CNY fen, 1 CNY = 100 fen)
const PRICE_MONTHLY = Number(process.env.WECHAT_PRICE_MONTHLY ?? 2900);   // ¥29
const PRICE_ANNUAL  = Number(process.env.WECHAT_PRICE_ANNUAL  ?? 29900);  // ¥299

export async function createPaymentLink(opts: {
  uid:  string;
  plan: Plan;
}): Promise<PaymentLink> {
  if (MOCK_MODE) {
    logger.warn({ uid: opts.uid, plan: opts.plan }, "[payment] MOCK MODE — returning placeholder URL");
    const mockUrl = `${APP_URL}/payment/mock?uid=${encodeURIComponent(opts.uid)}&plan=${opts.plan}`;
    return { url: mockUrl, plan: opts.plan, isMock: true };
  }

  // ── Real WeChat Pay JSAPI ─────────────────────────────────────────────────
  // TODO: Uncomment and install wechatpay-node-v3 when merchant account approved
  //
  // const pay = new WxPay({
  //   appid:  process.env.WECHAT_APP_ID!,
  //   mchid:  MCH_ID,
  //   serial: process.env.WECHAT_CERT_SERIAL!,
  //   privateKey: fs.readFileSync(process.env.WECHAT_PRIVATE_KEY_PATH!),
  //   apiV3Key: API_V3_KEY,
  // });
  //
  // const amount = opts.plan === "annual" ? PRICE_ANNUAL : PRICE_MONTHLY;
  // const result = await pay.transactions_native({
  //   description: opts.plan === "annual" ? "保叔AI年度会员" : "保叔AI月度会员",
  //   out_trade_no: `baoshu_${opts.uid}_${Date.now()}`,
  //   notify_url: NOTIFY_URL,
  //   amount: { total: amount, currency: "CNY" },
  // });
  // return { url: result.data.code_url, plan: opts.plan, isMock: false };

  throw new Error("WeChat Pay not configured — set WECHAT_MCH_ID and WECHAT_API_V3_KEY");
}

// ── WeChat Pay webhook handler ────────────────────────────────────────────────
// Called by POST /webhook/wechat
// Returns uid (open_id) so caller can activate subscription
export async function handleWechatWebhook(rawBody: Buffer, headers: Record<string, string>): Promise<string | null> {
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
  // const pay = getWxPayClient();
  // const verified = await pay.verifySign({ ... headers });
  // if (!verified) throw new Error("WeChat Pay signature verification failed");
  // const decrypted = pay.decipher_gcm(resource.ciphertext, resource.associated_data, resource.nonce, API_V3_KEY);
  // return decrypted.payer?.openid ?? null;

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

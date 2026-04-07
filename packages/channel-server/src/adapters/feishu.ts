import { IChannelAdapter, InboundMessage } from "./types.js";
import crypto from "crypto";

/**
 * Feishu (Lark) adapter — WEBHOOK mode
 *
 * Register in Feishu Open Platform:
 *   Event URL: {PUBLIC_URL}/webhook/feishu
 *   Event type: im.message.receive_v1
 *
 * Required env vars:
 *   FEISHU_APP_ID              App ID from Feishu Open Platform
 *   FEISHU_APP_SECRET          App Secret
 *   FEISHU_VERIFICATION_TOKEN  Encrypt verification token (for signature check)
 *
 * Docs: https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/im-v1/message/events/receive
 */

const APP_ID     = process.env.FEISHU_APP_ID     ?? "";
const APP_SECRET = process.env.FEISHU_APP_SECRET  ?? "";
const VER_TOKEN  = process.env.FEISHU_VERIFICATION_TOKEN ?? "";

// ── Tenant Access Token cache ─────────────────────────────────────────────
let _tokenCache: { token: string; expiresAt: number } | null = null;

async function getTenantAccessToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.token;
  }

  const res = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });

  const data = await res.json() as { tenant_access_token: string; expire: number };
  _tokenCache = {
    token:     data.tenant_access_token,
    expiresAt: now + data.expire * 1000,
  };
  return _tokenCache.token;
}

// ── Signature verification ────────────────────────────────────────────────
function verifyFeishuSignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string
): boolean {
  if (!VER_TOKEN) return true; // skip if not configured
  const str = timestamp + nonce + VER_TOKEN + body;
  const expected = crypto.createHash("sha256").update(str).digest("hex");
  return expected === signature;
}

export class FeishuAdapter implements IChannelAdapter {
  platform = "feishu";

  /** Called by Express POST /webhook/feishu */
  async handleWebhook(req: any): Promise<InboundMessage | null> {
    const body      = req.body;
    const rawBody   = JSON.stringify(body);
    const timestamp = req.headers["x-lark-request-timestamp"] ?? "";
    const nonce     = req.headers["x-lark-request-nonce"]     ?? "";
    const signature = req.headers["x-lark-signature"]         ?? "";

    if (VER_TOKEN && !verifyFeishuSignature(timestamp, nonce, rawBody, signature)) {
      console.warn("[feishu] signature verification failed");
      return null;
    }

    // Feishu challenge handshake (one-time verification)
    if (body.type === "url_verification") {
      // Express will handle sending { challenge } via the webhook route
      // We signal this by returning a special shape
      (req as any).__feishuChallenge = body.challenge;
      return null;
    }

    const event  = body?.event;
    if (!event?.message) return null;

    const msg    = event.message;
    const sender = event.sender?.sender_id;

    // Parse message content — Feishu wraps text in JSON: { text: "..." }
    let content = "";
    try {
      content = JSON.parse(msg.content ?? "{}").text ?? "";
    } catch {
      content = msg.content ?? "";
    }

    if (!content.trim()) return null;

    return {
      platform:  "feishu",
      channel:   msg.chat_id,
      uid:       sender?.open_id ?? sender?.user_id ?? "unknown",
      messageId: msg.message_id,
      content:   content.trim(),
      raw:       body,
    };
  }

  /** Send a text reply back to a Feishu chat */
  async send(channel: string, uid: string, reply: string): Promise<void> {
    if (!APP_ID || !APP_SECRET) {
      console.log(`[feishu] (no credentials) → ${uid}@${channel}: ${reply}`);
      return;
    }

    try {
      const token = await getTenantAccessToken();
      const res = await fetch("https://open.feishu.cn/open-apis/im/v1/messages", {
        method: "POST",
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receive_id:      channel,
          receive_id_type: "chat_id",
          msg_type:        "text",
          content:         JSON.stringify({ text: reply }),
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`[feishu] send failed (${res.status}): ${err}`);
      } else {
        console.log(`[feishu] → ${uid}@${channel} (${reply.length} chars)`);
      }
    } catch (err) {
      console.error("[feishu] send error:", err);
    }
  }
}

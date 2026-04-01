import { IChannelAdapter, InboundMessage } from "./types.js";
import crypto from "crypto";

/**
 * Feishu (Lark) adapter — WEBHOOK mode
 *
 * Register in Feishu Open Platform:
 *   Event URL: {PUBLIC_URL}/webhook/feishu
 *   Event type: im.message.receive_v1
 *
 * Docs: https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/im-v1/message/events/receive
 */
export class FeishuAdapter implements IChannelAdapter {
  platform = "feishu";

  /** Called by Express POST /webhook/feishu */
  async handleWebhook(req: any): Promise<InboundMessage | null> {
    const body = req.body;

    // Feishu challenge handshake (one-time verification)
    if (body.type === "url_verification") {
      // Express will send res.json({ challenge: body.challenge }) upstream
      return null;
    }

    // TODO: verify signature
    // const sig = req.headers["x-lark-signature"];
    // verifyFeishuSignature(sig, body, process.env.FEISHU_VERIFICATION_TOKEN);

    const event = body?.event;
    if (!event?.message) return null;

    const msg = event.message;
    const sender = event.sender?.sender_id;

    return {
      platform:  "feishu",
      channel:   msg.chat_id,
      uid:       sender?.open_id ?? sender?.user_id ?? "unknown",
      messageId: msg.message_id,
      content:   JSON.parse(msg.content ?? "{}").text ?? "",
      raw:       body,
    };
  }

  async send(channel: string, uid: string, reply: string) {
    // TODO: POST https://open.feishu.cn/open-apis/im/v1/messages
    // Headers: { Authorization: `Bearer ${await getAccessToken()}` }
    // Body: { receive_id: channel, receive_id_type: "chat_id", msg_type: "text", content: JSON.stringify({ text: reply }) }
    console.log(`[feishu] → ${uid}@${channel}: ${reply}`);
  }
}

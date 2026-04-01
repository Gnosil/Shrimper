import { IChannelAdapter, InboundMessage } from "./types.js";

/**
 * Telegram adapter — POLLING mode (long-polling Bot API)
 *
 * No public URL needed. Works fully locally.
 * Set env: TELEGRAM_BOT_TOKEN=your_bot_token
 *
 * To switch to webhook mode for production:
 *   POST https://api.telegram.org/bot{TOKEN}/setWebhook?url={PUBLIC_URL}/webhook/telegram
 */
export class TelegramAdapter implements IChannelAdapter {
  platform = "telegram";
  private token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  private offset = 0;

  listen(onMessage: (msg: InboundMessage) => Promise<void>) {
    if (!this.token) {
      console.warn("[telegram] TELEGRAM_BOT_TOKEN not set — adapter disabled");
      return;
    }
    console.log("[telegram] polling started");
    this.poll(onMessage);
  }

  private async poll(onMessage: (msg: InboundMessage) => Promise<void>) {
    while (true) {
      try {
        const url = `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.offset}&timeout=30`;
        const res  = await fetch(url);
        const data = await res.json() as any;

        for (const update of data.result ?? []) {
          this.offset = update.update_id + 1;
          const msg = update.message ?? update.channel_post;
          if (!msg?.text) continue;

          await onMessage({
            platform:  "telegram",
            channel:   String(msg.chat.id),
            uid:       String(msg.from?.id ?? msg.chat.id),
            messageId: String(msg.message_id),
            content:   msg.text,
            raw:       update,
          });
        }
      } catch (e: any) {
        console.error("[telegram] poll error:", e.message);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  async send(channel: string, _uid: string, reply: string) {
    if (!this.token) return;
    await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channel, text: reply }),
    });
  }
}

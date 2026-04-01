import { IChannelAdapter, InboundMessage } from "./types.js";

/** DingTalk (钉钉) adapter — stub */
export class DingTalkAdapter implements IChannelAdapter {
  platform = "dingtalk";
  listen(_onMessage: (msg: InboundMessage) => Promise<void>) {
    console.log("[dingtalk] adapter ready (implement webhook handler)");
  }
  async send(channel: string, uid: string, reply: string) {
    console.log(`[dingtalk] → ${uid}@${channel}: ${reply}`);
  }
}

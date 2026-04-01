export interface InboundMessage {
  platform: string;
  channel: string;
  uid: string;
  messageId: string;
  content: string;
  raw?: unknown;
}

export interface IChannelAdapter {
  platform: string;
  /** Polling adapters implement this — called once on startup */
  listen?(onMessage: (msg: InboundMessage) => Promise<void>): void;
  /** Webhook adapters implement this — called on each POST /webhook/:platform */
  handleWebhook?(req: any): Promise<InboundMessage | null>;
  /** Send a reply back to the user */
  send(channel: string, uid: string, reply: string): Promise<void>;
}

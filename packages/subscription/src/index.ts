import IORedis from "ioredis";

export type SubTier = "free" | "pro" | "enterprise" | "internal";
export interface SubRecord { uid: string; tier: SubTier; quota: number; expiresAt: number; }

export class SubscriptionService {
  constructor(private redis: IORedis) {}
  private key(uid: string) { return `sub:${uid}`; }

  async get(uid: string): Promise<SubRecord> {
    const cached = await this.redis.get(this.key(uid));
    if (cached) return JSON.parse(cached);
    // TODO: query your billing DB here
    const record: SubRecord = { uid, tier: "free", quota: 50, expiresAt: 0 };
    await this.redis.set(this.key(uid), JSON.stringify(record), "EX", 300);
    return record;
  }

  async isAllowed(uid: string): Promise<boolean> {
    const sub = await this.get(uid);
    return sub.expiresAt === 0 || sub.expiresAt > Date.now();
  }

  async invalidate(uid: string) { await this.redis.del(this.key(uid)); }
}

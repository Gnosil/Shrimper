/**
 * Per-user conversation context — 5-turn ring buffer backed by Redis.
 *
 * Key: baoshu:ctx:{uid}   Type: Redis List (LPUSH + LTRIM)
 * Each entry is JSON: { role: "user"|"assistant", content: string }
 */
import IORedis from "ioredis";

export interface Turn {
  role:    "user" | "assistant";
  content: string;
}

const MAX_TURNS = 10; // 5 user + 5 assistant = 10 entries

function key(uid: string) { return `baoshu:ctx:${uid}`; }

export class ContextStore {
  constructor(private readonly redis: IORedis) {}

  async push(uid: string, turn: Turn): Promise<void> {
    const k = key(uid);
    await this.redis.lpush(k, JSON.stringify(turn));
    await this.redis.ltrim(k, 0, MAX_TURNS - 1);
    await this.redis.expire(k, 60 * 60 * 24); // 24h TTL
  }

  async getHistory(uid: string): Promise<Turn[]> {
    const items = await this.redis.lrange(key(uid), 0, MAX_TURNS - 1);
    // List is newest-first (LPUSH), reverse so oldest is first for API calls
    return items.map(i => JSON.parse(i) as Turn).reverse();
  }

  async clear(uid: string): Promise<void> {
    await this.redis.del(key(uid));
  }
}

/**
 * Unit tests: context.ts (ContextStore)
 *
 * Uses ioredis-mock to avoid requiring a real Redis instance.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ContextStore, Turn } from "../context.js";

// ── In-memory Redis mock ───────────────────────────────────────────────────
// We implement a minimal Map-based mock to avoid ioredis-mock peer dep issues
class MockRedis {
  private store = new Map<string, string[]>();

  async lpush(key: string, value: string): Promise<number> {
    const list = this.store.get(key) ?? [];
    list.unshift(value);
    this.store.set(key, list);
    return list.length;
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const list = this.store.get(key) ?? [];
    this.store.set(key, list.slice(start, stop + 1));
  }

  async expire(_key: string, _seconds: number): Promise<void> { /* no-op */ }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.store.get(key) ?? [];
    return list.slice(start, stop === -1 ? undefined : stop + 1);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe("ContextStore", () => {
  let store: ContextStore;

  beforeEach(() => {
    store = new ContextStore(new MockRedis() as any);
  });

  it("stores and retrieves turns in chronological order", async () => {
    await store.push("u1", { role: "user",      content: "你好" });
    await store.push("u1", { role: "assistant", content: "您好！" });

    const history = await store.getHistory("u1");
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ role: "user",      content: "你好" });
    expect(history[1]).toEqual({ role: "assistant", content: "您好！" });
  });

  it("keeps history isolated per uid", async () => {
    await store.push("alice", { role: "user", content: "问题A" });
    await store.push("bob",   { role: "user", content: "问题B" });

    expect(await store.getHistory("alice")).toHaveLength(1);
    expect(await store.getHistory("bob")).toHaveLength(1);
    expect((await store.getHistory("alice"))[0].content).toBe("问题A");
  });

  it("enforces 10-entry ring buffer (5 turns)", async () => {
    // Push 12 turns (6 user + 6 assistant = 12 messages)
    for (let i = 0; i < 6; i++) {
      await store.push("u2", { role: "user",      content: `Q${i}` });
      await store.push("u2", { role: "assistant", content: `A${i}` });
    }
    const history = await store.getHistory("u2");
    expect(history.length).toBeLessThanOrEqual(10);
  });

  it("clears history for a uid", async () => {
    await store.push("u3", { role: "user", content: "test" });
    await store.clear("u3");
    const history = await store.getHistory("u3");
    expect(history).toHaveLength(0);
  });

  it("returns empty array for unknown uid", async () => {
    const history = await store.getHistory("nobody");
    expect(history).toHaveLength(0);
  });
});

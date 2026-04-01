import IORedis from "ioredis";

// ── Types ──────────────────────────────────────────────────────────────────

export const AGENT_TYPES = ["openclaw", "openai", "anthropic", "http"] as const;
export type AgentType = typeof AGENT_TYPES[number];

export interface AgentConfig {
  id:              string;
  name:            string;
  type:            AgentType;
  endpoint?:       string;        // required for type="http"
  // TODO: encrypt apiKey at rest before storing in Redis
  apiKey?:         string;
  model?:          string;        // e.g. "gpt-4o", "claude-opus-4-6"
  capabilities:    string[];      // ["chat", "code", "vision"]
  maxConcurrency?: number;
  enabled:         boolean;
  createdAt:       number;        // Unix ms — set on first register, never overwritten
  updatedAt:       number;        // Unix ms — set on every write
}

export class AgentNotFoundError extends Error {
  constructor(id: string) {
    super(`Agent not found: "${id}"`);
    this.name = "AgentNotFoundError";
  }
}

export class AgentDisabledError extends Error {
  constructor(id: string) {
    super(`Agent is disabled: "${id}"`);
    this.name = "AgentDisabledError";
  }
}

// ── Redis Keys ─────────────────────────────────────────────────────────────
//
//   openclaw:agents           HASH   field=agentId  value=JSON(AgentConfig)
//   openclaw:agents:default   STRING stores the default agentId
//
const AGENTS_HASH_KEY = "openclaw:agents";
const DEFAULT_KEY     = "openclaw:agents:default";

// ── Registry ───────────────────────────────────────────────────────────────

export class AgentRegistry {
  constructor(private readonly redis: IORedis) {}

  /**
   * Create or update an agent.
   * createdAt is preserved on updates; updatedAt is always set to now.
   */
  async register(cfg: Omit<AgentConfig, "createdAt" | "updatedAt">): Promise<AgentConfig> {
    const now      = Date.now();
    const existing = await this.get(cfg.id);
    const full: AgentConfig = {
      ...cfg,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.redis.hset(AGENTS_HASH_KEY, cfg.id, JSON.stringify(full));
    return full;
  }

  async get(id: string): Promise<AgentConfig | null> {
    const raw = await this.redis.hget(AGENTS_HASH_KEY, id);
    return raw ? (JSON.parse(raw) as AgentConfig) : null;
  }

  /**
   * Like get(), but throws AgentNotFoundError or AgentDisabledError.
   * Use this in hot paths (worker job handler) for fail-fast behaviour.
   */
  async getOrThrow(id: string): Promise<AgentConfig> {
    const cfg = await this.get(id);
    if (!cfg)         throw new AgentNotFoundError(id);
    if (!cfg.enabled) throw new AgentDisabledError(id);
    return cfg;
  }

  async list(): Promise<AgentConfig[]> {
    const all = await this.redis.hgetall(AGENTS_HASH_KEY);
    return Object.values(all).map(raw => JSON.parse(raw) as AgentConfig);
  }

  async remove(id: string): Promise<void> {
    await this.redis.hdel(AGENTS_HASH_KEY, id);
  }

  /** Set the default agent. Verifies the agent exists first. */
  async setDefault(id: string): Promise<void> {
    if (!(await this.get(id))) throw new AgentNotFoundError(id);
    await this.redis.set(DEFAULT_KEY, id);
  }

  async getDefaultId(): Promise<string | null> {
    return this.redis.get(DEFAULT_KEY);
  }

  async getDefault(): Promise<AgentConfig | null> {
    const id = await this.getDefaultId();
    return id ? this.get(id) : null;
  }

  /** Enable or disable an agent. Delegates to register() to keep write logic in one place. */
  async setEnabled(id: string, enabled: boolean): Promise<AgentConfig> {
    const cfg = await this.get(id);
    if (!cfg) throw new AgentNotFoundError(id);
    return this.register({ ...cfg, enabled });
  }
}

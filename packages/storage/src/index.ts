/**
 * @openclaw/storage
 * Per-UID file isolation.
 *   - LocalStorage: default, uses local FS / NAS
 *   - CosStorage:   activated when COS_BUCKET env var is set
 *
 * createStorage() returns the right adapter automatically.
 */
import path from "path";
import fs from "fs-extra";

export interface IStorageAdapter {
  userDir(uid: string): string;
  readFile(uid: string, rel: string): Promise<string>;
  writeFile(uid: string, rel: string, content: string): Promise<void>;
  listFiles(uid: string, subdir?: string): Promise<string[]>;
  ensureUserDir(uid: string): Promise<void>;
}

// ── LocalStorage ─────────────────────────────────────────────────────────────

const BASE_DIR = process.env.STORAGE_BASE ?? path.join(process.env.HOME ?? "/data", ".openclaw", "users");

export const LocalStorage: IStorageAdapter = {
  userDir(uid) {
    const safe = uid.replace(/[^a-zA-Z0-9_\-]/g, "_");
    return path.join(BASE_DIR, safe);
  },
  async ensureUserDir(uid) { await fs.ensureDir(this.userDir(uid)); },
  async readFile(uid, rel) { return fs.readFile(path.join(this.userDir(uid), rel), "utf-8"); },
  async writeFile(uid, rel, content) {
    const full = path.join(this.userDir(uid), rel);
    await fs.ensureDir(path.dirname(full));
    await fs.writeFile(full, content, "utf-8");
  },
  async listFiles(uid, subdir = "") {
    const dir = path.join(this.userDir(uid), subdir);
    return (await fs.pathExists(dir)) ? fs.readdir(dir) : [];
  },
};

// ── CosStorage ───────────────────────────────────────────────────────────────

export { CosStorage } from "./cos.js";

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Returns CosStorage when COS_BUCKET is set, otherwise LocalStorage.
 * Import this in worker-pool and any service that needs file storage.
 */
export async function createStorage(): Promise<IStorageAdapter> {
  if (process.env.COS_BUCKET) {
    const { CosStorage } = await import("./cos.js");
    return CosStorage;
  }
  return LocalStorage;
}

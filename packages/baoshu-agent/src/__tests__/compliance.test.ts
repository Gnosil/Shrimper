/**
 * Unit tests: compliance.ts
 *
 * Sprint AC: blocklist contains exactly 9 terms and correctly blocks them.
 * All tests are pure (no network, no Redis).
 */
import { describe, it, expect } from "vitest";
import { keywordCheck, BLOCKED_KEYWORDS } from "../compliance.js";

describe("keywordCheck — blocklist", () => {
  it("has exactly 9 blocked keywords", () => {
    expect(BLOCKED_KEYWORDS).toHaveLength(9);
  });

  it("blocks each keyword individually", () => {
    for (const kw of BLOCKED_KEYWORDS) {
      const result = keywordCheck(`这款产品${kw}，非常适合您`);
      expect(result.blocked, `keyword "${kw}" should be blocked`).toBe(true);
      expect(result.reason).toContain(kw);
    }
  });

  it("does not block clean insurance text", () => {
    const clean = [
      "这款产品历史年化收益约5%，过往业绩不代表未来",
      "保险有风险，投资需谨慎",
      "请阅读产品说明书，了解详细条款",
      "保险公司会保障您的基本权益",
    ];
    for (const text of clean) {
      const result = keywordCheck(text);
      expect(result.blocked, `"${text}" should NOT be blocked`).toBe(false);
    }
  });

  it("blocks text containing multiple keywords", () => {
    const result = keywordCheck("这是最好的无风险产品，保证收益");
    expect(result.blocked).toBe(true);
    // Only reports the first hit
    expect(result.reason).toBeDefined();
  });

  it("blocks substring matches (keyword inside longer text)", () => {
    const result = keywordCheck("我们的产品绝对安全可靠，请放心购买");
    expect(result.blocked).toBe(true);
  });
});

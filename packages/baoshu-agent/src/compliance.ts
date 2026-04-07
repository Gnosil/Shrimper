/**
 * Compliance filter — two layers:
 *  1. Fast keyword blocklist (synchronous)
 *  2. MiniMax M2.7 semantic audit via 千帆 MaaS (async, only called when keywords pass)
 *
 * Returns { blocked: true, reason } or { blocked: false }
 */
import { logger } from "./logger.js";

// ── Layer 1: keyword blocklist ─────────────────────────────────────────────
// Sprint AC: exactly these 9 terms from CBIRC mis-selling red lines
export const BLOCKED_KEYWORDS = [
  "最好",       // superlative claims
  "最优",       // superlative claims
  "第一",       // superlative claims
  "保证收益",   // guaranteed return
  "绝对安全",   // absolute safety claim
  "承诺保本",   // capital guarantee promise
  "稳赚",       // guaranteed profit
  "无风险",     // zero risk claim
  "收益最高",   // highest return claim
];

export interface ComplianceResult {
  blocked: boolean;
  reason?: string;
}

export function keywordCheck(text: string): ComplianceResult {
  for (const kw of BLOCKED_KEYWORDS) {
    if (text.includes(kw)) {
      return { blocked: true, reason: `包含违规词汇: "${kw}"` };
    }
  }
  return { blocked: false };
}

// ── Layer 2: MiniMax M2.7 semantic audit ───────────────────────────────────
const QIANFAN_API_KEY = process.env.QIANFAN_API_KEY;
const MINIMAX_MODEL   = "minimax/minimax-m2.7";

export async function minimaxAudit(reply: string): Promise<ComplianceResult> {
  if (!QIANFAN_API_KEY) {
    logger.warn("[compliance] QIANFAN_API_KEY not set — skipping MiniMax audit");
    return { blocked: false };
  }

  try {
    const res = await fetch("https://qianfan.baidubce.com/v2/chat/completions", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${QIANFAN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:    MINIMAX_MODEL,
        messages: [
          {
            role:    "system",
            content: "你是保险合规审核员。判断以下内容是否违反中国保险销售合规要求（如夸大收益、误导销售、不合规承诺）。只回复 JSON：{\"compliant\": true} 或 {\"compliant\": false, \"reason\": \"原因\"}",
          },
          { role: "user", content: reply },
        ],
        max_tokens: 128,
      }),
    });

    if (!res.ok) {
      logger.error("[compliance] MiniMax audit HTTP error %d", res.status);
      return { blocked: false }; // fail open — don't block on audit errors
    }

    const data = await res.json() as any;
    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content);

    if (parsed.compliant === false) {
      return { blocked: true, reason: parsed.reason ?? "MiniMax 合规审核未通过" };
    }
    return { blocked: false };
  } catch (err) {
    logger.error("[compliance] MiniMax audit error:", err);
    return { blocked: false }; // fail open
  }
}

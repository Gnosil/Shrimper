/**
 * MiniMax M2.7 client via 百度千帆 MaaS API
 *
 * Used for intent classification and compliance audit.
 * API Key must be a 千帆 MaaS API key (NOT Coding Plan key).
 */
import { z } from "zod";

const BASE_URL = "https://qianfan.baidubce.com/v2";

// Intent classification schema
export const IntentSchema = z.enum([
  "询价",
  "产品咨询",
  "理赔",
  "付费咨询",
  "off-topic",
]);

export type Intent = z.infer<typeof IntentSchema>;

// API response schema
const ResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ),
});

/**
 * Call MiniMax M2.7 via 千帆 MaaS API
 */
export async function callMiniMax(
  prompt: string,
  system?: string
): Promise<string> {
  const apiKey = process.env.QIANFAN_API_KEY;
  if (!apiKey) {
    throw new Error("QIANFAN_API_KEY not configured");
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "minimax/minimax-m2.7",
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    throw new Error(`MiniMax error: ${response.status} ${response.statusText}`);
  }

  const data = ResponseSchema.parse(await response.json());
  return data.choices[0].message.content;
}

// Intent classification system prompt
const INTENT_SYSTEM_PROMPT = `你是一个保险客服意图分类器。请将用户输入分类为以下类别之一：
- 询价：询问保险价格、费用、多少钱
- 产品咨询：询问保险产品详情、保障内容、条款
- 理赔：询问理赔流程、如何申请理赔
- 付费咨询：用户明确表达购买意愿或咨询付费服务
- off-topic：与保险无关的话题

只返回类别名称，不要其他内容。`;

/**
 * Classify user intent using MiniMax M2.7
 */
export async function classifyIntent(message: string): Promise<Intent> {
  try {
    const result = await callMiniMax(message, INTENT_SYSTEM_PROMPT);
    const cleanResult = result.trim().toLowerCase();

    // Map variations to standard intents
    if (cleanResult.includes("询价") || cleanResult.includes("价格")) {
      return "询价";
    }
    if (cleanResult.includes("产品") || cleanResult.includes("咨询")) {
      return "产品咨询";
    }
    if (cleanResult.includes("理赔")) {
      return "理赔";
    }
    if (cleanResult.includes("付费") || cleanResult.includes("购买")) {
      return "付费咨询";
    }
    return "off-topic";
  } catch (error) {
    // Fail-open: return off-topic on error
    console.error("Intent classification failed:", error);
    return "off-topic";
  }
}

// Compliance audit system prompt
const COMPLIANCE_SYSTEM_PROMPT = `你是一个保险合规审核助手。请检查以下回复是否包含违规内容：

禁止出现的表述：
1. "最好"、"最优"、"第一"、"排名第一"等绝对化用语
2. "保证收益"、"绝对安全"、"承诺保本"、"稳赚"、"无风险"等收益承诺
3. "收益最高"等比较级最高级用语
4. 任何暗示保本保收益的表述

如果包含违规内容，返回 "VIOLATION: " + 具体问题。
如果没有违规，返回 "PASS"。`;

export interface ComplianceResult {
  passed: boolean;
  reason?: string;
}

/**
 * Audit message compliance using MiniMax M2.7
 */
export async function auditCompliance(text: string): Promise<ComplianceResult> {
  try {
    const result = await callMiniMax(text, COMPLIANCE_SYSTEM_PROMPT);
    const cleanResult = result.trim();

    if (cleanResult.startsWith("PASS") || cleanResult.startsWith("通过")) {
      return { passed: true };
    }

    if (cleanResult.startsWith("VIOLATION") || cleanResult.includes("违规")) {
      return {
        passed: false,
        reason: cleanResult.replace("VIOLATION:", "").trim(),
      };
    }

    // Default to pass if unclear
    return { passed: true };
  } catch (error) {
    // Fail-open: pass on error
    console.error("Compliance audit failed:", error);
    return { passed: true };
  }
}

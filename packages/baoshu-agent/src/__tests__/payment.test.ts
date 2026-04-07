/**
 * Unit tests: payment.ts
 *
 * Tests the mock payment flow and intent detection.
 * No network calls — all tests are pure.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { detectPaymentIntent, isPaymentMockMode } from "../payment.js";

describe("detectPaymentIntent", () => {
  it("returns null for non-payment messages", () => {
    const nonPayment = [
      "帮我分析一下这款产品",
      "什么是重疾险",
      "如何理赔",
      "hello there",
    ];
    for (const text of nonPayment) {
      expect(detectPaymentIntent(text), `"${text}" should not trigger`).toBeNull();
    }
  });

  it("detects monthly plan by default", () => {
    const triggers = ["我想购买", "如何订阅", "付款方式", "多少钱", "开通会员", "续费"];
    for (const text of triggers) {
      const plan = detectPaymentIntent(text);
      expect(plan, `"${text}" should trigger monthly`).toBe("monthly");
    }
  });

  it("detects annual plan when year keyword present", () => {
    expect(detectPaymentIntent("我想购买年度会员")).toBe("annual");
    expect(detectPaymentIntent("annual subscription price")).toBe("annual");
    expect(detectPaymentIntent("订阅一年多少钱")).toBe("annual");
  });
});

describe("isPaymentMockMode", () => {
  it("returns true when WECHAT_MCH_ID is not set", () => {
    // Default env in test has no WECHAT_MCH_ID
    expect(isPaymentMockMode()).toBe(true);
  });
});

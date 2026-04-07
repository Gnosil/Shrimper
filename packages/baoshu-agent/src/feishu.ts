/**
 * Feishu (Lark) message card builder
 *
 * Builds interactive cards for:
 * - Text replies
 * - Payment CTAs
 * - Error messages
 */

export interface CardMessage {
  msg_type: "interactive";
  card: Record<string, unknown>;
}

/**
 * Build a simple text reply card
 */
export function buildTextCard(text: string): CardMessage {
  return {
    msg_type: "interactive",
    card: {
      config: { wide_screen_mode: true },
      elements: [
        {
          tag: "div",
          text: {
            tag: "plain_text",
            content: text,
          },
        },
      ],
      header: {
        template: "blue",
        title: {
          tag: "plain_text",
          content: "🤖 保叔AI助手",
        },
      },
    },
  };
}

/**
 * Build a compliance warning card
 */
export function buildComplianceWarningCard(reason: string): CardMessage {
  return {
    msg_type: "interactive",
    card: {
      config: { wide_screen_mode: true },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `⚠️ **回复已调整**\n\n原回复可能包含不合规内容，已自动调整：\n> ${reason}`,
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "div",
          text: {
            tag: "plain_text",
            content:
              "根据监管要求，保险咨询不得使用绝对化用语或收益承诺。如有疑问，建议咨询专业保险顾问。",
          },
        },
      ],
      header: {
        template: "orange",
        title: {
          tag: "plain_text",
          content: "⚠️ 合规提示",
        },
      },
    },
  };
}

/**
 * Build payment card with subscription options
 */
export function buildPaymentCard(options: {
  monthlyUrl: string;
  annualUrl: string;
  monthlyPrice: string;
  annualPrice: string;
}): CardMessage {
  return {
    msg_type: "interactive",
    card: {
      config: { wide_screen_mode: true },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content:
              "**解锁保叔AI完整功能**\n\n• 无限次保险咨询\n• 个性化方案推荐\n• 理赔协助指导\n• 7×24小时在线",
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**月付套餐** - ${options.monthlyPrice}/月`,
          },
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: {
                tag: "plain_text",
                content: "选择月付",
              },
              type: "primary",
              url: options.monthlyUrl,
            },
          ],
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**年付套餐** - ${options.annualPrice}/年 (省20%)`,
          },
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: {
                tag: "plain_text",
                content: "选择年付",
              },
              type: "primary",
              url: options.annualUrl,
            },
          ],
        },
        {
          tag: "hr",
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: "💡 支付完成后即可解锁全部功能",
          },
        },
      ],
      header: {
        template: "green",
        title: {
          tag: "plain_text",
          content: "💎 升级保叔会员",
        },
      },
    },
  };
}

/**
 * Build error card
 */
export function buildErrorCard(error: string): CardMessage {
  return {
    msg_type: "interactive",
    card: {
      config: { wide_screen_mode: true },
      elements: [
        {
          tag: "div",
          text: {
            tag: "plain_text",
            content: "抱歉，服务暂时遇到问题。请稍后重试，或联系客服。",
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `错误信息：${error}`,
          },
        },
      ],
      header: {
        template: "red",
        title: {
          tag: "plain_text",
          content: "❌ 服务异常",
        },
      },
    },
  };
}

/**
 * Build paywall card (when user needs to subscribe)
 */
export function buildPaywallCard(): CardMessage {
  return {
    msg_type: "interactive",
    card: {
      config: { wide_screen_mode: true },
      elements: [
        {
          tag: "div",
          text: {
            tag: "plain_text",
            content:
              "您已使用了免费额度。升级会员后可继续咨询，享受无限次AI保险顾问服务。",
          },
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: {
                tag: "plain_text",
                content: "升级会员",
              },
              type: "primary",
              multi_url: {
                url: "",
                android_url: "",
                ios_url: "",
                pc_url: "",
              },
            },
          ],
        },
      ],
      header: {
        template: "yellow",
        title: {
          tag: "plain_text",
          content: "🔒 免费额度已用完",
        },
      },
    },
  };
}

/**
 * 获客技能 - Cold Message生成器
 * 生成个性化的微信好友申请/破冰消息
 */
import { chat, CONTENT_PROMPTS } from '../../services/qianfan.js';
import { checkCompliance } from '../../services/compliance.js';
import { logger } from '../../logger.js';
import type { ColdMessageRequest, ColdMessageResult, Lead } from './types.js';

/**
 * 生成Cold Message
 */
export async function generateColdMessage(
  request: ColdMessageRequest
): Promise<ColdMessageResult> {
  const { leadProfile, touchPoint, previousMessages } = request;

  logger.info({ touchPoint }, 'Generating cold message');

  try {
    const prompt = CONTENT_PROMPTS.coldMessage(leadProfile, touchPoint);

    const response = await chat([
      { role: 'system', content: '你是保险销售专家，擅长写自然、不营销感的微信消息。' },
      { role: 'user', content: prompt },
    ]);

    // 解析响应，提取多个版本
    const messages = parseColdMessageResponse(response);

    // 合规检查
    for (const msg of messages) {
      const compliance = await checkCompliance(msg.content);
      if (compliance.issues.length > 0) {
        logger.warn({ issues: compliance.issues }, 'Cold message compliance issues');
      }
    }

    return {
      messages,
      suggestedTime: suggestSendTime(),
      followUpPlan: generateFollowUpPlan(touchPoint),
    };
  } catch (error) {
    logger.error({ error }, 'Failed to generate cold message');
    throw error;
  }
}

/**
 * 解析Cold Message响应
 */
function parseColdMessageResponse(response: string): Array<{ version: string; content: string; tone: string }> {
  const messages: Array<{ version: string; content: string; tone: string }> = [];

  // 尝试匹配版本A、版本B格式
  const versionMatches = response.match(/(?:版本|方案)?[AB][：:]\s*([\s\S]+?)(?=(?:版本|方案)?[AB][：:]|$)/gi);
  
  if (versionMatches) {
    versionMatches.forEach((match, index) => {
      const content = match.replace(/(?:版本|方案)?[AB][：:]\s*/i, '').trim();
      messages.push({
        version: index === 0 ? 'A' : 'B',
        content,
        tone: index === 0 ? '自然' : '专业',
      });
    });
  } else {
    // 如果没有明确版本标记，整体作为版本A
    messages.push({
      version: 'A',
      content: response.trim(),
      tone: '自然',
    });
  }

  return messages;
}

/**
 * 建议发送时间
 */
function suggestSendTime(): string {
  const now = new Date();
  const hour = now.getHours();

  // 根据当前时间建议下一个合适的发送时间窗口
  if (hour < 9) {
    return '今天 10:00-11:00';
  } else if (hour < 12) {
    return '今天 14:00-15:00';
  } else if (hour < 18) {
    return '今天 20:00-21:00';
  } else {
    return '明天 10:00-11:00';
  }
}

/**
 * 生成跟进计划
 */
function generateFollowUpPlan(touchPoint: number): string[] {
  const plans: Record<number, string[]> = {
    1: [
      '如果24小时内未回复，48小时后发送价值内容（如保险科普）',
      '如果已读未回，3天后尝试打电话',
      '如果回复了，当天或次日约访',
    ],
    2: [
      '根据上次回复内容，针对性提供方案',
      '如果仍未回复，一周后发送节日/生日祝福',
    ],
    3: [
      '发送客户案例或成功故事',
      '表达长期服务的意愿，不急于成交',
    ],
  };

  return plans[touchPoint] || plans[3];
}

/**
 * 生成好友申请备注
 */
export async function generateFriendRequestNote(
  lead: Lead,
  source: string
): Promise<string> {
  const templates: Record<string, string[]> = {
    douyin: [
      `你好${lead.name}，抖音看到你的评论，想交流一下保险方面的问题`,
      `嗨，在抖音看到你的关注，我是做保险咨询的，可以交个朋友`,
    ],
    weibo: [
      `你好，微博看到你对保险话题感兴趣，想认识一下`,
      `Hi ${lead.name}，关注你很久了，我是保险顾问保叔`,
    ],
    referral: [
      `你好，是${source}推荐我加你的，想了解一下你的保险需求`,
      `Hi，${source}说你可能对保险感兴趣，我是保叔`,
    ],
    default: [
      `你好${lead.name}，我是保险经纪人保叔，很高兴认识你`,
      `Hi，关注你很久了，我是做家庭保障规划的保叔`,
    ],
  };

  const options = templates[lead.tags.source] || templates.default;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * 人类化发送策略
 */
export interface HumanizedSendStrategy {
  dailyLimit: number;
  intervalRange: [number, number]; // 分钟
  timeWindows: Array<{ start: string; end: string }>;
  pauseAfterReply: number; // 分钟
}

export function getHumanizedStrategy(): HumanizedSendStrategy {
  return {
    dailyLimit: Math.floor(Math.random() * 11) + 20, // 20-30条
    intervalRange: [3, 8], // 3-8分钟间隔
    timeWindows: [
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
      { start: '20:00', end: '22:00' },
    ],
    pauseAfterReply: 30, // 回复后暂停30分钟
  };
}

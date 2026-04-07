/**
 * 获客技能 - 内容生成器
 * 支持：公众号文章、短视频脚本、朋友圈文案
 */
import { chat, CONTENT_PROMPTS } from '../../services/qianfan.js';
import { checkCompliance } from '../../services/compliance.js';
import { logger } from '../../logger.js';
import type {
  ContentGenerationRequest,
  ContentGenerationResult,
  ContentType,
} from './types.js';

/**
 * 生成内容
 */
export async function generateContent(
  request: ContentGenerationRequest
): Promise<ContentGenerationResult> {
  const { type, topic, platform, ipProfile, style, duration } = request;

  logger.info({ type, topic }, 'Generating content');

  try {
    let prompt: string;

    switch (type) {
      case 'wechat_article':
        prompt = CONTENT_PROMPTS.wechatArticle(topic, ipProfile || '专业保险经纪人');
        break;
      case 'video_script':
        prompt = CONTENT_PROMPTS.videoScript(topic, platform || '视频号', duration || 60);
        break;
      case 'moments':
        prompt = CONTENT_PROMPTS.moments(topic, style || '专业');
        break;
      default:
        throw new Error(`Unsupported content type: ${type}`);
    }

    // 调用千帆生成内容
    const response = await chat([
      { role: 'system', content: '你是专业的保险内容创作专家，熟悉保险监管规定。' },
      { role: 'user', content: prompt },
    ]);

    // 解析生成结果
    const result = parseContentResponse(type, response);

    // 合规检查
    const complianceResult = await checkCompliance(result.content);
    result.complianceChecked = true;
    result.complianceIssues = complianceResult.issues;

    if (complianceResult.issues.length > 0) {
      logger.warn({ issues: complianceResult.issues }, 'Content compliance issues found');
    }

    return result;
  } catch (error) {
    logger.error({ error, request }, 'Failed to generate content');
    throw error;
  }
}

/**
 * 解析内容生成响应
 */
function parseContentResponse(type: ContentType, response: string): ContentGenerationResult {
  const result: ContentGenerationResult = {
    content: response,
    complianceChecked: false,
  };

  // 尝试提取标题
  const titleMatch = response.match(/(?:标题|备选标题)[：:]\s*(.+?)(?:\n|$)/i);
  if (titleMatch) {
    result.titles = [titleMatch[1].trim()];
  }

  // 尝试提取摘要
  const summaryMatch = response.match(/(?:摘要|简介)[：:]\s*(.+?)(?:\n|$)/i);
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim();
  }

  // 尝试提取标签
  const tagMatches = response.match(/[#＃]([^\s#＃]+)/g);
  if (tagMatches) {
    result.tags = tagMatches.map(t => t.replace(/[#＃]/, ''));
  }

  return result;
}

/**
 * 批量生成多平台内容
 */
export async function generateMultiPlatformContent(
  topic: string,
  ipProfile: string
): Promise<Record<string, ContentGenerationResult>> {
  const platforms = [
    { type: 'wechat_article' as const, platform: 'wechat' as const },
    { type: 'video_script' as const, platform: 'wechat_video' as const, duration: 60 },
    { type: 'moments' as const, style: '专业' },
  ];

  const results: Record<string, ContentGenerationResult> = {};

  for (const config of platforms) {
    try {
      const result = await generateContent({
        type: config.type,
        topic,
        ipProfile,
        ...config,
      });
      results[config.type] = result;
    } catch (error) {
      logger.error({ error, type: config.type }, 'Failed to generate content for platform');
      results[config.type] = {
        content: '生成失败，请重试',
        complianceChecked: false,
      };
    }
  }

  return results;
}

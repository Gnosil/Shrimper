/**
 * 获客技能 - 微信公众号发布器
 * 支持：草稿箱管理、图文消息发布
 */
import { logger } from '../../logger.js';
import type { WechatDraft, ContentGenerationResult } from './types.js';

// 微信公众号API配置
interface WechatConfig {
  appId: string;
  appSecret: string;
  accessToken?: string;
  expiresAt?: number;
}

// 内存存储配置（实际应使用数据库）
const wechatConfigs = new Map<string, WechatConfig>();

/**
 * 配置公众号
 */
export function configureWechat(
  accountId: string,
  config: Omit<WechatConfig, 'accessToken' | 'expiresAt'>
): void {
  wechatConfigs.set(accountId, config);
  logger.info({ accountId }, 'Wechat account configured');
}

/**
 * 获取Access Token
 */
async function getAccessToken(accountId: string): Promise<string> {
  const config = wechatConfigs.get(accountId);
  if (!config) {
    throw new Error(`Wechat account not configured: ${accountId}`);
  }

  // 检查token是否过期
  if (config.accessToken && config.expiresAt && Date.now() < config.expiresAt) {
    return config.accessToken;
  }

  // 重新获取token
  try {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status}`);
    }

    const data = await response.json();
    if (data.errcode) {
      throw new Error(`Wechat API error: ${data.errmsg}`);
    }

    config.accessToken = data.access_token;
    config.expiresAt = Date.now() + (data.expires_in - 300) * 1000; // 提前5分钟过期
    wechatConfigs.set(accountId, config);

    logger.info({ accountId }, 'Access token refreshed');
    return config.accessToken;
  } catch (error) {
    logger.error({ error, accountId }, 'Failed to get access token');
    throw error;
  }
}

/**
 * 创建草稿
 */
export async function createDraft(
  accountId: string,
  draft: WechatDraft
): Promise<{ mediaId: string }> {
  const accessToken = await getAccessToken(accountId);

  try {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: [{
            title: draft.title,
            content: draft.content,
            thumb_media_id: draft.thumbMediaId,
            digest: draft.digest,
            content_source_url: draft.contentSourceUrl,
            show_cover_pic: draft.showCoverPic ?? 1,
          }],
        }),
      }
    );

    const data = await response.json();
    if (data.errcode) {
      throw new Error(`Wechat API error: ${data.errmsg}`);
    }

    logger.info({ accountId, mediaId: data.media_id }, 'Draft created');
    return { mediaId: data.media_id };
  } catch (error) {
    logger.error({ error, accountId }, 'Failed to create draft');
    throw error;
  }
}

/**
 * 从生成的内容创建草稿
 */
export async function createDraftFromContent(
  accountId: string,
  contentResult: ContentGenerationResult,
  options?: {
    thumbMediaId?: string;
    contentSourceUrl?: string;
  }
): Promise<{ mediaId: string; url?: string }> {
  const draft: WechatDraft = {
    title: contentResult.titles?.[0] || '无标题',
    content: formatContentForWechat(contentResult.content),
    digest: contentResult.summary,
    thumbMediaId: options?.thumbMediaId,
    contentSourceUrl: options?.contentSourceUrl,
    showCoverPic: true,
  };

  return createDraft(accountId, draft);
}

/**
 * 格式化内容为微信图文格式
 */
function formatContentForWechat(content: string): string {
  // 添加微信图文所需的HTML标签
  let formatted = content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // 添加免责声明
  formatted += `
    <hr>
    <p style="color: #999; font-size: 12px;">
      <strong>免责声明：</strong><br>
      本文内容仅供参考，不构成任何保险购买建议。
      具体产品信息以保险公司官方条款为准。
      投资有风险，购买保险产品前请仔细阅读条款。
    </p>
  `;

  return `<p>${formatted}</p>`;
}

/**
 * 获取草稿列表
 */
export async function listDrafts(
  accountId: string,
  offset = 0,
  count = 20
): Promise<{
  total: number;
  items: Array<{
    mediaId: string;
    title: string;
    digest: string;
    updateTime: number;
  }>;
}> {
  const accessToken = await getAccessToken(accountId);

  try {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset, count, no_content: 1 }),
      }
    );

    const data = await response.json();
    if (data.errcode) {
      throw new Error(`Wechat API error: ${data.errmsg}`);
    }

    return {
      total: data.total_count,
      items: data.item?.map((item: any) => ({
        mediaId: item.media_id,
        title: item.content?.news_item?.[0]?.title,
        digest: item.content?.news_item?.[0]?.digest,
        updateTime: item.update_time,
      })) || [],
    };
  } catch (error) {
    logger.error({ error, accountId }, 'Failed to list drafts');
    throw error;
  }
}

/**
 * 删除草稿
 */
export async function deleteDraft(
  accountId: string,
  mediaId: string
): Promise<void> {
  const accessToken = await getAccessToken(accountId);

  try {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/draft/delete?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: mediaId }),
      }
    );

    const data = await response.json();
    if (data.errcode) {
      throw new Error(`Wechat API error: ${data.errmsg}`);
    }

    logger.info({ accountId, mediaId }, 'Draft deleted');
  } catch (error) {
    logger.error({ error, accountId, mediaId }, 'Failed to delete draft');
    throw error;
  }
}

/**
 * 上传图片素材（用于正文）
 */
export async function uploadImage(
  accountId: string,
  imageData: Buffer,
  filename: string
): Promise<{ url: string }> {
  const accessToken = await getAccessToken(accountId);

  try {
    const formData = new FormData();
    formData.append('media', new Blob([imageData]), filename);

    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    if (data.errcode) {
      throw new Error(`Wechat API error: ${data.errmsg}`);
    }

    return { url: data.url };
  } catch (error) {
    logger.error({ error, accountId }, 'Failed to upload image');
    throw error;
  }
}

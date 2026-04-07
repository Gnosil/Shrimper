/**
 * ComponentVerifyTicket 管理服务
 * 
 * 微信每10分钟会向我们的授权事件接收URL推送一次 component_verify_ticket
 * 这是获取 component_access_token 的必要凭证
 */

import type { ComponentVerifyTicket } from '../types.js';

// 内存存储（生产环境应使用Redis或数据库）
let ticketCache: Map<string, ComponentVerifyTicket> = new Map();

/**
 * 保存 component_verify_ticket
 * 
 * @param componentAppId 第三方平台 AppID
 * @param ticket 微信推送的 ticket
 */
export async function saveTicket(
    componentAppId: string,
    ticket: string
): Promise<void> {
    const ticketData: ComponentVerifyTicket = {
        componentAppId,
        ticket,
        createdAt: new Date(),
    };

    ticketCache.set(componentAppId, ticketData);
    
    // TODO: 生产环境应同时写入数据库
    console.log(`[WechatPlatform] Ticket saved for ${componentAppId}`);
}

/**
 * 获取最新的 component_verify_ticket
 * 
 * @param componentAppId 第三方平台 AppID
 * @returns 最新的 ticket，如果不存在返回 null
 */
export async function getTicket(componentAppId: string): Promise<string | null> {
    const ticketData = ticketCache.get(componentAppId);
    
    if (!ticketData) {
        return null;
    }

    // 检查ticket是否过期（有效期12小时）
    const now = new Date();
    const expiresAt = new Date(ticketData.createdAt.getTime() + 12 * 60 * 60 * 1000);
    
    if (now > expiresAt) {
        console.warn(`[WechatPlatform] Ticket expired for ${componentAppId}`);
        return null;
    }

    return ticketData.ticket;
}

/**
 * 检查 ticket 是否存在且有效
 * 
 * @param componentAppId 第三方平台 AppID
 */
export async function hasValidTicket(componentAppId: string): Promise<boolean> {
    const ticket = await getTicket(componentAppId);
    return ticket !== null;
}

/**
 * 清除指定 AppID 的 ticket（用于测试）
 */
export async function clearTicket(componentAppId: string): Promise<void> {
    ticketCache.delete(componentAppId);
}

/**
 * 初始化时从数据库加载 ticket
 * 应用启动时调用
 */
export async function loadTicketsFromStorage(): Promise<void> {
    // TODO: 从数据库加载所有有效的 ticket
    console.log('[WechatPlatform] Loading tickets from storage...');
}

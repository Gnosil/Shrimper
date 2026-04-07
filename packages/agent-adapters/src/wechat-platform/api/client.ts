/"/**
 * 微信 API 代调用客户端
 * 封装代公众号调用微信接口的功能
 */

import type { WechatPlatformConfig, SendMessageRequest, UserInfo } from '../types.js';
import { getAuthorizerAccessToken } from '../auth/token-service.js';

const WECHAT_API_BASE = 'https://api.weixin.qq.com';

export class WechatApiClient {
    constructor(
        private config: WechatPlatformConfig,
        private getRefreshToken: (appId: string) => Promise<string>
    ) {}

    /**
     * 获取 access token
     */
    private async getAccessToken(appId: string): Promise<string> {
        const refreshToken = await this.getRefreshToken(appId);
        return getAuthorizerAccessToken(appId, refreshToken, this.config);
    }

    /**
     * 发送客服消息
     */
    async sendMessage(appId: string, message: SendMessageRequest): Promise<void> {
        const accessToken = await this.getAccessToken(appId);
        const url = `${WECHAT_API_BASE}/cgi-bin/message/custom/send?access_token=${accessToken}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        });

        const data = await response.json();
        if (data.errcode && data.errcode !== 0) {
            throw new Error(`Send message failed: ${data.errmsg} (code: ${data.errcode})`);
        }
    }

    /**
     * 发送文本消息（快捷方法）
     */
    async sendText(appId: string, openid: string, content: string): Promise<void> {
        return this.sendMessage(appId, {
            touser: openid,
            msgtype: 'text',
            text: { content },
        });
    }

    /**
     * 获取用户信息
     */
    async getUserInfo(appId: string, openid: string): Promise<UserInfo> {
        const accessToken = await this.getAccessToken(appId);
        const url = `${WECHAT_API_BASE}/cgi-bin/user/info?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.errcode) {
            throw new Error(`Get user info failed: ${data.errmsg} (code: ${data.errcode})`);
        }

        return data as UserInfo;
    }

    /**
     * 获取用户列表
     */
    async getUserList(appId: string, nextOpenid?: string): Promise<{
        total: number;
        count: number;
        openids: string[];
        nextOpenid?: string;
    }> {
        const accessToken = await this.getAccessToken(appId);
        let url = `${WECHAT_API_BASE}/cgi-bin/user/get?access_token=${accessToken}`;
        if (nextOpenid) {
            url += `&next_openid=${nextOpenid}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.errcode) {
            throw new Error(`Get user list failed: ${data.errmsg} (code: ${data.errcode})`);
        }

        return {
            total: data.total,
            count: data.count,
            openids: data.data?.openid || [],
            nextOpenid: data.next_openid,
        };
    }
}

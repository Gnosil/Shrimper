/**
 * ComponentAccessToken 和 AuthorizerAccessToken 管理服务
 */

import type { ComponentAccessToken, AuthorizerAccessToken, WechatPlatformConfig } from '../types.js';
import { getTicket } from './ticket-service.js';

const componentTokenCache: Map<string, ComponentAccessToken> = new Map();
const authorizerTokenCache: Map<string, AuthorizerAccessToken> = new Map();
const WECHAT_API_BASE = 'https://api.weixin.qq.com';

export async function getComponentAccessToken(config: WechatPlatformConfig): Promise<string> {
    const cacheKey = config.componentAppId;
    const cached = componentTokenCache.get(cacheKey);

    if (cached && cached.expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
        return cached.token;
    }

    const ticket = await getTicket(config.componentAppId);
    if (!ticket) {
        throw new Error(`ComponentVerifyTicket not found for ${config.componentAppId}`);
    }

    const url = `${WECHAT_API_BASE}/cgi-bin/component/api_component_token`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            component_appid: config.componentAppId,
            component_appsecret: config.componentAppSecret,
            component_verify_ticket: ticket,
        }),
    });

    const data = await response.json();
    if (data.errcode) {
        throw new Error(`Wechat API error: ${data.errmsg} (code: ${data.errcode})`);
    }

    const token: ComponentAccessToken = {
        token: data.component_access_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };

    componentTokenCache.set(cacheKey, token);
    return token.token;
}

export async function getAuthorizerAccessToken(
    authorizerAppId: string,
    refreshToken: string,
    config: WechatPlatformConfig
): Promise<string> {
    const cacheKey = authorizerAppId;
    const cached = authorizerTokenCache.get(cacheKey);

    if (cached && cached.expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
        return cached.accessToken;
    }

    const componentToken = await getComponentAccessToken(config);
    const url = `${WECHAT_API_BASE}/cgi-bin/component/api_authorizer_token?component_access_token=${componentToken}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            component_appid: config.componentAppId,
            authorizer_appid: authorizerAppId,
            authorizer_refresh_token: refreshToken,
        }),
    });

    const data = await response.json();
    if (data.errcode) {
        throw new Error(`Wechat API error: ${data.errmsg} (code: ${data.errcode})`);
    }

    const token: AuthorizerAccessToken = {
        authorizerAppId,
        accessToken: data.authorizer_access_token,
        refreshToken: data.authorizer_refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };

    authorizerTokenCache.set(cacheKey, token);
    return token.accessToken;
}

export async function getPreAuthCode(config: WechatPlatformConfig): Promise<string> {
    const componentToken = await getComponentAccessToken(config);
    const url = `${WECHAT_API_BASE}/cgi-bin/component/api_create_preauthcode?component_access_token=${componentToken}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ component_appid: config.componentAppId }),
    });

    const data = await response.json();
    if (data.errcode) {
        throw new Error(`Wechat API error: ${data.errmsg} (code: ${data.errcode})`);
    }

    return data.pre_auth_code;
}

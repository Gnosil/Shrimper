/**
 * 微信授权流程处理
 * 包括：生成授权链接、处理回调、保存授权信息
 */

import type { 
    WechatPlatformConfig, 
    AuthorizationInfo, 
    AuthorizerInfo,
    WechatAuthorization 
} from '../types.js';
import { getComponentAccessToken, getPreAuthCode } from './token-service.js';

const WECHAT_API_BASE = 'https://api.weixin.qq.com';
const AUTH_PAGE_URL = 'https://mp.weixin.qq.com/cgi-bin/componentloginpage';

/**
 * 生成PC端授权链接（扫码授权）
 * 
 * @param config 第三方平台配置
 * @param redirectUri 授权回调URL
 * @param options 可选参数
 * @returns 完整的授权链接
 */
export async function generateAuthUrl(
    config: WechatPlatformConfig,
    redirectUri: string,
    options: {
        authType?: number;      // 1=公众号, 2=小程序, 3=全部
        bizAppId?: string;      // 指定要授权的appid
    } = {}
): Promise<{ authUrl: string; preAuthCode: string }> {
    const preAuthCode = await getPreAuthCode(config);
    
    const params = new URLSearchParams({
        component_appid: config.componentAppId,
        pre_auth_code: preAuthCode,
        redirect_uri: redirectUri,
        auth_type: String(options.authType ?? 1), // 默认只显示公众号
    });

    if (options.bizAppId) {
        params.append('biz_appid', options.bizAppId);
    }

    const authUrl = `${AUTH_PAGE_URL}?${params.toString()}`;
    
    return { authUrl, preAuthCode };
}

/**
 * 使用授权码换取授权信息
 * 
 * @param authCode 授权码（回调时微信传入）
 * @param config 第三方平台配置
 * @returns 授权信息
 */
export async function queryAuth(
    authCode: string,
    config: WechatPlatformConfig
): Promise<AuthorizationInfo> {
    const componentToken = await getComponentAccessToken(config);
    const url = `${WECHAT_API_BASE}/cgi-bin/component/api_query_auth?component_access_token=${componentToken}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            component_appid: config.componentAppId,
            authorization_code: authCode,
        }),
    });

    const data = await response.json();
    if (data.errcode) {
        throw new Error(`Wechat API error: ${data.errmsg} (code: ${data.errcode})`);
    }

    const info = data.authorization_info;
    return {
        authorizerAppId: info.authorizer_appid,
        authorizerAccessToken: info.authorizer_access_token,
        expiresIn: info.expires_in,
        authorizerRefreshToken: info.authorizer_refresh_token,
        funcInfo: info.func_info || [],
    };
}

/**
 * 获取授权方（公众号/小程序）基本信息
 * 
 * @param authorizerAppId 授权方 AppID
 * @param config 第三方平台配置
 * @returns 授权方信息
 */
export async function getAuthorizerInfo(
    authorizerAppId: string,
    config: WechatPlatformConfig
): Promise<AuthorizerInfo> {
    const componentToken = await getComponentAccessToken(config);
    const url = `${WECHAT_API_BASE}/cgi-bin/component/api_get_authorizer_info?component_access_token=${componentToken}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            component_appid: config.componentAppId,
            authorizer_appid: authorizerAppId,
        }),
    });

    const data = await response.json();
    if (data.errcode) {
        throw new Error(`Wechat API error: ${data.errmsg} (code: ${data.errcode})`);
    }

    return data.authorizer_info;
}

/**
 * 构建 WechatAuthorization 对象
 */
export function buildAuthorization(
    userId: string,
    authInfo: AuthorizationInfo,
    authorizerInfo: AuthorizerInfo
): WechatAuthorization {
    return {
        userId,
        authorizerAppId: authInfo.authorizerAppId,
        authorizerRefreshToken: authInfo.authorizerRefreshToken,
        funcInfo: authInfo.funcInfo.map(f => f.funcscopeCategory.id),
        nickName: authorizerInfo.nickName,
        headImg: authorizerInfo.headImg,
        userName: authorizerInfo.userName,
        principalName: authorizerInfo.principalName,
        signature: authorizerInfo.signature,
        serviceTypeInfo: authorizerInfo.serviceTypeInfo.id,
        verifyTypeInfo: authorizerInfo.verifyTypeInfo.id,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

/**
 * 处理授权回调
 * 
 * @param authCode 授权码
 * @param userId OpenClaw 用户ID
 * @param config 第三方平台配置
 * @returns 授权记录
 */
export async function handleAuthCallback(
    authCode: string,
    userId: string,
    config: WechatPlatformConfig
): Promise<WechatAuthorization> {
    console.log(`[WechatPlatform] Handling auth callback, code: ${authCode}`);

    // 1. 使用授权码换取授权信息
    const authInfo = await queryAuth(authCode, config);
    console.log(`[WechatPlatform] Got auth info for app: ${authInfo.authorizerAppId}`);

    // 2. 获取授权方详细信息
    const authorizerInfo = await getAuthorizerInfo(authInfo.authorizerAppId, config);
    console.log(`[WechatPlatform] Got authorizer info: ${authorizerInfo.nickName}`);

    // 3. 构建授权记录
    const authorization = buildAuthorization(userId, authInfo, authorizerInfo);

    // 4. TODO: 保存到数据库
    console.log(`[WechatPlatform] Authorization ready:`, {
        appId: authorization.authorizerAppId,
        nickName: authorization.nickName,
        funcInfo: authorization.funcInfo,
    });

    return authorization;
}

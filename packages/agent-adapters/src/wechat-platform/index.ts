/"/**
 * 微信第三方平台 SDK
 * 
 * 提供扫码授权绑定公众号的功能
 * 用户无需手动配置 AppID/AppSecret，扫码即可授权
 */

export type {
    WechatPlatformConfig,
    WechatAuthorization,
    AuthorizationInfo,
    AuthorizerInfo,
    SendMessageRequest,
    UserInfo,
    AuthorizationEvent,
} from './types.js';

// 授权服务
export {
    getComponentAccessToken,
    getAuthorizerAccessToken,
    getPreAuthCode,
} from './auth/token-service.js';

export {
    saveTicket,
    getTicket,
    hasValidTicket,
} from './auth/ticket-service.js';

export {
    generateAuthUrl,
    queryAuth,
    getAuthorizerInfo,
    handleAuthCallback,
    buildAuthorization,
} from './auth/auth-flow.js';

// API 客户端
export { WechatApiClient } from './api/client.js';

// Webhook 处理器
export {
    handleEvent,
    handleUserMessage,
    generateReplyXml,
    decryptMessage,
    encryptMessage,
} from './webhook/handler.js';

/**
 * 微信第三方平台主类
 */
import type { WechatPlatformConfig, WechatAuthorization } from './types.js';
import { generateAuthUrl, handleAuthCallback } from './auth/auth-flow.js';
import { WechatApiClient } from './api/client.js';

export class WechatPlatform {
    public api: WechatApiClient;

    constructor(
        private config: WechatPlatformConfig,
        private storage: {
            save: (auth: WechatAuthorization) => Promise<void>;
            get: (userId: string, appId: string) => Promise<WechatAuthorization | null>;
            getRefreshToken: (appId: string) => Promise<string>;
        }
    ) {
        this.api = new WechatApiClient(config, storage.getRefreshToken);
    }

    /**
     * 生成授权链接
     */
    async createAuthUrl(redirectUri: string, authType?: number) {
        return generateAuthUrl(this.config, redirectUri, { authType });
    }

    /**
     * 处理授权回调
     */
    async handleCallback(authCode: string, userId: string): Promise<WechatAuthorization> {
        const authorization = await handleAuthCallback(authCode, userId, this.config);
        await this.storage.save(authorization);
        return authorization;
    }

    /**
     * 获取用户授权的公众号列表
     */
    async getUserAuthorizations(userId: string): Promise<WechatAuthorization[]> {
        // TODO: 从数据库查询
        return [];
    }
}

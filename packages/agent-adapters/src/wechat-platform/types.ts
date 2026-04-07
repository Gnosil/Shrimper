/**
 * 微信第三方平台类型定义
 */

// ============ 基础配置 ============
export interface WechatPlatformConfig {
    componentAppId: string;
    componentAppSecret: string;
    token: string;              // 用于验证消息签名的Token
    encodingAesKey: string;     // 消息加解密密钥
}

// ============ Ticket 相关 ============
export interface ComponentVerifyTicket {
    componentAppId: string;
    ticket: string;
    createdAt: Date;
}

// ============ Token 相关 ============
export interface ComponentAccessToken {
    token: string;
    expiresAt: Date;
}

export interface AuthorizerAccessToken {
    authorizerAppId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}

// ============ 授权相关 ============
export interface PreAuthCode {
    preAuthCode: string;
    expiresAt: Date;
}

export interface AuthorizationInfo {
    authorizerAppId: string;
    authorizerAccessToken: string;
    expiresIn: number;
    authorizerRefreshToken: string;
    funcInfo: FuncInfo[];
}

export interface FuncInfo {
    funcscopeCategory: {
        id: number;
    };
}

// ============ 授权方信息 ============
export interface AuthorizerInfo {
    nickName: string;
    headImg: string;
    serviceTypeInfo: { id: number };
    verifyTypeInfo: { id: number };
    userName: string;           // 原始ID
    principalName: string;      // 主体名称
    signature: string;          // 公众号介绍
    alias?: string;
    businessInfo: {
        openStore: number;
        openScan: number;
        openPay: number;
        openCard: number;
        openShake: number;
    };
    qrcodeUrl: string;
}

// ============ 数据库模型 ============
export interface WechatAuthorization {
    id?: number;
    userId: string;                    // OpenClaw 用户ID
    authorizerAppId: string;           // 公众号 AppID
    authorizerRefreshToken: string;    // 刷新令牌
    funcInfo: number[];                // 授权的权限集ID列表
    nickName: string;
    headImg: string;
    userName: string;
    principalName: string;
    signature: string;
    serviceTypeInfo: number;
    verifyTypeInfo: number;
    authorizerAccessToken?: string;    // 代调用token（内存缓存）
    tokenExpiresAt?: Date;
    status: 'active' | 'revoked';
    createdAt: Date;
    updatedAt: Date;
}

// ============ 消息推送相关 ============
export type EventType = 
    | 'component_verify_ticket'
    | 'authorized'
    | 'unauthorized'
    | 'updateauthorized'
    | 'notify_third_fasteregister';

export interface AuthorizationEvent {
    appId: string;
    createTime: number;
    infoType: EventType;
    componentVerifyTicket?: string;
    authorizerAppId?: string;
    authorizationCode?: string;
    authorizationCodeExpiredTime?: number;
    preAuthCode?: string;
}

// ============ API 请求/响应 ============
export interface SendMessageRequest {
    touser: string;
    msgtype: 'text' | 'image' | 'voice' | 'video' | 'music' | 'news' | 'mpnews' | 'msgmenu' | 'wxcard' | 'miniprogrampage';
    text?: { content: string };
    image?: { media_id: string };
    voice?: { media_id: string };
    video?: {
        media_id: string;
        thumb_media_id?: string;
        title?: string;
        description?: string;
    };
    news?: {
        articles: Array<{
            title: string;
            description: string;
            url: string;
            picurl?: string;
        }>;
    };
    mpnews?: { media_id: string };
    wxcard?: { card_id: string };
    miniprogrampage?: {
        title: string;
        appid: string;
        pagepath: string;
        thumb_media_id: string;
    };
}

export interface UserInfo {
    subscribe: number;
    openid: string;
    nickname: string;
    sex: number;
    language: string;
    city: string;
    province: string;
    country: string;
    headimgurl: string;
    subscribeTime: number;
    remark: string;
    groupid: number;
    tagidList: number[];
    subscribeScene: string;
    qrScene: number;
    qrSceneStr: string;
}

// ============ 素材相关 ============
export interface MaterialUploadResponse {
    type: string;
    mediaId: string;
    createdAt: number;
}

export interface NewsArticle {
    title: string;
    thumbMediaId: string;
    author?: string;
    digest?: string;
    showCoverPic: 0 | 1;
    content: string;
    contentSourceUrl?: string;
    needOpenComment?: 0 | 1;
    onlyFansCanComment?: 0 | 1;
}

// ============ 错误处理 ============
export class WechatPlatformError extends Error {
    constructor(
        public code: string,
        message: string,
        public originalError?: any
    ) {
        super(message);
        this.name = 'WechatPlatformError';
    }
}

/**
 * 获客技能 - 类型定义
 */

// 线索状态
export type LeadStatus = 
  | 'new'           // 新线索
  | 'contacted'     // 已联系
  | 'responded'     // 已回复
  | 'meeting_scheduled' // 已约访
  | 'converted';    // 已转化

// 年龄段
export type AgeGroup = 'under_25' | '25_30' | '30_40' | '40_50' | 'over_50';

// 收入水平
export type IncomeLevel = 'low' | 'medium' | 'high' | 'ultra';

// 家庭状况
export type FamilyStatus = 'single' | 'married' | 'married_with_kids' | 'empty_nest' | 'retired';

// 需求类型
export type InsuranceNeed = 
  | 'critical_illness'  // 重疾
  | 'medical'           // 医疗
  | 'pension'           // 养老
  | 'education'         // 子女教育
  | 'wealth'            // 财富传承
  | 'accident'          // 意外
  | 'life';             // 寿险

// 意向度
export type IntentLevel = 'high' | 'medium' | 'low' | 'nurture';

// 线索来源
export type LeadSource = 
  | 'douyin'      // 抖音
  | 'weibo'       // 微博
  | 'wechat_article' // 公众号
  | 'wechat_video'   // 视频号
  | 'referral'    // 转介绍
  | 'offline';    // 线下

// 线索标签
export interface LeadTags {
  ageGroup?: AgeGroup;
  incomeLevel?: IncomeLevel;
  familyStatus?: FamilyStatus;
  needs: InsuranceNeed[];
  intent: IntentLevel;
  source: LeadSource;
  region?: string;
  occupation?: string;
}

// 互动记录
export interface Interaction {
  id: string;
  type: 'message' | 'call' | 'meeting' | 'note';
  content: string;
  direction: 'inbound' | 'outbound';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// 线索模型
export interface Lead {
  id: string;
  agentId: string;          // 所属经纪人
  name: string;
  phone?: string;
  wechatId?: string;
  tags: LeadTags;
  interactions: Interaction[];
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
  lastContactAt?: Date;
  nextFollowUpAt?: Date;
  notes?: string;
}

// 内容类型
export type ContentType = 'wechat_article' | 'video_script' | 'moments';

// 平台类型
export type PlatformType = 'wechat' | 'wechat_video' | 'douyin' | 'weibo';

// 内容生成请求
export interface ContentGenerationRequest {
  type: ContentType;
  topic: string;
  platform?: PlatformType;
  ipProfile?: string;       // IP人设描述
  targetAudience?: string;  // 目标受众
  style?: string;           // 风格
  duration?: number;        // 视频时长（秒）
}

// 内容生成结果
export interface ContentGenerationResult {
  titles?: string[];        // 备选标题
  content: string;          // 正文内容
  summary?: string;         // 摘要
  coverSuggestion?: string; // 封面建议
  tags?: string[];          // 标签/话题
  script?: {               // 视频脚本
    timeline: Array<{
      time: string;
      scene: string;
      dialogue: string;
    }>;
  };
  complianceChecked: boolean;
  complianceIssues?: string[];
}

// Cold Message生成请求
export interface ColdMessageRequest {
  leadId: string;
  leadProfile: string;      // 客户画像描述
  touchPoint: number;       // 第几次触达
  previousMessages?: string[]; // 历史消息
}

// Cold Message结果
export interface ColdMessageResult {
  messages: Array<{
    version: string;
    content: string;
    tone: string;
  }>;
  suggestedTime?: string;   // 建议发送时间
  followUpPlan?: string[];  // 后续跟进计划
}

// 账号配置
export interface AccountConfig {
  id: string;
  platform: PlatformType;
  name: string;
  appId?: string;
  appSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive: boolean;
}

// 公众号草稿
export interface WechatDraft {
  mediaId?: string;
  title: string;
  content: string;
  thumbMediaId?: string;
  digest?: string;
  contentSourceUrl?: string;
  showCoverPic?: boolean;
}

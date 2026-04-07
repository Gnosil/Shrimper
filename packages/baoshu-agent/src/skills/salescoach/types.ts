/**
 * 培训技能 - 类型定义
 */

// 产品资料类型
export type ProductMaterialType = 'pdf' | 'excel' | 'ppt' | 'video' | 'text';

// 产品资料
export interface ProductMaterial {
  id: string;
  productId: string;
  type: ProductMaterialType;
  filename: string;
  url: string;
  size: number;
  content?: string;       // 解析后的文本内容
  extractedData?: unknown; // 提取的结构化数据
  uploadedAt: Date;
  parsedAt?: Date;
}

// 保险产品
export interface InsuranceProduct {
  id: string;
  name: string;
  company: string;
  category: 'critical_illness' | 'medical' | 'pension' | 'life' | 'accident' | 'wealth';
  // 基础信息
  basicInfo: {
    minAge: number;
    maxAge: number;
    coveragePeriod: string;
    paymentMethods: string[];
    waitingPeriod?: string;
  };
  // 核心卖点
  sellingPoints: string[];
  // 保障内容
  coverage: {
    item: string;
    amount: string;
    description?: string;
  }[];
  // 目标客户画像
  targetProfiles: {
    description: string;
    ageRange?: string;
    incomeLevel?: string;
    familyStatus?: string;
    painPoints: string[];
  }[];
  // 常见异议及回应
  objections: {
    objection: string;
    response: string;
    alternativeResponse?: string;
  }[];
  // 竞品对比
  comparisons: {
    competitorProduct: string;
    ourAdvantages: string[];
    ourDisadvantages?: string[];
  }[];
  // 话术库
  scripts: {
    scenario: string;
    script: string;
    tips?: string;
  }[];
  materials: ProductMaterial[];
  createdAt: Date;
  updatedAt: Date;
}

// 复盘报告
export interface ReviewReport {
  id: string;
  agentId: string;
  leadId?: string;
  callRecordingUrl?: string;
  transcript: string;
  // 五维度评分
  scores: {
    needsDiscovery: number;      // 需求挖掘
    communication: number;       // 沟通技巧
    objectionHandling: number;   // 异议处理
    compliance: number;          // 合规规范
    closing: number;             // 成交机会
  };
  totalScore: number;
  // 详细分析
  analysis: {
    strengths: string[];         // 做得好的地方
    improvements: string[];      // 需要改进的地方
    missedSignals: string[];     // 错过的信号
    complianceIssues: string[];  // 合规问题
    identifiedNeeds: string[];   // 识别的需求
    missedNeeds: string[];       // 遗漏的需求
  };
  // 建议
  recommendations: string[];
  // 学习资源推荐
  learningResources: {
    type: 'video' | 'article' | 'script';
    title: string;
    url?: string;
  }[];
  createdAt: Date;
}

// 培训问答
export interface TrainingQA {
  id: string;
  productId: string;
  question: string;
  answer: string;
  category: 'product' | 'sales' | 'objection' | 'comparison';
  tags: string[];
  usageCount: number;
  helpfulCount: number;
  createdAt: Date;
}

// 销售场景
export type SalesScenario = 
  | 'first_contact'      // 首次接触
  | 'needs_analysis'     // 需求分析
  | 'product_intro'      // 产品介绍
  | 'objection_handling' // 异议处理
  | 'closing'            // 促单成交
  | 'follow_up';         // 跟进维护

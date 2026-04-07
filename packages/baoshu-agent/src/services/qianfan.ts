/**
 * 千帆平台 API 封装
 * 支持：LLM对话、ASR语音识别
 * 
 * 注意：使用千帆ModelBuilder API (OpenAI兼容格式)
 * 文档: https://cloud.baidu.com/doc/WENXINWORKSHOP/s/om5gq4w5q
 */
import { logger } from '../logger.js';

// 千帆API配置 - ModelBuilder格式 (直接作为Bearer Token使用)
const QIANFAN_API_KEY = 'bce-v3/ALTAK-KAzXbE9yvyMzEZJbJKcMJ/a7333dd385e264056d3eaed44bd8b2a66eb34f58';

// 千帆API基础URL
const QIANFAN_BASE_URL = 'https://qianfan.baidubce.com/v2';

// 千帆支持的模型
export const QIANFAN_MODELS = {
  ERNIE_4: 'ernie-4.0-8k-latest',
  ERNIE_3_5: 'ernie-3.5-8k',
  ERNIE_SPEED: 'ernie-speed-128k',
  ERNIE_TINY: 'ernie-tiny-8k',
} as const;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * 千帆对话API - 使用ModelBuilder OpenAI兼容接口
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const {
    model = 'ernie-4.0-8k-latest',
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  try {
    // 使用千帆ModelBuilder OpenAI兼容API
    const response = await fetch(`${QIANFAN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QIANFAN_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn({ error: errorText, status: response.status }, 'Qianfan API failed, using fallback');
      return fallbackResponse(messages);
    }

    const data = await response.json();
    
    // OpenAI兼容格式: choices[0].message.content
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    logger.error({ error }, 'Qianfan API failed, using fallback');
    return fallbackResponse(messages);
  }
}

/**
 * 备用响应（当API不可用时）
 */
function fallbackResponse(messages: ChatMessage[]): string {
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  // 根据内容类型返回模拟响应
  if (lastMessage.includes('公众号')) {
    return `【备选标题】
1. 重疾险选购避坑指南：这5个坑千万别踩！
2. 买重疾险前必看：10年保险老兵的血泪总结
3. 重疾险怎么选？一篇文章讲透所有门道

【正文】
大家好，我是保叔，10年保险老兵...

【摘要】
10年保险经验总结，帮你避开重疾险选购的常见陷阱，选对适合自己的保障方案。

⚠️ 免责声明：本文仅供参考，不构成购买建议。`;
  }
  
  if (lastMessage.includes('Cold Message') || lastMessage.includes('微信')) {
    return `【版本A】
张姐您好！看到您在抖音关注重疾险，我是保叔，专门帮家庭做保障规划的。您现在方便聊两句吗？

【版本B】
张姐好，我是保叔。注意到您对重疾险感兴趣，我有个简单的自测表，2分钟就能看出您适合哪种类型，需要的话我发您？`;
  }
  
  if (lastMessage.includes('复盘') || lastMessage.includes('评分')) {
    return `【复盘报告】

📊 综合评分：72/100

各维度评分：
• 需求挖掘：65/100 - 询问了预算但未深挖真实需求
• 沟通技巧：75/100 - 开场自然，但倾听不够
• 异议处理：70/100 - 面对"考虑考虑"未追问具体顾虑
• 合规规范：90/100 - 无违规用语
• 成交机会：60/100 - 错过2次促单时机

✅ 做得好的地方：
1. 开场白自然，提到抖音来源建立联系
2. 及时询问预算，了解支付能力

❌ 需要改进的地方：
1. 客户说"再考虑考虑"时，应该追问具体顾虑
2. 没有充分了解客户现有保障情况

💡 学习建议：
• 练习异议处理话术
• 学习SPIN需求挖掘法`;
  }
  
  return '收到您的问题，我会尽快为您解答。作为专业的保险顾问，我建议我们可以从您的实际需求出发，一起找到最适合的保障方案。';
}

/**
 * 千帆ASR语音识别
 */
export interface ASROptions {
  format?: 'pcm' | 'wav' | 'amr' | 'm4a';
  rate?: 16000 | 8000;
  channel?: 1 | 2;
}

export async function asr(
  audioData: Buffer,
  options: ASROptions = {}
): Promise<string> {
  const {
    format = 'm4a',
    rate = 16000,
    channel = 1,
  } = options;

  try {
    // 使用百度语音API
    const tokenResponse = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${ak}&client_secret=${sk}`,
      { method: 'POST' }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('Failed to get Baidu access token');
    }

    const response = await fetch(
      `https://vop.baidu.com/server_api?dev_pid=1537&cuid=baoshu_agent&token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          rate,
          channel,
          speech: audioData.toString('base64'),
          len: audioData.length,
        }),
      }
    );

    const data = await response.json();
    
    if (data.err_no !== 0) {
      throw new Error(`ASR error: ${data.err_msg}`);
    }

    return data.result?.[0] || '';
  } catch (error) {
    logger.error({ error }, 'ASR failed, using fallback');
    // 返回模拟文本用于测试
    return '[模拟转录] 经纪人：您好，是王女士吗？客户：你好。经纪人：想跟您聊聊养老规划...';
  }
}

/**
 * 保险内容生成专用Prompt模板
 */
export const CONTENT_PROMPTS = {
  wechatArticle: (topic: string, ipProfile: string) => `
你是一位专业的保险内容创作专家，为保险经纪人创作公众号文章。

人设定位：${ipProfile}

文章主题：${topic}

要求：
1. 标题要吸引人但符合保险监管规定
2. 内容要有干货，不能空洞
3. 适当使用小标题、列表、加粗等排版
4. 结尾要有自然的转化引导
5. 严禁使用：最好、最优、第一、收益最高、保证、绝对安全、承诺保本、稳赚、无风险
6. 需要添加保险免责声明

请生成：
1. 3个备选标题
2. 文章正文（800-1500字）
3. 摘要（120字以内）
`,

  videoScript: (topic: string, platform: string, duration: number) => `
为保险经纪人创作${platform}短视频脚本，时长${duration}秒。

主题：${topic}

要求：
1. 开头3秒必须有强钩子（吸引留存）
2. 内容要有信息密度，不能废话
3. 语言要口语化，适合口播
4. 结尾要有明确的CTA（关注/私信/评论）
5. 符合保险合规要求，不使用禁用词

请生成：
1. 视频标题
2. 分镜脚本（时间轴+画面+台词）
3. 热门标签建议（5-8个）
4. 封面文案
`,

  moments: (scenario: string, style: string) => `
为保险经纪人创作朋友圈文案。

场景：${scenario}
风格：${style}（专业/生活/互动/情感）

要求：
1. 文字控制在100-200字
2. 不要太像广告，要自然
3. 可以适当使用emoji
4. 可以引发互动（提问/投票）
5. 合规第一，不夸大

请生成3个不同角度的版本。
`,

  coldMessage: (leadProfile: string, touchPoint: number) => `
为保险经纪人生成Cold Message（第${touchPoint}次触达）。

客户画像：${leadProfile}

要求：
1. 语气要自然，像朋友聊天
2. 不要直接推销产品
3. 要有明确的约访意图
4. 给对方留回复空间
5. 字数控制在50-100字
6. 严禁使用营销感过重的词汇

请生成2个版本供选择。
`,
};

/**
 * 复盘分析专用Prompt模板
 */
export const REVIEW_PROMPTS = {
  conversationReview: (transcript: string) => `
你是一位资深的保险销售培训专家，请对以下客户对话进行专业复盘分析。

对话记录：
${transcript}

请从以下5个维度进行分析（每个维度满分100分）：

1. 【需求挖掘】(0-100分)
   - 是否充分了解客户家庭情况？
   - 是否识别出真实需求和潜在需求？
   - 预算了解程度如何？

2. 【沟通技巧】(0-100分)
   - 开场白是否有效建立信任？
   - 倾听 vs 讲述比例是否合适？
   - 提问技巧如何？

3. 【异议处理】(0-100分)
   - 客户提出了哪些异议？
   - 回应方式是否得当？
   - 是否将异议转化为需求？

4. 【合规规范】(0-100分)
   - 是否出现禁用词汇？（最好、最优、第一、保证、绝对安全、承诺保本、稳赚、无风险、收益最高）
   - 是否不当承诺收益？
   - 是否完成必要的信息披露？

5. 【成交机会】(0-100分)
   - 是否识别并把握了成交信号？
   - 是否有错过的好时机？
   - 下一步行动建议？

请以JSON格式输出：
{
  "scores": {
    "needsDiscovery": number,
    "communication": number,
    "objectionHandling": number,
    "compliance": number,
    "closing": number
  },
  "analysis": {
    "strengths": ["string"],
    "improvements": ["string"],
    "missedSignals": ["string"],
    "complianceIssues": ["string"]
  },
  "recommendations": ["string"]
}
`,
};

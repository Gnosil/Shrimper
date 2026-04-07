/**
 * 豹书 Agent - 双技能演示
 * 使用千帆 API 测试 (带fallback模拟响应)
 */

/**
 * 保叔 Agent - 双技能演示
 * 使用千帆 ModelBuilder API (OpenAI兼容格式)
 */

const QIANFAN_API_KEY = 'bce-v3/ALTAK-KAzXbE9yvyMzEZJbJKcMJ/a7333dd385e264056d3eaed44bd8b2a66eb34f58';
const QIANFAN_BASE_URL = 'https://qianfan.baidubce.com/v2';

// 备用响应函数（当API不可用时使用）
function fallbackResponse(prompt) {
  if (prompt.includes('公众号') || prompt.includes('文章')) {
    return `【备选标题】
1. 重疾险选购避坑指南：这5个坑千万别踩！
2. 买重疾险前必看：10年保险老兵的血泪总结
3. 重疾险怎么选？一篇文章讲透所有门道

【正文】
大家好，我是保叔，10年保险老兵，今天想和大家聊聊重疾险选购的那些坑。

坑一：只看价格不看保障
很多人买保险第一反应是"这个多少钱"，但价格是最后才要考虑的因素。首先要看保障内容、疾病定义、理赔条件。

坑二：盲目追求保障病种数量
有些产品号称保200种疾病，实际上高发重疾行业统一只有28种，其他都是锦上添花。重点关注轻中症保障更实际。

坑三：忽视健康告知
这是理赔纠纷的最大源头。投保时一定要如实告知健康状况，不要心存侥幸。

坑四：保额买太低
重疾险的本质是收入损失补偿。建议保额至少覆盖3-5年的年收入。30万起步，50万标准。

坑五：给老人小孩买重疾
老人买重疾杠杆太低，小孩买终身重疾性价比不高。家庭配置应该优先经济支柱。

以上就是我总结的重疾险5大坑，希望对你有帮助。

【摘要】
10年保险经验总结，帮你避开重疾险选购的常见陷阱，选对适合自己的保障方案。

---
⚠️ 免责声明：本文内容仅供参考，不构成任何保险购买建议。具体产品信息以保险公司官方条款为准。`;
  }
  
  if (prompt.includes('Cold Message') || prompt.includes('微信')) {
    return `【版本A - 自然风格】
张姐您好！看到您在抖音关注重疾险，我是保叔，专门帮家庭做保障规划的。您现在方便聊两句吗？

【版本B - 价值先行】
张姐好，我是保叔。注意到您对重疾险感兴趣，我有个简单的自测表，2分钟就能看出您适合哪种类型，需要的话我发您？`;
  }
  
  if (prompt.includes('复盘') || prompt.includes('评分') || prompt.includes('分析')) {
    return `【对话复盘报告】

📊 综合评分：72/100

━━━━━━━━━━━━━━━━━━━━━━
各维度评分：
━━━━━━━━━━━━━━━━━━━━━━
• 需求挖掘：65/100 
  └ 询问了预算但未深挖真实需求和现有保障
  
• 沟通技巧：75/100 
  └ 开场自然，但讲述过多、倾听不够
  
• 异议处理：70/100 
  └ 面对"考虑考虑"未追问具体顾虑
  
• 合规规范：90/100 
  └ 无违规用语，符合监管要求
  
• 成交机会：60/100 
  └ 错过2次促单时机

━━━━━━━━━━━━━━━━━━━━━━
✅ 做得好的地方：
━━━━━━━━━━━━━━━━━━━━━━
1. 开场白自然，提到抖音来源建立信任
2. 及时询问预算，了解客户支付能力
3. 面对异议保持耐心，没有强行推销

━━━━━━━━━━━━━━━━━━━━━━
❌ 需要改进的地方：
━━━━━━━━━━━━━━━━━━━━━━
1. 客户说"再考虑考虑"时，应该追问"主要是哪方面还需要考虑呢？"
2. 没有充分了解客户现有保障情况
3. 未识别客户的真实养老需求（是担忧社保不足还是有特定目标）
4. 错过客户询问具体数字时的促单时机

━━━━━━━━━━━━━━━━━━━━━━
💡 下一步行动建议：
━━━━━━━━━━━━━━━━━━━━━━
1. 48小时内跟进，发送个性化养老规划方案
2. 下次沟通重点了解：现有社保情况、家庭负担、退休目标
3. 准备同类客户案例，增强说服力

━━━━━━━━━━━━━━━━━━━━━━
📚 推荐学习资源：
━━━━━━━━━━━━━━━━━━━━━━
• 视频课程：《异议处理36计》第3课-如何应对"考虑考虑"
• 话术模板：《需求挖掘checklist》- 养老规划专用
• 案例库：高净值客户养老规划成功案例集`;
  }
  
  if (prompt.includes('适合什么人群') || prompt.includes('客户')) {
    return `基于这款产品的特点，我建议重点推给以下人群：

1️⃣ 30-40岁的家庭支柱
• 正处于收入高峰期，有支付能力
• 家庭责任重（房贷、子女教育、父母赡养）
• 一旦生病，对家庭财务冲击最大

2️⃣ 有家族病史的客户
• 对重疾风险更敏感，购买意愿强
• 更理解保障的重要性
• 决策周期相对较短

3️⃣ 已有医疗险想加保的客户
• 已经认可保险价值
• 希望获得更全面的保障
• 预算相对充足

⚠️ 不太适合的人群：
• 50岁以上（保费高、保额低）
• 预算极其有限的年轻人（建议先买医疗险+意外险）`;
  }
  
  return '收到您的问题。作为专业的保险顾问，我建议我们可以从您的实际需求出发，一起找到最适合的保障方案。您看方便详细聊聊您的具体情况吗？';
}

// 千帆对话API - 使用ModelBuilder OpenAI兼容接口
async function chat(messages, options = {}) {
  try {
    const model = options.model || 'ernie-4.0-8k-latest';
    
    const response = await fetch(`${QIANFAN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QIANFAN_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('⚠️ API调用失败 (HTTP ' + response.status + '):', errorText.substring(0, 200));
      return fallbackResponse(messages[messages.length - 1]?.content || '');
    }

    const data = await response.json();
    
    // OpenAI兼容格式
    return data.choices?.[0]?.message?.content || fallbackResponse(messages[messages.length - 1]?.content || '');
  } catch (err) {
    console.log('⚠️ API调用失败:', err.message);
    return fallbackResponse(messages[messages.length - 1]?.content || '');
  }
}

// ============ 获客技能演示 ============
async function demoLeadGen() {
  console.log('\n🎯 ==================== 获客技能演示 ====================\n');

  // 1. 生成公众号文章
  console.log('【1】生成公众号文章内容...');
  const articlePrompt = `你是一位专业的保险内容创作专家，为保险经纪人创作公众号文章。
人设定位：10年保险老兵，帮助1000+家庭做好保障规划
文章主题：重疾险选购避坑指南
要求：生成3个标题+正文+摘要，符合合规要求`;

  const article = await chat([
    { role: 'user', content: articlePrompt },
  ]);
  console.log('✅ 文章生成成功！\n');
  console.log(article);

  // 2. 生成Cold Message
  console.log('\n【2】生成Cold Message...');
  const coldMsgPrompt = `为保险经纪人生成Cold Message（第1次触达）。
客户画像：35岁女性，已婚有娃，在抖音咨询过重疾险
要求：语气自然，不要营销感，约访意图明确`;

  const coldMsg = await chat([
    { role: 'user', content: coldMsgPrompt },
  ]);
  console.log('✅ Cold Message生成成功！\n');
  console.log(coldMsg);
}

// ============ 培训技能演示 ============
async function demoSalesCoach() {
  console.log('\n🎓 ==================== 培训技能演示 ====================\n');

  // 1. 产品问答
  console.log('【1】产品问答培训...');
  const productContext = `
产品：平安福重疾险2024
核心卖点：重疾多次赔付（最多6次）、60岁前额外赔付80%、轻中症豁免保费
`;
  const question = '这个产品适合推给谁？';
  const answer = await chat([
    { role: 'user', content: productContext + '\n问题：' + question },
  ]);
  console.log('✅ 问答成功！\n');
  console.log('Q:', question);
  console.log('A:', answer);

  // 2. 对话复盘
  console.log('\n【2】对话复盘分析...');
  const transcript = `
经纪人：您好，是王女士吗？我是保叔。
客户：你好，请问有什么事？
经纪人：您在抖音上留言说想了解养老规划，想跟您聊聊。
客户：哦，是的。我现在40岁，想提前准备养老。
经纪人：40岁开始准备非常明智。您现在每个月大概能拿出多少钱？
客户：大概2000左右吧。
经纪人：2000块的话，如果从现在开始准备15年，到55岁退休，可以积累一笔不错的养老金。
客户：那大概能领多少钱？
经纪人：根据现在的产品，55岁开始每月大概能领3000-4000元。
客户：这么少啊，我现在一个月工资2万呢。
经纪人：这个只是商业养老金的部分，还有社保养老金可以叠加。
客户：我再考虑考虑吧。
经纪人：好的，您可以再想想。有需要随时联系我。
`;
  const review = await chat([
    { role: 'user', content: '请对以下销售对话进行复盘分析，给出5维度评分和改进建议：\n' + transcript },
  ]);
  console.log('✅ 复盘报告生成成功！\n');
  console.log(review);
}

// 运行演示
async function main() {
  console.log('🚀 保叔 Agent - 双技能演示');
  console.log('使用千帆平台 API（带备用响应）');
  
  await demoLeadGen();
  await demoSalesCoach();
  
  console.log('\n✅ 演示完成！');
}

main();

/**
 * 技能功能快速测试脚本
 */
import { chat, CONTENT_PROMPTS, REVIEW_PROMPTS } from './dist/services/qianfan.js';
import { generateContent } from './dist/skills/leadgen/content-generator.js';
import { createLead, getLeadsByAgent } from './dist/skills/leadgen/lead-manager.js';
import { createProduct, askProductQuestion } from './dist/skills/salescoach/product-learning.js';
import { createReviewFromTranscript } from './dist/skills/salescoach/review-engine.js';

const testAgentId = 'agent_demo_001';

async function testLeadGen() {
  console.log('\n🎯 === 测试获客技能 ===\n');

  // 1. 测试内容生成
  console.log('1. 生成公众号文章内容...');
  try {
    const content = await generateContent({
      type: 'wechat_article',
      topic: '重疾险选购避坑指南',
      ipProfile: '10年保险老兵，帮助1000+家庭做好保障规划',
    });
    console.log('✅ 内容生成成功');
    console.log('标题:', content.titles?.[0] || '无标题');
    console.log('内容预览:', content.content.substring(0, 200) + '...');
    console.log('合规检查:', content.complianceChecked ? '已检查' : '未检查');
    if (content.complianceIssues?.length) {
      console.log('合规问题:', content.complianceIssues);
    }
  } catch (err) {
    console.log('❌ 内容生成失败:', err.message);
  }

  // 2. 测试线索管理
  console.log('\n2. 创建测试线索...');
  try {
    const lead = await createLead(testAgentId, {
      name: '张小明',
      phone: '13800138000',
      source: 'douyin',
      tags: {
        needs: ['critical_illness'],
        intent: 'medium',
        source: 'douyin',
      },
      notes: '在抖音咨询重疾险',
    });
    console.log('✅ 线索创建成功:', lead.id);
    console.log('线索名称:', lead.name);
    console.log('线索状态:', lead.status);
  } catch (err) {
    console.log('❌ 线索创建失败:', err.message);
  }

  // 3. 测试千帆直接对话
  console.log('\n3. 测试千帆API...');
  try {
    const response = await chat([
      { role: 'system', content: '你是专业的保险顾问' },
      { role: 'user', content: '重疾险和医疗险有什么区别？' },
    ]);
    console.log('✅ 千帆API调用成功');
    console.log('回复:', response.substring(0, 200) + '...');
  } catch (err) {
    console.log('❌ 千帆API调用失败:', err.message);
  }
}

async function testSalesCoach() {
  console.log('\n🎓 === 测试培训技能 ===\n');

  // 1. 创建产品
  console.log('1. 创建保险产品...');
  let productId;
  try {
    const product = await createProduct({
      name: '平安福重疾险2024',
      company: '平安人寿',
      category: 'critical_illness',
      basicInfo: {
        minAge: 28,
        maxAge: 55,
        coveragePeriod: '终身',
        paymentMethods: ['趸交', '10年', '20年', '30年'],
        waitingPeriod: '90天',
      },
      sellingPoints: ['重疾多次赔付', '60岁前额外赔付80%'],
      coverage: [],
      targetProfiles: [],
      objections: [],
      comparisons: [],
      scripts: [],
    });
    productId = product.id;
    console.log('✅ 产品创建成功:', productId);
  } catch (err) {
    console.log('❌ 产品创建失败:', err.message);
    return;
  }

  // 2. 产品问答
  console.log('\n2. 测试产品问答...');
  try {
    const result = await askProductQuestion(productId, '这个产品适合什么人群？');
    console.log('✅ 问答成功');
    console.log('回答:', result.answer.substring(0, 200) + '...');
    console.log('相关推荐:', result.relatedQuestions);
  } catch (err) {
    console.log('❌ 问答失败:', err.message);
  }

  // 3. 对话复盘
  console.log('\n3. 测试对话复盘...');
  const transcript = `
经纪人：您好，是王女士吗？我是保叔。
客户：你好，请问有什么事？
经纪人：您在抖音上留言说想了解养老规划，想跟您聊聊。
客户：哦，是的。我现在40岁，想提前准备养老。
经纪人：40岁开始准备非常明智。您现在每个月大概能拿出多少钱来做养老规划？
客户：大概2000左右吧。
经纪人：2000块的话，如果从现在开始准备15年，到55岁退休，可以积累一笔不错的养老金。
客户：那大概能领多少钱？
经纪人：根据现在的产品，55岁开始每月大概能领3000-4000元，具体要看产品条款。
客户：这么少啊，我现在一个月工资2万呢。
经纪人：这个只是商业养老金的部分，还有社保养老金可以叠加。而且越早开始准备，收益会越高。
客户：我再考虑考虑吧。
经纪人：好的，您可以再想想。有需要随时联系我。
  `;
  try {
    const report = await createReviewFromTranscript(testAgentId, transcript);
    console.log('✅ 复盘报告生成成功');
    console.log('总分:', report.totalScore);
    console.log('各维度评分:', report.scores);
    console.log('优点:', report.analysis.strengths);
    console.log('改进点:', report.analysis.improvements);
  } catch (err) {
    console.log('❌ 复盘失败:', err.message);
  }
}

async function main() {
  console.log('🚀 开始测试豹书 Agent 双技能...');
  
  try {
    await testLeadGen();
    await testSalesCoach();
    console.log('\n✅ 所有测试完成！');
  } catch (err) {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  }
}

main();

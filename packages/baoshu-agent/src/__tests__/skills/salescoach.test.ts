/**
 * 培训技能测试
 */
import { describe, it, expect } from 'vitest';
import {
  createProduct,
  askProductQuestion,
  createReviewFromTranscript,
  getProduct,
  listProducts,
} from '../../skills/salescoach/index.js';

describe('培训技能', () => {
  const testAgentId = 'agent_test_001';

  describe('产品学习', () => {
    let testProductId: string;

    it('应该能创建产品', async () => {
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
        sellingPoints: [
          '重疾多次赔付，最多6次',
          '60岁前额外赔付80%',
          '轻中症豁免保费',
        ],
        coverage: [
          { item: '重大疾病', amount: '100万', description: '120种重疾' },
          { item: '中症疾病', amount: '50万', description: '20种中症' },
          { item: '轻症疾病', amount: '30万', description: '40种轻症' },
        ],
        targetProfiles: [
          {
            description: '30-40岁家庭支柱',
            ageRange: '30-40',
            incomeLevel: '中等及以上',
            painPoints: ['担心重疾带来的收入中断', '希望给家人稳定保障'],
          },
        ],
        objections: [
          {
            objection: '保费太贵',
            response: '分摊到每天只需XX元，也就一杯咖啡的钱',
          },
        ],
        comparisons: [],
        scripts: [],
      });

      expect(product).toBeDefined();
      expect(product.id).toBeTruthy();
      testProductId = product.id;
      console.log('创建的产品ID:', product.id);
    });

    it('应该能获取产品信息', async () => {
      const product = await getProduct(testProductId);
      expect(product).toBeDefined();
      expect(product?.name).toBe('平安福重疾险2024');
    });

    it('应该能列出所有产品', async () => {
      const products = await listProducts();
      expect(products.length).toBeGreaterThanOrEqual(1);
    });

    it('应该能回答产品相关问题', async () => {
      const result = await askProductQuestion(testProductId, '这个产品适合什么人群？');
      
      expect(result).toBeDefined();
      expect(result.answer).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
      console.log('问题回答:', result.answer);
    }, 30000);

    it('应该能回答异议处理问题', async () => {
      const result = await askProductQuestion(testProductId, '客户说保费太贵怎么办？');
      
      expect(result).toBeDefined();
      expect(result.answer).toBeTruthy();
      console.log('异议处理:', result.answer);
    }, 30000);
  });

  describe('对话复盘', () => {
    it('应该能从对话文本生成复盘报告', async () => {
      // 模拟一段销售对话
      const transcript = `
经纪人：您好，是张女士吗？我是保叔，您在抖音上咨询过重疾险。
客户：哦，你好。
经纪人：看您之前说想了解重疾险，是给自己看还是给家人看呢？
客户：给我老公看，他今年35岁。
经纪人：35岁正是家庭责任最重的时候。您老公平时工作忙吗？
客户：挺忙的，经常出差。
经纪人：那确实需要一份保障。我们这款重疾险最高可以赔6次...
客户：6次？人哪会得那么多次重疾？
经纪人：这个...其实是比较极端的情况，主要是保障全面。
客户：保费大概多少？
经纪人：35岁男性，保额50万，年缴大概12000左右，交20年保终身。
客户：有点贵啊。
经纪人：确实不便宜，但是考虑到保障全面，还是值得的。
客户：我再考虑考虑吧。
经纪人：好的，您考虑好了随时联系我。
      `;

      const report = await createReviewFromTranscript(testAgentId, transcript, 'lead_test_001');

      expect(report).toBeDefined();
      expect(report.id).toBeTruthy();
      expect(report.scores).toBeDefined();
      expect(report.totalScore).toBeGreaterThan(0);
      expect(report.analysis).toBeDefined();
      expect(report.recommendations).toBeDefined();

      console.log('复盘报告ID:', report.id);
      console.log('总分:', report.totalScore);
      console.log('各维度评分:', report.scores);
      console.log('优点:', report.analysis.strengths);
      console.log('改进点:', report.analysis.improvements);
      console.log('学习资源:', report.learningResources);
    }, 60000);

    it('应该能识别合规问题', async () => {
      // 包含违规用语的对话
      const transcript = `
经纪人：王哥，这款保险绝对是市场上最好的重疾险。
客户：是吗？
经纪人：对，保证收益最高，买了绝对不亏，稳赚不赔。
客户：真的假的？
经纪人：我承诺您，这个保险绝对安全，收益第一。
      `;

      const report = await createReviewFromTranscript(testAgentId, transcript);

      expect(report.scores.compliance).toBeLessThan(90);
      expect(report.analysis.complianceIssues.length).toBeGreaterThan(0);
      console.log('合规问题:', report.analysis.complianceIssues);
    }, 60000);
  });
});

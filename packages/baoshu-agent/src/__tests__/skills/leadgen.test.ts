/**
 * 获客技能测试
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateContent,
  createLead,
  importLeads,
  getLead,
  getLeadsByAgent,
  generateColdMessage,
} from '../../skills/leadgen/index.js';

describe('获客技能', () => {
  const testAgentId = 'agent_test_001';

  describe('内容生成', () => {
    it('应该能生成公众号文章内容', async () => {
      const result = await generateContent({
        type: 'wechat_article',
        topic: '重疾险选购指南',
        ipProfile: '10年保险老兵，帮助1000+家庭做好保障规划',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
      expect(result.complianceChecked).toBe(true);
      console.log('生成的内容:', result.content.substring(0, 200));
    }, 30000);

    it('应该能生成朋友圈文案', async () => {
      const result = await generateContent({
        type: 'moments',
        topic: '养老金并轨政策解读',
        style: '专业',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
      console.log('朋友圈文案:', result.content);
    }, 30000);

    it('应该能生成视频脚本', async () => {
      const result = await generateContent({
        type: 'video_script',
        topic: '年轻人为什么需要重疾险',
        platform: 'wechat_video',
        duration: 60,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
      console.log('视频脚本:', result.content.substring(0, 300));
    }, 30000);
  });

  describe('线索管理', () => {
    let testLeadId: string;

    it('应该能创建新线索', async () => {
      const lead = await createLead(testAgentId, {
        name: '张三',
        phone: '13800138000',
        wechatId: 'zhangsan123',
        source: 'douyin',
        tags: {
          ageGroup: '30_40',
          incomeLevel: 'high',
          familyStatus: 'married_with_kids',
          needs: ['critical_illness', 'education'],
          intent: 'medium',
        },
        notes: '在抖音视频下留言咨询',
      });

      expect(lead).toBeDefined();
      expect(lead.id).toBeTruthy();
      expect(lead.name).toBe('张三');
      expect(lead.status).toBe('new');
      testLeadId = lead.id;
      console.log('创建的线索:', lead.id);
    });

    it('应该能批量导入线索', async () => {
      const result = await importLeads(testAgentId, [
        {
          name: '李四',
          phone: '13900139000',
          source: 'weibo',
          tags: { needs: ['pension'], intent: 'high' },
        },
        {
          name: '王五',
          wechatId: 'wangwu456',
          source: 'referral',
          tags: { needs: ['medical'], intent: 'low' },
        },
      ]);

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      console.log('批量导入成功:', result.success.length);
    });

    it('应该能获取线索详情', async () => {
      const lead = await getLead(testLeadId);
      expect(lead).toBeDefined();
      expect(lead?.name).toBe('张三');
    });

    it('应该能按经纪人获取线索列表', async () => {
      const leads = await getLeadsByAgent(testAgentId);
      expect(leads.length).toBeGreaterThanOrEqual(1);
      console.log('线索总数:', leads.length);
    });

    it('应该能按条件筛选线索', async () => {
      const leads = await getLeadsByAgent(testAgentId, {
        source: 'douyin',
        intent: 'medium',
      });
      expect(leads.length).toBeGreaterThanOrEqual(1);
      console.log('筛选结果:', leads.length);
    });
  });

  describe('Cold Message生成', () => {
    it('应该能生成Cold Message', async () => {
      const result = await generateColdMessage({
        leadId: 'lead_test_001',
        leadProfile: '35岁女性，已婚有娃，关注养老规划，中等收入',
        touchPoint: 1,
      });

      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThanOrEqual(1);
      console.log('Cold Message版本A:', result.messages[0]?.content);
    }, 30000);

    it('第二次触达应该有不同的策略', async () => {
      const result = await generateColdMessage({
        leadId: 'lead_test_001',
        leadProfile: '35岁女性，已婚有娃，之前聊过重疾险',
        touchPoint: 2,
        previousMessages: ['你好，我是保叔'],
      });

      expect(result).toBeDefined();
      expect(result.followUpPlan).toBeDefined();
      console.log('跟进计划:', result.followUpPlan);
    }, 30000);
  });
});

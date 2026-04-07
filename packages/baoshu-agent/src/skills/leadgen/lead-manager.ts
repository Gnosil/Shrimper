/**
 * 获客技能 - 线索管理器
 * 支持：线索CRUD、标签管理、导入导出
 */
import { logger } from '../../logger.js';
import type { Lead, LeadTags, LeadStatus, Interaction, LeadSource } from './types.js';

// 内存存储（后续可替换为数据库存储）
const leadsStore = new Map<string, Lead>();

/**
 * 创建线索
 */
export async function createLead(
  agentId: string,
  data: {
    name: string;
    phone?: string;
    wechatId?: string;
    tags: Partial<LeadTags>;
    source: LeadSource;
    notes?: string;
  }
): Promise<Lead> {
  const lead: Lead = {
    id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    name: data.name,
    phone: data.phone,
    wechatId: data.wechatId,
    tags: {
      needs: data.tags.needs || [],
      intent: data.tags.intent || 'nurture',
      source: data.source,
      ageGroup: data.tags.ageGroup,
      incomeLevel: data.tags.incomeLevel,
      familyStatus: data.tags.familyStatus,
      region: data.tags.region,
      occupation: data.tags.occupation,
    },
    interactions: [],
    status: 'new',
    createdAt: new Date(),
    updatedAt: new Date(),
    notes: data.notes,
  };

  leadsStore.set(lead.id, lead);
  logger.info({ leadId: lead.id, agentId }, 'Lead created');

  return lead;
}

/**
 * 批量导入线索
 */
export async function importLeads(
  agentId: string,
  leadsData: Array<{
    name: string;
    phone?: string;
    wechatId?: string;
    source: LeadSource;
    tags?: Partial<LeadTags>;
    notes?: string;
  }>
): Promise<{ success: Lead[]; failed: Array<{ data: unknown; error: string }> }> {
  const success: Lead[] = [];
  const failed: Array<{ data: unknown; error: string }> = [];

  for (const data of leadsData) {
    try {
      const lead = await createLead(agentId, data);
      success.push(lead);
    } catch (error) {
      failed.push({
        data,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.info({ 
    total: leadsData.length, 
    success: success.length, 
    failed: failed.length 
  }, 'Leads import completed');

  return { success, failed };
}

/**
 * 获取线索
 */
export async function getLead(leadId: string): Promise<Lead | null> {
  return leadsStore.get(leadId) || null;
}

/**
 * 获取经纪人的所有线索
 */
export async function getLeadsByAgent(
  agentId: string,
  filters?: {
    status?: LeadStatus;
    intent?: string;
    source?: LeadSource;
    needs?: string;
  }
): Promise<Lead[]> {
  let leads = Array.from(leadsStore.values()).filter(l => l.agentId === agentId);

  if (filters?.status) {
    leads = leads.filter(l => l.status === filters.status);
  }
  if (filters?.intent) {
    leads = leads.filter(l => l.tags.intent === filters.intent);
  }
  if (filters?.source) {
    leads = leads.filter(l => l.tags.source === filters.source);
  }
  if (filters?.needs) {
    leads = leads.filter(l => l.tags.needs.includes(filters.needs as any));
  }

  return leads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * 更新线索
 */
export async function updateLead(
  leadId: string,
  updates: Partial<Omit<Lead, 'id' | 'createdAt'>>
): Promise<Lead | null> {
  const lead = leadsStore.get(leadId);
  if (!lead) return null;

  Object.assign(lead, updates, { updatedAt: new Date() });
  leadsStore.set(leadId, lead);

  logger.info({ leadId }, 'Lead updated');
  return lead;
}

/**
 * 添加互动记录
 */
export async function addInteraction(
  leadId: string,
  interaction: Omit<Interaction, 'id' | 'timestamp'>
): Promise<Lead | null> {
  const lead = leadsStore.get(leadId);
  if (!lead) return null;

  const newInteraction: Interaction = {
    ...interaction,
    id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };

  lead.interactions.push(newInteraction);
  lead.lastContactAt = new Date();
  lead.updatedAt = new Date();

  // 根据互动更新状态
  if (interaction.direction === 'inbound') {
    lead.status = 'responded';
  } else if (lead.status === 'new') {
    lead.status = 'contacted';
  }

  leadsStore.set(leadId, lead);
  return lead;
}

/**
 * 删除线索
 */
export async function deleteLead(leadId: string): Promise<boolean> {
  const existed = leadsStore.has(leadId);
  leadsStore.delete(leadId);
  return existed;
}

/**
 * 获取线索统计
 */
export async function getLeadStats(agentId: string): Promise<{
  total: number;
  byStatus: Record<LeadStatus, number>;
  byIntent: Record<string, number>;
  bySource: Record<string, number>;
  byNeeds: Record<string, number>;
}> {
  const leads = await getLeadsByAgent(agentId);

  const stats = {
    total: leads.length,
    byStatus: {} as Record<LeadStatus, number>,
    byIntent: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
    byNeeds: {} as Record<string, number>,
  };

  for (const lead of leads) {
    // 按状态统计
    stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;
    // 按意向统计
    stats.byIntent[lead.tags.intent] = (stats.byIntent[lead.tags.intent] || 0) + 1;
    // 按来源统计
    stats.bySource[lead.tags.source] = (stats.bySource[lead.tags.source] || 0) + 1;
    // 按需求统计
    for (const need of lead.tags.needs) {
      stats.byNeeds[need] = (stats.byNeeds[need] || 0) + 1;
    }
  }

  return stats;
}

/**
 * AI自动标签
 */
export async function autoTagLead(
  leadId: string,
  conversationText: string
): Promise<Lead | null> {
  // TODO: 调用千帆进行意图识别和标签提取
  logger.info({ leadId }, 'Auto tagging lead (placeholder)');
  return getLead(leadId);
}

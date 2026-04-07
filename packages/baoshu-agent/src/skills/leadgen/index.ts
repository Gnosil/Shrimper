/**
 * 获客技能 - 入口模块
 * 导出所有获客相关功能
 */

// 类型定义
export * from './types.js';

// 核心功能
export { generateContent, generateMultiPlatformContent } from './content-generator.js';
export {
  createLead,
  importLeads,
  getLead,
  getLeadsByAgent,
  updateLead,
  addInteraction,
  deleteLead,
  getLeadStats,
  autoTagLead,
} from './lead-manager.js';
export { generateColdMessage, generateFriendRequestNote, getHumanizedStrategy } from './cold-message.js';
export {
  configureWechat,
  createDraft,
  createDraftFromContent,
  listDrafts,
  deleteDraft,
  uploadImage,
} from './wechat-publisher.js';

/**
 * 培训技能 - 入口模块
 * 导出所有培训相关功能
 */

// 类型定义
export * from './types.js';

// 核心功能
export {
  createProduct,
  uploadMaterial,
  askProductQuestion,
  getProduct,
  listProducts,
} from './product-learning.js';
export {
  createReviewFromRecording,
  createReviewFromTranscript,
  getReview,
  getReviewsByAgent,
  getCapabilityTrend,
} from './review-engine.js';

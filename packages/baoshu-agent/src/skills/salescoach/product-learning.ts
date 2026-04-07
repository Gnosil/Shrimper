/**
 * 培训技能 - 产品学习系统
 * 支持：产品资料解析、知识图谱构建、互动问答
 */
import { chat } from '../../services/qianfan.js';
import { logger } from '../../logger.js';
import type { 
  InsuranceProduct, 
  ProductMaterial, 
  TrainingQA,
  ProductMaterialType 
} from './types.js';

// 内存存储
const productsStore = new Map<string, InsuranceProduct>();
const qaStore = new Map<string, TrainingQA[]>();

/**
 * 创建新产品
 */
export async function createProduct(
  data: Omit<InsuranceProduct, 'id' | 'materials' | 'createdAt' | 'updatedAt'>
): Promise<InsuranceProduct> {
  const product: InsuranceProduct = {
    ...data,
    id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    materials: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  productsStore.set(product.id, product);
  qaStore.set(product.id, []);

  logger.info({ productId: product.id, name: product.name }, 'Product created');
  return product;
}

/**
 * 上传产品资料
 */
export async function uploadMaterial(
  productId: string,
  file: {
    type: ProductMaterialType;
    filename: string;
    data: Buffer;
    size: number;
  }
): Promise<ProductMaterial> {
  const product = productsStore.get(productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  // 保存文件（这里简化处理，实际应上传到存储服务）
  const material: ProductMaterial = {
    id: `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    productId,
    type: file.type,
    filename: file.filename,
    url: `/uploads/${file.filename}`, // 简化路径
    size: file.size,
    uploadedAt: new Date(),
  };

  // 解析内容
  try {
    const parsedContent = await parseMaterialContent(file);
    material.content = parsedContent.text;
    material.extractedData = parsedContent.data;
    material.parsedAt = new Date();

    // 如果是条款文档，提取产品信息
    if (file.type === 'pdf' && file.filename.includes('条款')) {
      await extractProductInfoFromDocument(productId, parsedContent.text);
    }
  } catch (error) {
    logger.error({ error, materialId: material.id }, 'Failed to parse material');
  }

  product.materials.push(material);
  product.updatedAt = new Date();
  productsStore.set(productId, product);

  logger.info({ materialId: material.id, productId }, 'Material uploaded');
  return material;
}

/**
 * 解析资料内容（简化版）
 */
async function parseMaterialContent(file: {
  type: ProductMaterialType;
  data: Buffer;
}): Promise<{ text: string; data?: unknown }> {
  switch (file.type) {
    case 'pdf':
      // TODO: 集成PDF解析库（如pdf-parse）
      return { text: '[PDF内容待解析]' };
    case 'excel':
      // TODO: 集成Excel解析库（如xlsx）
      return { text: '[Excel内容待解析]' };
    case 'ppt':
      // TODO: 集成PPT解析库
      return { text: '[PPT内容待解析]' };
    case 'video':
      // 视频需要通过ASR转录
      return { text: '[视频需通过ASR转录]' };
    case 'text':
      return { text: file.data.toString('utf-8') };
    default:
      return { text: '[不支持的内容类型]' };
  }
}

/**
 * 从文档中提取产品信息
 */
async function extractProductInfoFromDocument(
  productId: string,
  documentText: string
): Promise<void> {
  const product = productsStore.get(productId);
  if (!product) return;

  const prompt = `
请从以下保险产品条款文档中提取关键信息：

文档内容：
${documentText.substring(0, 5000)}

请提取并返回JSON格式：
{
  "sellingPoints": ["卖点1", "卖点2"],
  "targetProfiles": [
    {
      "description": "描述",
      "painPoints": ["痛点1", "痛点2"]
    }
  ],
  "objections": [
    {
      "objection": "常见异议",
      "response": "建议回应"
    }
  ]
}
`;

  try {
    const response = await chat([
      { role: 'system', content: '你是保险产品分析专家，擅长从条款中提取核心卖点和客户画像。' },
      { role: 'user', content: prompt },
    ]);

    // 尝试解析JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      
      if (extracted.sellingPoints) {
        product.sellingPoints = [...new Set([...product.sellingPoints, ...extracted.sellingPoints])];
      }
      if (extracted.targetProfiles) {
        product.targetProfiles = [...product.targetProfiles, ...extracted.targetProfiles];
      }
      if (extracted.objections) {
        product.objections = [...product.objections, ...extracted.objections];
      }

      product.updatedAt = new Date();
      productsStore.set(productId, product);

      logger.info({ productId }, 'Product info extracted from document');
    }
  } catch (error) {
    logger.error({ error, productId }, 'Failed to extract product info');
  }
}

/**
 * 互动问答
 */
export async function askProductQuestion(
  productId: string,
  question: string
): Promise<{
  answer: string;
  relatedQuestions: string[];
  confidence: number;
}> {
  const product = productsStore.get(productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  // 构建上下文
  const context = `
产品名称：${product.name}
保险公司：${product.company}
核心卖点：${product.sellingPoints.join('；')}
目标客户：${product.targetProfiles.map(p => p.description).join('；')}
常见异议：${product.objections.map(o => o.objection).join('；')}
`;

  const prompt = `
基于以下产品信息回答问题：

${context}

问题：${question}

请给出专业、简洁的回答，帮助保险经纪人更好地销售这款产品。
`;

  try {
    const answer = await chat([
      { role: 'system', content: '你是保险销售培训专家，用简单易懂的方式教经纪人如何销售产品。' },
      { role: 'user', content: prompt },
    ]);

    // 保存问答记录
    const qa: TrainingQA = {
      id: `qa_${Date.now()}`,
      productId,
      question,
      answer,
      category: categorizeQuestion(question),
      tags: extractTags(question),
      usageCount: 1,
      helpfulCount: 0,
      createdAt: new Date(),
    };

    const existingQAs = qaStore.get(productId) || [];
    existingQAs.push(qa);
    qaStore.set(productId, existingQAs);

    return {
      answer,
      relatedQuestions: findRelatedQuestions(productId, question),
      confidence: 0.85,
    };
  } catch (error) {
    logger.error({ error, productId, question }, 'Failed to answer question');
    throw error;
  }
}

/**
 * 分类问题
 */
function categorizeQuestion(question: string): TrainingQA['category'] {
  const lower = question.toLowerCase();
  if (lower.includes('卖') || lower.includes('推') || lower.includes('客户')) {
    return 'sales';
  }
  if (lower.includes('异议') || lower.includes('拒绝') || lower.includes('说')) {
    return 'objection';
  }
  if (lower.includes('比') || lower.includes('vs') || lower.includes('区别')) {
    return 'comparison';
  }
  return 'product';
}

/**
 * 提取标签
 */
function extractTags(question: string): string[] {
  const tags: string[] = [];
  const keywords = ['保费', '保障', '理赔', '年龄', '健康', '收益', '对比'];
  for (const kw of keywords) {
    if (question.includes(kw)) tags.push(kw);
  }
  return tags;
}

/**
 * 查找相关问题
 */
function findRelatedQuestions(productId: string, question: string): string[] {
  const qas = qaStore.get(productId) || [];
  // 简单实现：返回最近的问题
  return qas
    .slice(-5)
    .map(qa => qa.question)
    .filter(q => q !== question);
}

/**
 * 获取产品信息
 */
export async function getProduct(productId: string): Promise<InsuranceProduct | null> {
  return productsStore.get(productId) || null;
}

/**
 * 列出所有产品
 */
export async function listProducts(): Promise<InsuranceProduct[]> {
  return Array.from(productsStore.values());
}

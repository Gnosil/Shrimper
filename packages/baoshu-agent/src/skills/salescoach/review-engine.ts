/**
 * 培训技能 - 对话复盘引擎
 * 支持：ASR转录、AI分析、复盘报告生成
 */
import { chat, asr, REVIEW_PROMPTS } from '../../services/qianfan.js';
import { checkCompliance } from '../../services/compliance.js';
import { logger } from '../../logger.js';
import type { ReviewReport } from './types.js';

// 复盘报告存储
const reviewStore = new Map<string, ReviewReport>();

/**
 * 上传录音并生成复盘报告
 */
export async function createReviewFromRecording(
  agentId: string,
  recording: {
    audioData: Buffer;
    leadId?: string;
    format?: 'pcm' | 'wav' | 'amr' | 'm4a';
  }
): Promise<ReviewReport> {
  logger.info({ agentId }, 'Creating review from recording');

  try {
    // 1. ASR转录
    const transcript = await asr(recording.audioData, {
      format: recording.format || 'm4a',
      rate: 16000,
    });

    logger.info({ transcriptLength: transcript.length }, 'ASR completed');

    // 2. 生成复盘报告
    const report = await analyzeConversation(agentId, transcript, recording.leadId);

    return report;
  } catch (error) {
    logger.error({ error, agentId }, 'Failed to create review from recording');
    throw error;
  }
}

/**
 * 从文本生成复盘报告
 */
export async function createReviewFromTranscript(
  agentId: string,
  transcript: string,
  leadId?: string
): Promise<ReviewReport> {
  logger.info({ agentId, transcriptLength: transcript.length }, 'Creating review from transcript');
  return analyzeConversation(agentId, transcript, leadId);
}

/**
 * 分析对话
 */
async function analyzeConversation(
  agentId: string,
  transcript: string,
  leadId?: string
): Promise<ReviewReport> {
  // 1. 调用千帆进行复盘分析
  const prompt = REVIEW_PROMPTS.conversationReview(transcript);

  const analysisResponse = await chat([
    { role: 'system', content: '你是资深保险销售培训师，对销售对话进行专业、客观的复盘分析。' },
    { role: 'user', content: prompt },
  ]);

  // 2. 解析分析结果
  const analysis = parseReviewAnalysis(analysisResponse);

  // 3. 额外合规检查
  const complianceResult = await checkCompliance(transcript);
  if (complianceResult.issues.length > 0) {
    analysis.analysis.complianceIssues.push(...complianceResult.issues);
    analysis.scores.compliance = Math.max(0, analysis.scores.compliance - complianceResult.issues.length * 10);
  }

  // 4. 计算总分
  const totalScore = Math.round(
    (analysis.scores.needsDiscovery + 
     analysis.scores.communication + 
     analysis.scores.objectionHandling + 
     analysis.scores.compliance + 
     analysis.scores.closing) / 5
  );

  // 5. 生成学习资源推荐
  const resources = generateLearningResources(analysis);

  // 6. 创建报告
  const report: ReviewReport = {
    id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    leadId,
    transcript,
    scores: analysis.scores,
    totalScore,
    analysis: analysis.analysis,
    recommendations: analysis.recommendations,
    learningResources: resources,
    createdAt: new Date(),
  };

  reviewStore.set(report.id, report);

  logger.info({ 
    reportId: report.id, 
    agentId, 
    totalScore 
  }, 'Review report created');

  return report;
}

/**
 * 解析复盘分析结果
 */
function parseReviewAnalysis(response: string): {
  scores: ReviewReport['scores'];
  analysis: ReviewReport['analysis'];
  recommendations: string[];
} {
  const defaultResult = {
    scores: {
      needsDiscovery: 70,
      communication: 70,
      objectionHandling: 70,
      compliance: 90,
      closing: 70,
    },
    analysis: {
      strengths: ['沟通态度友好'],
      improvements: ['可以更深入挖掘客户需求'],
      missedSignals: [],
      complianceIssues: [],
      identifiedNeeds: [],
      missedNeeds: [],
    },
    recommendations: ['继续练习需求挖掘技巧'],
  };

  try {
    // 尝试提取JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        scores: {
          needsDiscovery: parsed.scores?.needsDiscovery ?? 70,
          communication: parsed.scores?.communication ?? 70,
          objectionHandling: parsed.scores?.objectionHandling ?? 70,
          compliance: parsed.scores?.compliance ?? 90,
          closing: parsed.scores?.closing ?? 70,
        },
        analysis: {
          strengths: parsed.analysis?.strengths || defaultResult.analysis.strengths,
          improvements: parsed.analysis?.improvements || defaultResult.analysis.improvements,
          missedSignals: parsed.analysis?.missedSignals || [],
          complianceIssues: parsed.analysis?.complianceIssues || [],
          identifiedNeeds: parsed.analysis?.identifiedNeeds || [],
          missedNeeds: parsed.analysis?.missedNeeds || [],
        },
        recommendations: parsed.recommendations || defaultResult.recommendations,
      };
    }
  } catch (error) {
    logger.error({ error, response }, 'Failed to parse review analysis');
  }

  return defaultResult;
}

/**
 * 生成学习资源推荐
 */
function generateLearningResources(analysis: {
  scores: ReviewReport['scores'];
  analysis: ReviewReport['analysis'];
}): ReviewReport['learningResources'] {
  const resources: ReviewReport['learningResources'] = [];

  // 根据薄弱环节推荐资源
  if (analysis.scores.needsDiscovery < 70) {
    resources.push({
      type: 'video',
      title: 'SPIN销售法：深度挖掘客户需求',
    });
    resources.push({
      type: 'script',
      title: '需求挖掘话术模板20例',
    });
  }

  if (analysis.scores.objectionHandling < 70) {
    resources.push({
      type: 'video',
      title: '保险销售常见异议处理36计',
    });
  }

  if (analysis.scores.closing < 70) {
    resources.push({
      type: 'article',
      title: '成交信号的识别与把握',
    });
  }

  if (analysis.scores.compliance < 90) {
    resources.push({
      type: 'article',
      title: '保险销售合规红线：9大禁用词详解',
    });
  }

  return resources;
}

/**
 * 获取复盘报告
 */
export async function getReview(reportId: string): Promise<ReviewReport | null> {
  return reviewStore.get(reportId) || null;
}

/**
 * 获取经纪人的所有复盘报告
 */
export async function getReviewsByAgent(agentId: string): Promise<ReviewReport[]> {
  return Array.from(reviewStore.values())
    .filter(r => r.agentId === agentId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * 获取能力趋势分析
 */
export async function getCapabilityTrend(
  agentId: string,
  limit = 10
): Promise<{
  dates: string[];
  scores: {
    needsDiscovery: number[];
    communication: number[];
    objectionHandling: number[];
    compliance: number[];
    closing: number[];
  };
}> {
  const reviews = (await getReviewsByAgent(agentId)).slice(0, limit).reverse();

  return {
    dates: reviews.map(r => r.createdAt.toISOString().split('T')[0]),
    scores: {
      needsDiscovery: reviews.map(r => r.scores.needsDiscovery),
      communication: reviews.map(r => r.scores.communication),
      objectionHandling: reviews.map(r => r.scores.objectionHandling),
      compliance: reviews.map(r => r.scores.compliance),
      closing: reviews.map(r => r.scores.closing),
    },
  };
}

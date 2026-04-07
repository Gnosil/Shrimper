# 豹书 Agent - 双核心技能文档

## 概述

豹书 Agent 新增两大核心技能，帮助保险经纪人实现智能获客和专业培训。

- **获客技能 (LeadGen)**：多账号内容运营、线索管理、智能转化
- **培训技能 (SalesCoach)**：产品学习、对话复盘、能力提升

---

## 🎯 获客技能 (LeadGen)

### 功能模块

#### 1. 内容生成
生成多平台内容，自动合规检查。

**API端点：**
```
POST /skills/leadgen/content
POST /skills/leadgen/content/multi
```

**请求示例：**
```json
{
  "type": "wechat_article",
  "topic": "重疾险选购避坑指南",
  "ipProfile": "10年保险老兵，帮助1000+家庭做好保障规划"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "titles": ["标题1", "标题2", "标题3"],
    "content": "文章正文...",
    "summary": "文章摘要",
    "complianceChecked": true,
    "complianceIssues": []
  }
}
```

#### 2. 线索管理
线索的CRUD操作、标签管理、导入导出。

**API端点：**
```
POST   /skills/leadgen/leads           # 创建线索
POST   /skills/leadgen/leads/import    # 批量导入
GET    /skills/leadgen/leads           # 获取列表
GET    /skills/leadgen/leads/:id       # 获取详情
```

**创建线索请求：**
```json
{
  "agentId": "agent_001",
  "name": "张三",
  "phone": "13800138000",
  "source": "douyin",
  "tags": {
    "needs": ["critical_illness"],
    "intent": "high",
    "ageGroup": "30_40",
    "incomeLevel": "high"
  }
}
```

#### 3. Cold Message生成
根据客户画像生成个性化消息。

**API端点：**
```
POST /skills/leadgen/cold-message
```

**请求示例：**
```json
{
  "leadId": "lead_001",
  "leadProfile": "35岁女性，已婚有娃，关注养老规划",
  "touchPoint": 1
}
```

---

## 🎓 培训技能 (SalesCoach)

### 功能模块

#### 1. 产品学习
产品资料管理、知识图谱构建、互动问答。

**API端点：**
```
POST   /skills/salescoach/products     # 创建产品
GET    /skills/salescoach/products     # 获取列表
GET    /skills/salescoach/products/:id # 获取详情
POST   /skills/salescoach/products/:id/ask # 产品问答
```

**创建产品请求：**
```json
{
  "name": "平安福重疾险2024",
  "company": "平安人寿",
  "category": "critical_illness",
  "basicInfo": {
    "minAge": 28,
    "maxAge": 55,
    "coveragePeriod": "终身",
    "paymentMethods": ["趸交", "10年", "20年", "30年"]
  },
  "sellingPoints": [
    "重疾多次赔付，最多6次",
    "60岁前额外赔付80%"
  ]
}
```

**产品问答请求：**
```json
{
  "question": "这个产品适合什么人群？"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "answer": "基于产品特点，建议推给30-40岁家庭支柱...",
    "relatedQuestions": ["保费多少钱？", "和XX产品比怎么样？"],
    "confidence": 0.85
  }
}
```

#### 2. 对话复盘
录音转文本、AI分析、生成复盘报告。

**API端点：**
```
POST /skills/salescoach/reviews/text   # 从文本创建复盘
GET  /skills/salescoach/reviews        # 获取复盘列表
GET  /skills/salescoach/trends         # 能力趋势分析
```

**复盘请求：**
```json
{
  "agentId": "agent_001",
  "transcript": "经纪人：您好... 客户：你好...",
  "leadId": "lead_001"
}
```

**复盘报告响应：**
```json
{
  "success": true,
  "data": {
    "id": "review_xxx",
    "totalScore": 72,
    "scores": {
      "needsDiscovery": 65,
      "communication": 75,
      "objectionHandling": 70,
      "compliance": 90,
      "closing": 60
    },
    "analysis": {
      "strengths": ["开场自然", "及时询问预算"],
      "improvements": ["应追问顾虑", "需了解现有保障"],
      "missedSignals": ["客户说'具体多少钱'时未促单"],
      "complianceIssues": []
    },
    "recommendations": ["练习异议处理话术"],
    "learningResources": [
      { "type": "video", "title": "异议处理36计" }
    ]
  }
}
```

---

## 🔧 技术架构

### 千帆平台集成

所有AI能力均通过千帆平台提供：
- **LLM对话**：使用ERNIE 4.0模型
- **ASR语音识别**：百度语音API
- **合规审核**：MiniMax + 关键词过滤

### 项目结构

```
packages/baoshu-agent/src/
├── services/
│   └── qianfan.ts          # 千帆API封装
├── skills/
│   ├── leadgen/            # 获客技能
│   │   ├── content-generator.ts
│   │   ├── lead-manager.ts
│   │   ├── cold-message.ts
│   │   └── wechat-publisher.ts
│   └── salescoach/         # 培训技能
│       ├── product-learning.ts
│       └── review-engine.ts
└── index.ts                # API路由
```

---

## 🚀 快速开始

### 1. 安装依赖
```bash
cd packages/baoshu-agent
pnpm install
```

### 2. 配置千帆API
千帆API Key已内置，无需额外配置。

### 3. 运行演示
```bash
node demo.mjs
```

### 4. 启动服务
```bash
pnpm dev
```

### 5. 测试API
```bash
# 生成内容
curl -X POST http://localhost:3001/skills/leadgen/content \
  -H "Content-Type: application/json" \
  -d '{"type":"wechat_article","topic":"重疾险选购"}'

# 创建线索
curl -X POST http://localhost:3001/skills/leadgen/leads \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_001","name":"张三","source":"douyin","tags":{"needs":["critical_illness"],"intent":"high"}}'

# 对话复盘
curl -X POST http://localhost:3001/skills/salescoach/reviews/text \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_001","transcript":"经纪人：您好...客户：你好..."}'
```

---

## 📅 开发计划

### 第一周（已完成）
- ✅ 内容生成（公众号、朋友圈、视频脚本）
- ✅ 线索管理（CRUD、标签、导入）
- ✅ Cold Message生成
- ✅ 产品学习（创建、问答）
- ✅ 对话复盘（ASR、5维度评分）
- ✅ API路由集成

### 第二周（待开发）
- ⬜ 微信公众号草稿箱API对接
- ⬜ 多账号矩阵管理
- ⬜ 微信个人号自动化（Wechaty）
- ⬜ 产品资料批量上传解析（PDF/Excel/PPT）
- ⬜ 公司规范上传与合规检查
- ⬜ 能力趋势分析图表

---

## ⚠️ 注意事项

1. **合规检查**：所有生成内容自动经过9大禁用词检查
2. **API限制**：千帆API有调用频率限制，生产环境需添加限流
3. **数据存储**：当前使用内存存储，生产环境需接入数据库
4. **微信自动化**：个人号自动化存在封号风险，建议使用企业微信

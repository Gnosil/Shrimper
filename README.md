# OpenClaw Platform 🦀

> 开源多渠道 AI Agent 平台 - OpenClaw 是引擎，本仓库是整车

OpenClaw Platform 是一个企业级多渠道 AI Agent 分发平台，将 AI Agent 能力无缝接入飞书、Telegram 等即时通讯平台，支持支付订阅、合规审核、智能对话等完整业务链路。

---

## 项目简介

OpenClaw Platform 是一个模块化设计的 AI Agent 平台，核心特性包括：

- **多渠道接入**：飞书、Telegram 等 IM 平台统一接入
- **智能对话**：基于 MiniMax 等大模型的流式对话
- **订阅付费**：完整的支付流程，支持微信支付、支付宝
- **合规审核**：敏感词过滤、实名认证、内容审核
- **水平扩展**：无状态 Worker 设计，支持弹性伸缩
- **消息队列**：基于 Redis/BullMQ 的高可靠消息处理

---

## 系统架构

```
IM Platforms → ALB → Channel Server → Task MQ → Worker Pool → OpenClaw Agent
                  ↓                      ↓
          Subscription Svc          Storage Svcs
                  ↓                      ↓
          Redis Cache               NAS / S3
```

核心组件：
- **Channel Server**: IM 平台适配器，统一接入飞书、Telegram 等
- **Worker Pool**: 无状态 Worker，执行 AI Agent 任务
- **Task/Result MQ**: BullMQ 消息队列，保证消息可靠投递
- **Manager**: 控制平面，提供 HTTP API、WebSocket、定时任务
- **Subscription**: 订阅服务，支付、套餐、权限管理
- **Storage**: 文件存储，支持 NAS、S3、阿里云 OSS

---

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| **运行时** | Node.js 20+, TypeScript 5.x |
| **框架** | Express.js, Fastify |
| **消息队列** | BullMQ, Redis |
| **存储** | NAS (文件系统), S3/OSS (对象存储) |
| **缓存** | Redis, ioredis |
| **容器化** | Docker, Docker Compose |
| **CI/CD** | GitHub Actions |
| **AI 模型** | MiniMax, OpenAI, Claude |
| **IM 接入** | Feishu OpenAPI, Telegram Bot API |

---

## 项目结构

```
openclaw-platform/
├── packages/                 # 核心包 (monorepo)
│   ├── channel-server/      # IM 渠道服务
│   ├── worker-pool/         # Worker 池
│   ├── manager/             # 控制平面
│   ├── subscription/        # 订阅服务
│   ├── mq/                  # 消息队列
│   ├── storage/             # 存储服务
│   └── baoshu-agent/        # 豹书 Agent (示例)
├── docker/                   # Dockerfile
├── config/                   # 配置文件
├── docker-compose.yml        # 生产编排
├── docker-compose.dev.yml    # 开发编排
└── pnpm-workspace.yaml       # pnpm 工作区
```

---

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker >= 24.0.0
- Docker Compose >= 2.20.0
- Redis >= 7.0

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/your-org/openclaw-platform.git
cd openclaw-platform

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写必要配置
```

### 开发模式

```bash
# Docker Compose 启动开发环境
docker compose -f docker-compose.dev.yml up
```

### 生产部署

```bash
# 构建并启动
docker compose up -d

# 扩展 Worker 实例
docker compose up -d --scale worker=10
```

---

## 配置说明

### 核心环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `REDIS_URL` | Redis 连接地址 | 是 |
| `OPENCLAW_API_KEY` | OpenClaw API 密钥 | 是 |
| `MINIMAX_API_KEY` | MiniMax AI 密钥 | 是 |
| `FEISHU_APP_ID` | 飞书应用 ID | 是 |
| `FEISHU_APP_SECRET` | 飞书应用密钥 | 是 |

---

## 核心功能

### 1. 消息接入 (Channel Server)
- 飞书/ Lark 群聊、私聊、卡片消息
- Telegram Bot API
- 通用 Webhook 接入

### 2. 任务处理 (Worker Pool)
- 分布式任务队列 (BullMQ)
- 无状态 Worker，水平扩展
- 自动重试、死信队列

### 3. AI 对话 (Agent Core)
- 流式响应 (SSE/WebSocket)
- 多轮对话上下文管理
- 工具调用 (Function Calling)

### 4. 订阅付费 (Subscription)
- 微信/支付宝支付
- 套餐管理、配额控制
- 自动续费

### 5. 合规审核 (Compliance)
- 敏感词过滤
- 图片内容审核
- 实名认证

---

## 扩展开发

### 添加新的 IM 适配器

```typescript
// packages/channel-server/src/adapters/your-platform.ts
import { IChannelAdapter } from '../types';

export class YourPlatformAdapter implements IChannelAdapter {
  async initialize(config: Record<string, string>): Promise<void> {
    // 初始化逻辑
  }

  async listen(handler: Function): Promise<void> {
    // 监听消息
  }

  async send(to: string, content: string): Promise<void> {
    // 发送消息
  }
}
```

---

## CI/CD

项目使用 GitHub Actions 进行持续集成和部署：

```yaml
# .github/workflows/deploy.yml
# - 代码质量检查
# - 单元测试
# - Docker 镜像构建
# - 部署到测试/生产环境
```

---

## 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 许可证

[MIT](LICENSE) © OpenClaw Team

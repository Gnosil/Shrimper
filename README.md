# openclaw-platform 🦀

> Open-source multi-channel AI agent platform. OpenClaw is the engine — this repo is the car.

## Architecture

```
IM Platforms  →  ALB  →  Channel Server  →  Task MQ  →  Worker Pool  →  Result MQ  →  Channel Server  →  IM
                              ↕                               ↕
                      Subscription Svc                  Storage (NAS)
                              ↕                               ↕
                      Sub Cache (Redis)               mem · config
                                          Manager (cron / WS / HTTP)
```

## Packages

| Package | Description |
|---|---|
| `@openclaw/channel-server` | IM adapters (Feishu, Telegram, …) + message ingestion + result delivery |
| `@openclaw/worker-pool` | Stateless workers — pull from MQ, run OpenClaw, push result |
| `@openclaw/manager` | Control plane: HTTP API, WebSocket telemetry, Cron jobs |
| `@openclaw/subscription` | Subscription gate + Redis cache |
| `@openclaw/mq` | BullMQ abstraction (Task MQ + Result MQ) |
| `@openclaw/storage` | Per-UID file isolation (NAS / S3 / OSS) |

## Quick Start

```bash
cp .env.example .env
# fill in OPENCLAW_API_KEY and at least one IM adapter token

pnpm install
docker compose up           # production
docker compose -f docker-compose.dev.yml up   # dev with hot-reload
```

## Scaling Workers

```bash
docker compose up --scale worker=10   # 10 stateless worker instances
```

## Adding a New IM Adapter

1. Create `packages/channel-server/src/adapters/yourplatform.ts`
2. Implement `IChannelAdapter` (`listen()` + `send()`)
3. Register it in `packages/channel-server/src/index.ts`

## License

MIT
"# Shrimper" 

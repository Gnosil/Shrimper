# Testing openclaw-platform

Three levels of testing, from fastest to most complete.

---

## Level 0 — Ping (Redis only, 10 seconds)

Start Redis, verify everything can talk to it.

```bash
docker run -d -p 6379:6379 redis:7-alpine

pnpm install
pnpm --filter @openclaw/e2e run ping
```

Expected output:
```
🔌 pinging Redis …
   Redis: PONG
   Task MQ depth:   0
   Result MQ depth: 0
✅ Redis OK
```

---

## Level 1 — Round-trip (single process, no docker-compose)

Spins up a fake worker + result watcher in one process.
Fires a message, asserts reply arrives within 5 s.

```bash
# Redis must be running (see Level 0)
pnpm --filter @openclaw/e2e run roundtrip
```

Expected output:
```
🧪 openclaw-platform round-trip test
   firing message: What is 2 + 2?
   waiting for result …

══════════════════════════════════════════════════════════
✅  ROUND-TRIP TEST PASSED
══════════════════════════════════════════════════════════
   uid:    feishu:e2e_test_user
   reply:  [agent] skills=[none] → answer to "What is 2 + 2?": 4
══════════════════════════════════════════════════════════
```

If it prints ❌ FAILED → Redis is not reachable. Check REDIS_URL.

---

## Level 2 — Full stack (docker compose)

Runs all services as separate containers, exactly like production.

### Terminal 1 — start the stack
```bash
cp .env.example .env          # fill in OPENCLAW_API_KEY (can be fake for stub)
docker compose -f docker-compose.dev.yml up
```

### Terminal 2 — watch for results
```bash
REDIS_URL=redis://localhost:6379 pnpm --filter @openclaw/e2e run watch
```

### Terminal 3 — fire test messages
```bash
# default message
REDIS_URL=redis://localhost:6379 pnpm --filter @openclaw/e2e run fire

# custom message and uid
REDIS_URL=redis://localhost:6379 pnpm --filter @openclaw/e2e run fire "帮我分析这份保险合同" "feishu:ou_dan_test"

# fire 5 messages rapidly to test concurrency
for i in $(seq 1 5); do
  REDIS_URL=redis://localhost:6379 pnpm --filter @openclaw/e2e run fire "message $i" "feishu:user_$i"
done
```

Watch Terminal 2 — you should see 5 results arrive, processed in parallel.

---

## What each test proves

| Test | Proves |
|---|---|
| `ping` | Redis up, MQ queues visible |
| `roundtrip` | MQ enqueue → consume → result flow works end-to-end |
| `fire` + `watch` | Each service process works independently |
| `fire` × 5 | Worker concurrency, no dropped messages |
| `fire` + scale worker=5 | Horizontal scaling, jobs distributed across workers |

---

## Scale test

```bash
# in docker-compose.dev.yml, add WORKER_CONCURRENCY: "1" then:
docker compose -f docker-compose.dev.yml up --scale worker=5

# fire 20 messages
for i in $(seq 1 20); do
  REDIS_URL=redis://localhost:6379 pnpm --filter @openclaw/e2e run fire "job $i"
done

# watch worker logs — you should see different container IDs handling jobs
docker compose logs -f worker
```

---

## Checklist before connecting real IM adapters

- [ ] Level 0 passes
- [ ] Level 1 passes
- [ ] Level 2: 5 messages fire and 5 results arrive
- [ ] Scale test: 20 messages, all consumed, no duplicates
- [ ] Replace stub in `worker-pool/src/index.ts` with real OpenClaw SDK call
- [ ] Implement `listen()` + `send()` in feishu.ts / telegram.ts
- [ ] Set real tokens in .env

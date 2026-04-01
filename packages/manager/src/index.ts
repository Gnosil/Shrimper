/**
 * @openclaw/manager — Control plane
 *
 * GET  /health          liveness probe
 * GET  /api/queue       queue depth stats
 * POST /api/config      hot-reload global config
 * WS   /ws              live worker telemetry (5s interval)
 */
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import cron from "node-cron";
import { createRedis } from "@openclaw/mq";

const app    = express();
const server = createServer(app);
const wss    = new WebSocketServer({ server });
const redis  = createRedis();

app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true, ts: Date.now() }));

app.get("/api/queue", async (_, res) => {
  const [waiting, active, completed, failed] = await Promise.all([
    redis.llen("bull:openclaw:tasks:wait"),
    redis.llen("bull:openclaw:tasks:active"),
    redis.zcard("bull:openclaw:tasks:completed"),
    redis.zcard("bull:openclaw:tasks:failed"),
  ]);
  res.json({ waiting, active, completed, failed });
});

app.post("/api/config", async (req, res) => {
  await redis.set("openclaw:config", JSON.stringify(req.body));
  res.json({ ok: true });
});

// Live stats stream to connected dashboard clients
wss.on("connection", (ws) => {
  const id = setInterval(async () => {
    const stats = {
      ts: Date.now(),
      waiting:  await redis.llen("bull:openclaw:tasks:wait"),
      active:   await redis.llen("bull:openclaw:tasks:active"),
    };
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(stats));
  }, 5000);
  ws.on("close", () => clearInterval(id));
});

// Cron jobs
cron.schedule("0 3 * * *", () => console.log("[manager] cron: daily cleanup"));
cron.schedule("*/5 * * * *", () => console.log("[manager] cron: heartbeat check"));

const PORT = process.env.MANAGER_PORT ?? 3001;
server.listen(PORT, () => console.log(`[manager] :${PORT}`));

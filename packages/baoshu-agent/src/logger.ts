import pino from "pino";

/**
 * Structured logger with request context
 * Fields: req_id, feishu_open_id, latency_ms, level, msg, time
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
  base: {
    // Base fields will be merged with each log entry
    pid: process.pid,
  },
});

/**
 * Create a child logger with request context
 */
export function createRequestLogger(context: {
  reqId: string;
  feishuOpenId?: string;
  threadId?: string;
}) {
  return logger.child({
    req_id: context.reqId,
    feishu_open_id: context.feishuOpenId,
    thread_id: context.threadId,
  });
}

/**
 * Log with latency measurement
 */
export function logWithLatency(
  logFn: pino.Logger,
  level: "info" | "warn" | "error" | "debug",
  message: string,
  latencyMs: number,
  extra?: Record<string, unknown>
) {
  logFn[level]({ latency_ms: latencyMs, ...extra }, message);
}

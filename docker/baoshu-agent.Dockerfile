# Dockerfile.app - Baoshu Agent
# Builds on top of base image for fast rebuilds

FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./

# Copy package.json files
COPY packages/baoshu-agent/package.json packages/baoshu-agent/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/baoshu-agent/src packages/baoshu-agent/src
COPY packages/baoshu-agent/tsconfig.json packages/baoshu-agent/

# Build
RUN pnpm -r build

# Production image
FROM node:20-alpine AS production

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/packages/baoshu-agent/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

EXPOSE 3001

CMD ["node", "dist/index.js"]
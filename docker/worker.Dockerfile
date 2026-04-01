FROM node:20-alpine
RUN npm i -g pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY packages/mq/package.json       packages/mq/
COPY packages/storage/package.json  packages/storage/
COPY packages/worker-pool/package.json packages/worker-pool/
RUN pnpm install --frozen-lockfile --filter @openclaw/worker-pool...
COPY packages/mq/src        packages/mq/src
COPY packages/storage/src   packages/storage/src
COPY packages/worker-pool/src packages/worker-pool/src
COPY tsconfig.base.json .
RUN pnpm -r build --filter @openclaw/worker-pool...
CMD ["node", "packages/worker-pool/dist/index.js"]

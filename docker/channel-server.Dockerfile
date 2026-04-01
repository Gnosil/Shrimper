FROM node:20-alpine
RUN npm i -g pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY packages/mq/package.json          packages/mq/
COPY packages/subscription/package.json packages/subscription/
COPY packages/channel-server/package.json packages/channel-server/
RUN pnpm install --frozen-lockfile --filter @openclaw/channel-server...
COPY packages/mq/src         packages/mq/src
COPY packages/subscription/src packages/subscription/src
COPY packages/channel-server/src packages/channel-server/src
COPY tsconfig.base.json .
RUN pnpm -r build --filter @openclaw/channel-server...
CMD ["node", "packages/channel-server/dist/index.js"]
EXPOSE 3000

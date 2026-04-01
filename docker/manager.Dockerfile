FROM node:20-alpine
RUN npm i -g pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY packages/mq/package.json      packages/mq/
COPY packages/manager/package.json packages/manager/
RUN pnpm install --frozen-lockfile --filter @openclaw/manager...
COPY packages/mq/src      packages/mq/src
COPY packages/manager/src packages/manager/src
COPY tsconfig.base.json .
RUN pnpm -r build --filter @openclaw/manager...
CMD ["node", "packages/manager/dist/index.js"]
EXPOSE 3001

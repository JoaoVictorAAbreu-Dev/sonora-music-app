# Build context: repository root.  docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/tokens/package.json packages/tokens/
RUN pnpm install --frozen-lockfile --filter @sonora/api...
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @sonora/api build \
 && pnpm --filter @sonora/api deploy --legacy --prod /out \
 && cp -r apps/api/dist apps/api/drizzle /out/

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1
CMD ["sh", "-c", "node dist/migrate.js && exec node dist/server.js"]

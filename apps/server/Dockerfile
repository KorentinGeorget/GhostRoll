FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@12.10.1 --activate

WORKDIR /app

FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/sim/package.json ./packages/sim/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/sim ./packages/sim
COPY apps/server ./apps/server

RUN pnpm --filter @ghostroll/shared build
RUN pnpm --filter @ghostroll/sim build
RUN pnpm --filter @ghostroll/server build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
RUN mkdir -p /app/data

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/sim/package.json ./packages/sim/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/sim/dist ./packages/sim/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist

EXPOSE 3001
CMD ["node", "apps/server/dist/index.js"]

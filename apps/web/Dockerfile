# =========================
# Base
# =========================
FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app


# =========================
# Dependencies
# =========================
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile


# =========================
# Builder
# =========================
FROM base AS builder

COPY --from=deps /app /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web


RUN pnpm --filter @repo/shared build

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_LOCAL_APP_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_LOCAL_APP_URL=$NEXT_PUBLIC_LOCAL_APP_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter web build

# =========================
# Runner
# =========================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/apps/web/.next/standalone ./

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/apps/web/.next/static ./apps/web/.next/static

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
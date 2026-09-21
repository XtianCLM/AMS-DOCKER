FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app


FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile


FROM base AS builder

COPY --from=deps /app /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm --filter @repo/shared build

WORKDIR /app/apps/api

ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/placeholder"
ENV DATABASE_URL=$DATABASE_URL

RUN pnpm exec prisma generate

WORKDIR /app
RUN pnpm --filter api build


FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY --from=builder /app /app

RUN mkdir -p /app/apps/api/uploads

WORKDIR /app/apps/api

EXPOSE 8400

CMD ["node", "dist/server.js"]
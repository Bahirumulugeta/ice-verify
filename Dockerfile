FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl wget
COPY package.json package-lock.json* ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma
COPY tsconfig*.json ./
COPY vitest.config.ts ./
RUN npm install

FROM base AS build
RUN npx prisma generate
RUN npm run build -w @ice/shared -w @ice/config -w @ice/validation -w @ice/domain -w @ice/api-client || true
RUN npm run build -w @ice/api || true
RUN npm run build -w @ice/worker || true
RUN npm run build -w @ice/web || true

FROM base AS api
RUN npx prisma generate
ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx tsx apps/api/src/server.ts"]

FROM base AS worker
RUN npx prisma generate
ENV NODE_ENV=production
CMD ["npx", "tsx", "apps/worker/src/index.ts"]

FROM base AS web
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["npx", "next", "start", "-p", "3000"]

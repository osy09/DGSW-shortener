FROM node:20-alpine AS base

# 의존성 설치
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 빌드 단계
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드 시 더미 환경변수 (Turbopack 치환 방지)
ENV TURSO_DATABASE_URL=https://placeholder.turso.io
ENV TURSO_AUTH_TOKEN=placeholder_token

RUN npm run build

# 실행 단계
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Sharp 의존성
RUN apk add --no-cache libc6-compat

# 비루트 사용자
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 필수 파일만 복사
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@libsql ./node_modules/@libsql
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --chown=nextjs:nodejs start.sh ./start.sh

RUN chmod +x /app/start.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["sh", "start.sh"]

FROM node:20-alpine AS base

# 의존성 설치 단계
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 빌드 단계
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma 클라이언트 생성
RUN npx prisma generate

# Next.js 빌드
RUN npm run build

# 실행 단계
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 필수 라이브러리 설치 (Prisma + Sharp)
RUN apk add --no-cache openssl libc6-compat

# 비루트 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 필요한 파일 복사 (권한 설정 포함)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --chown=nextjs:nodejs start.sh ./start.sh

# 데이터 디렉토리 생성 및 권한 설정
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app
RUN chmod +x /app/start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["sh", "start.sh"]

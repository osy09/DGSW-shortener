// lib/prisma.js

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis;

function createPrismaClient() {
  // 환경변수가 없으면 null 반환 (빌드 시점)
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    return null;
  }
  
  const libsql = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  
  const adapter = new PrismaLibSql(libsql);
  return new PrismaClient({ adapter });
}

// Lazy initialization - 실제 사용 시점에 초기화
function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({}, {
  get(target, prop) {
    const client = getPrismaClient();
    if (!client) {
      throw new Error('Prisma client not initialized. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.');
    }
    return client[prop];
  }
});

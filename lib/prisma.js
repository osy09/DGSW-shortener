// lib/prisma.js

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis;

let prismaInstance = null;

function getPrismaClient() {
  if (prismaInstance) return prismaInstance;
  
  // 환경변수가 없으면 null 반환 (빌드 시점)
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    return null;
  }
  
  const libsql = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  
  const adapter = new PrismaLibSql(libsql);
  prismaInstance = new PrismaClient({ adapter });
  
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }
  
  return prismaInstance;
}

// 각 모델에 대한 프록시 객체 생성
function createModelProxy(modelName) {
  return new Proxy({}, {
    get(target, prop) {
      const client = getPrismaClient();
      if (!client) {
        // 빌드 시점에는 빈 객체 반환
        return async () => null;
      }
      const model = client[modelName];
      const value = model[prop];
      if (typeof value === 'function') {
        return value.bind(model);
      }
      return value;
    }
  });
}

export const prisma = {
  link: createModelProxy('link'),
  $connect: () => getPrismaClient()?.$connect?.() ?? Promise.resolve(),
  $disconnect: () => getPrismaClient()?.$disconnect?.() ?? Promise.resolve(),
};

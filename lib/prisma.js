// lib/prisma.js
// Turso libsql 클라이언트 (Prisma-like 인터페이스)

import { createClient } from '@libsql/client/web';
import { readFileSync, existsSync } from 'fs';

let envCache = null;
let dbClient = null;

// 런타임 환경변수 로딩 (Docker 컨테이너용)
function loadEnvFromFile() {
  if (envCache) return envCache;
  
  const envPaths = ['/app/.env', '.env'];
  for (const envPath of envPaths) {
    try {
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf-8');
        const env = {};
        for (const line of content.split('\n')) {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
          }
        }
        envCache = env;
        return env;
      }
    } catch { /* ignore */ }
  }
  return {};
}

function getLibSqlClient() {
  if (dbClient) return dbClient;
  
  const fileEnv = loadEnvFromFile();
  const dbUrl = fileEnv.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken = fileEnv.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
  
  if (!dbUrl || !authToken) {
    throw new Error('Database configuration missing');
  }
  
  dbClient = createClient({
    url: dbUrl.replace('libsql://', 'https://'),
    authToken,
  });
  
  return dbClient;
}

// Prisma-like 인터페이스
export function getDbClient() {
  const client = getLibSqlClient();
  
  return {
    link: {
      findUnique: async ({ where }) => {
        const { shortCode, id } = where;
        let sql, args;
        
        if (shortCode) {
          sql = 'SELECT * FROM Link WHERE shortCode = ?';
          args = [shortCode];
        } else if (id) {
          sql = 'SELECT * FROM Link WHERE id = ?';
          args = [id];
        } else {
          throw new Error('findUnique requires shortCode or id');
        }
        
        const result = await client.execute({ sql, args });
        return result.rows[0] || null;
      },
      
      findFirst: async ({ where }) => {
        const { originalUrl, shortCode, id, NOT } = where;
        let sql, args = [];
        
        if (originalUrl) {
          sql = 'SELECT * FROM Link WHERE originalUrl = ?';
          args = [originalUrl];
        } else if (shortCode && NOT?.id) {
          sql = 'SELECT * FROM Link WHERE shortCode = ? AND id != ?';
          args = [shortCode, NOT.id];
        } else if (shortCode) {
          sql = 'SELECT * FROM Link WHERE shortCode = ?';
          args = [shortCode];
        } else if (id) {
          sql = 'SELECT * FROM Link WHERE id = ?';
          args = [id];
        } else {
          return null;
        }
        
        const result = await client.execute({ sql: sql + ' LIMIT 1', args });
        return result.rows[0] || null;
      },
      
      findMany: async ({ orderBy, take } = {}) => {
        let sql = 'SELECT * FROM Link';
        if (orderBy) {
          const field = Object.keys(orderBy)[0];
          const direction = orderBy[field] === 'desc' ? 'DESC' : 'ASC';
          sql += ` ORDER BY ${field} ${direction}`;
        }
        if (take) {
          sql += ` LIMIT ${take}`;
        }
        const result = await client.execute(sql);
        return result.rows;
      },
      
      create: async ({ data }) => {
        const { shortCode, originalUrl, createdAt } = data;
        const sql = 'INSERT INTO Link (shortCode, originalUrl, clicks, createdAt) VALUES (?, ?, 0, ?) RETURNING *';
        const args = [shortCode, originalUrl, createdAt || new Date().toISOString()];
        const result = await client.execute({ sql, args });
        return result.rows[0];
      },
      
      update: async ({ where, data }) => {
        const { id, shortCode } = where;
        const updates = [];
        const args = [];
        
        // 클릭 증가
        if (data.clicks?.increment) {
          updates.push('clicks = clicks + ?');
          args.push(data.clicks.increment);
        }
        // 일반 필드 업데이트
        if (data.originalUrl) {
          updates.push('originalUrl = ?');
          args.push(data.originalUrl);
        }
        if (data.shortCode) {
          updates.push('shortCode = ?');
          args.push(data.shortCode);
        }
        
        if (updates.length === 0) return null;
        
        const whereClause = id ? 'id = ?' : 'shortCode = ?';
        args.push(id || shortCode);
        
        const sql = `UPDATE Link SET ${updates.join(', ')} WHERE ${whereClause} RETURNING *`;
        const result = await client.execute({ sql, args });
        return result.rows[0];
      },
      
      delete: async ({ where }) => {
        const { id, shortCode } = where;
        if (id) {
          await client.execute({ sql: 'DELETE FROM Link WHERE id = ?', args: [id] });
        } else if (shortCode) {
          await client.execute({ sql: 'DELETE FROM Link WHERE shortCode = ?', args: [shortCode] });
        }
      },
      
      count: async () => {
        const result = await client.execute('SELECT COUNT(*) as count FROM Link');
        return Number(result.rows[0]?.count || 0);
      },
    },
  };
}

// 기존 코드 호환성을 위한 별칭
export const prisma = {
  get link() {
    return getDbClient().link;
  }
};

'use server';

import { getDbClient } from '@/lib/prisma';
import { verifyTOTP } from '@/lib/totp';
import { createSession, verifySession, deleteSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { generateCode } from '@/utils/base62';
import { getKoreanDateTime, validateUrl, isValidShortCode } from '@/utils/common';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://dgsw.kr';

// Rate Limiting 설정
const loginAttempts = new Map();
const RATE_LIMIT = { attempts: 5, timeframe: 10 * 60 * 1000, cleanup: 60 * 1000 };

// Rate Limiter 정리 (메모리 누수 방지)
let cleanupInitialized = false;
function initRateLimiterCleanup() {
  if (cleanupInitialized) return;
  cleanupInitialized = true;

  setInterval(() => {
    const now = Date.now();
    for (const [ip, times] of loginAttempts) {
      const valid = times.filter(t => now - t < RATE_LIMIT.timeframe);
      valid.length === 0 ? loginAttempts.delete(ip) : loginAttempts.set(ip, valid);
    }
  }, RATE_LIMIT.cleanup);
}
initRateLimiterCleanup();

// OTP 검증 및 세션 생성
export async function verifyOtp(formData) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || '127.0.0.1';

  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT.timeframe);

  if (recentAttempts.length >= RATE_LIMIT.attempts) {
    return { error: '로그인 시도 횟수가 너무 많습니다. 10분 후에 다시 시도해 주세요.' };
  }

  const pin = formData.get('pin')?.toString().trim();
  if (!pin || pin.length !== 6) return { error: '6자리 PIN을 입력해 주세요.' };

  try {
    if (!verifyTOTP(pin)) {
      loginAttempts.set(ip, [...recentAttempts, now]);
      return { error: '잘못된 PIN입니다. 다시 시도해 주세요.' };
    }

    loginAttempts.delete(ip);
    await createSession();
  } catch {
    return { error: '인증 중 오류가 발생했습니다.' };
  }

  redirect('/admin');
}

// 로그아웃
export async function logout() {
  await deleteSession();
  redirect('/admin/login');
}

// 모든 링크 조회
export async function getAllLinks() {
  const session = await verifySession();
  if (!session.isAuthenticated) return { error: '인증이 필요합니다.' };

  try {
    const links = await getDbClient().link.findMany({ orderBy: { id: 'desc' } });
    return {
      links: links.map((link) => ({ ...link, shortUrl: `${BASE_URL}/${link.shortCode}` })),
    };
  } catch {
    return { error: '링크 조회 중 오류가 발생했습니다.' };
  }
}

// 커스텀 링크 생성
export async function createCustomLink(formData) {
  const session = await verifySession();
  if (!session.isAuthenticated) return { error: '인증이 필요합니다.' };

  const originalUrl = formData.get('url')?.toString().trim();
  const customCode = formData.get('shortCode')?.toString().trim();

  if (!originalUrl) return { error: 'URL을 입력해 주세요.' };

  const urlValidation = validateUrl(originalUrl);
  if (!urlValidation.valid) return { error: urlValidation.error };

  if (customCode && !isValidShortCode(customCode)) {
    return { error: '코드는 영문자와 숫자만 사용 가능합니다 (1-20자).' };
  }

  try {
    if (customCode) {
      const existing = await getDbClient().link.findUnique({ where: { shortCode: customCode } });
      if (existing) return { error: '이미 사용 중인 코드입니다.' };
    }

    const shortCode = customCode || generateCode();
    const link = await getDbClient().link.create({
      data: { originalUrl, shortCode, createdAt: getKoreanDateTime() },
    });

    return { success: true, link: { ...link, shortUrl: `${BASE_URL}/${link.shortCode}` } };
  } catch {
    return { error: '링크 생성 중 오류가 발생했습니다.' };
  }
}

// 링크 수정
export async function updateLink(formData) {
  const session = await verifySession();
  if (!session.isAuthenticated) return { error: '인증이 필요합니다.' };

  const id = parseInt(formData.get('id'), 10);
  const originalUrl = formData.get('originalUrl')?.toString().trim();
  const shortCode = formData.get('shortCode')?.toString().trim();

  if (!id) return { error: '링크 ID가 필요합니다.' };

  if (originalUrl) {
    const urlValidation = validateUrl(originalUrl);
    if (!urlValidation.valid) return { error: urlValidation.error };
  }

  if (shortCode && !isValidShortCode(shortCode)) {
    return { error: '코드는 영문자와 숫자만 사용 가능합니다 (1-20자).' };
  }

  try {
    if (shortCode) {
      const existing = await getDbClient().link.findFirst({
        where: { shortCode, NOT: { id } },
      });
      if (existing) return { error: '이미 사용 중인 코드입니다.' };
    }

    const updateData = {};
    if (originalUrl) updateData.originalUrl = originalUrl;
    if (shortCode) updateData.shortCode = shortCode;

    await getDbClient().link.update({ where: { id }, data: updateData });
    return { success: true };
  } catch {
    return { error: '링크 수정 중 오류가 발생했습니다.' };
  }
}

// 링크 삭제
export async function deleteLink(formData) {
  const session = await verifySession();
  if (!session.isAuthenticated) return { error: '인증이 필요합니다.' };

  const id = parseInt(formData.get('id'), 10);
  if (!id) return { error: '링크 ID가 필요합니다.' };

  try {
    await getDbClient().link.delete({ where: { id } });
    return { success: true };
  } catch {
    return { error: '링크 삭제 중 오류가 발생했습니다.' };
  }
}

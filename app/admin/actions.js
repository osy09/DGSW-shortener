// app/admin/actions.js
'use server';

import { getDbClient } from '@/lib/prisma';
import { verifyTOTP } from '@/lib/totp';
import { createSession, verifySession, deleteSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import crypto from 'crypto'; // crypto 모듈 추가

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://dgsw.site';

// Rate Limiting을 위한 인메모리 저장소
const loginAttempts = new Map();
const RATE_LIMIT_ATTEMPTS = 5; // 최대 시도 횟수
const RATE_LIMIT_TIMEFRAME = 10 * 60 * 1000; // 10분

// 한국 시간 포맷
function getKoreanDateTime() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);

  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  const hours = String(kstDate.getUTCHours()).padStart(2, '0');
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(kstDate.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// URL 유효성 검사
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// shortCode 유효성 검사
function isValidShortCode(code) {
  return /^[a-zA-Z0-9]{1,20}$/.test(code);
}

// 랜덤 코드 생성 (암호학적으로 안전하게 변경)
function generateCode() {
  const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const codeLength = 5;
  const randomBytes = crypto.randomBytes(codeLength);
  let result = '';
  for (let i = 0; i < codeLength; i++) {
    result += CHARSET[randomBytes[i] % CHARSET.length];
  }
  return result;
}

/**
 * OTP 검증 및 세션 생성
 */
export async function verifyOtp(formData) {
  // IP 주소 확인
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || '127.0.0.1';

  // Rate Limiter: 시도 횟수 확인
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_TIMEFRAME);

  if (recentAttempts.length >= RATE_LIMIT_ATTEMPTS) {
    return { error: '로그인 시도 횟수가 너무 많습니다. 10분 후에 다시 시도해 주세요.' };
  }

  const pin = formData.get('pin')?.toString().trim();

  if (!pin || pin.length !== 6) {
    return { error: '6자리 PIN을 입력해 주세요.' };
  }

  try {
    const isValid = verifyTOTP(pin);

    if (!isValid) {
      // 로그인 실패: 시도 기록
      loginAttempts.set(ip, [...recentAttempts, now]);
      return { error: '잘못된 PIN입니다. 다시 시도해 주세요.' };
    }

    // 로그인 성공: 시도 기록 초기화
    loginAttempts.delete(ip);

    await createSession();
  } catch {
    return { error: '인증 중 오류가 발생했습니다.' };
  }

  redirect('/admin');
}

/**
 * 로그아웃
 */
export async function logout() {
  await deleteSession();
  redirect('/admin/login');
}

/**
 * 모든 링크 조회
 */
export async function getAllLinks() {
  const session = await verifySession();
  if (!session.isAuthenticated) {
    return { error: '인증이 필요합니다.' };
  }

  try {
    const links = await getDbClient().link.findMany({
      orderBy: { id: 'desc' },
    });

    return {
      links: links.map((link) => ({
        ...link,
        shortUrl: `${BASE_URL}/${link.shortCode}`,
      })),
    };
  } catch {
    return { error: '링크 조회 중 오류가 발생했습니다.' };
  }
}

/**
 * 커스텀 링크 생성
 */
export async function createCustomLink(formData) {
  const session = await verifySession();
  if (!session.isAuthenticated) {
    return { error: '인증이 필요합니다.' };
  }

  const originalUrl = formData.get('url')?.toString().trim();
  const customCode = formData.get('shortCode')?.toString().trim();

  if (!originalUrl) {
    return { error: 'URL을 입력해 주세요.' };
  }

  if (!isValidUrl(originalUrl)) {
    return { error: '올바른 URL 형식이 아닙니다.' };
  }

  if (customCode && !isValidShortCode(customCode)) {
    return { error: '코드는 영문자와 숫자만 사용 가능합니다 (1-20자).' };
  }

  try {
    // 커스텀 코드 중복 확인
    if (customCode) {
      const existing = await getDbClient().link.findUnique({
        where: { shortCode: customCode },
      });

      if (existing) {
        return { error: '이미 사용 중인 코드입니다.' };
      }
    }

    // 코드 결정 (커스텀 또는 랜덤)
    const shortCode = customCode || generateCode();

    const link = await getDbClient().link.create({
      data: {
        originalUrl,
        shortCode,
        createdAt: getKoreanDateTime(),
      },
    });

    return {
      success: true,
      link: {
        ...link,
        shortUrl: `${BASE_URL}/${link.shortCode}`,
      },
    };
  } catch {
    return { error: '링크 생성 중 오류가 발생했습니다.' };
  }
}

/**
 * 링크 수정
 */
export async function updateLink(formData) {
  const session = await verifySession();
  if (!session.isAuthenticated) {
    return { error: '인증이 필요합니다.' };
  }

  const id = parseInt(formData.get('id'), 10);
  const originalUrl = formData.get('originalUrl')?.toString().trim();
  const shortCode = formData.get('shortCode')?.toString().trim();

  if (!id) {
    return { error: '링크 ID가 필요합니다.' };
  }

  if (originalUrl && !isValidUrl(originalUrl)) {
    return { error: '올바른 URL 형식이 아닙니다.' };
  }

  if (shortCode && !isValidShortCode(shortCode)) {
    return { error: '코드는 영문자와 숫자만 사용 가능합니다 (1-20자).' };
  }

  try {
    // shortCode 중복 확인 (다른 링크에서 사용 중인지)
    if (shortCode) {
      const existing = await getDbClient().link.findFirst({
        where: {
          shortCode,
          NOT: { id },
        },
      });

      if (existing) {
        return { error: '이미 사용 중인 코드입니다.' };
      }
    }

    const updateData = {};
    if (originalUrl) updateData.originalUrl = originalUrl;
    if (shortCode) updateData.shortCode = shortCode;

    await getDbClient().link.update({
      where: { id },
      data: updateData,
    });

    return { success: true };
  } catch {
    return { error: '링크 수정 중 오류가 발생했습니다.' };
  }
}

/**
 * 링크 삭제
 */
export async function deleteLink(formData) {
  const session = await verifySession();
  if (!session.isAuthenticated) {
    return { error: '인증이 필요합니다.' };
  }

  const id = parseInt(formData.get('id'), 10);

  if (!id) {
    return { error: '링크 ID가 필요합니다.' };
  }

  try {
    await getDbClient().link.delete({
      where: { id },
    });

    return { success: true };
  } catch {
    return { error: '링크 삭제 중 오류가 발생했습니다.' };
  }
}

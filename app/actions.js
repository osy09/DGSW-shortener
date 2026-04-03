// app/actions.js
'use server';

import { getDbClient } from '@/lib/prisma';
import { generateCode } from '@/utils/base62';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://dgsw.kr';

/**
 * 한국 시간(KST)으로 YYYY-MM-DD HH:mm:ss 형식 반환
 */
function getKoreanDateTime() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000; // UTC+9
  const kstDate = new Date(now.getTime() + kstOffset);

  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  const hours = String(kstDate.getUTCHours()).padStart(2, '0');
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(kstDate.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * URL 유효성 검사
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * URL 단축 Server Action
 */
export async function shortenUrl(formData) {
  const originalUrl = formData.get('url')?.toString().trim();

  // 유효성 검사
  if (!originalUrl) {
    return { error: 'URL을 입력해 주세요.' };
  }

  if (!isValidUrl(originalUrl)) {
    return { error: '올바른 URL 형식이 아닙니다. (http:// 또는 https://로 시작해야 합니다)' };
  }

  try {
    // 이미 존재하는 URL인지 확인
    const existing = await getDbClient().link.findFirst({
      where: { originalUrl },
    });

    if (existing) {
      return {
        success: true,
        shortUrl: `${BASE_URL}/${existing.shortCode}`,
        shortCode: existing.shortCode,
        originalUrl: existing.originalUrl,
      };
    }

    // 고유한 5글자 코드 생성 (충돌 시 재시도)
    let shortCode;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      shortCode = generateCode();
      const exists = await getDbClient().link.findUnique({
        where: { shortCode },
      });
      if (!exists) break;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return { error: '코드 생성에 실패했습니다. 다시 시도해 주세요.' };
    }

    // 새 링크 생성
    await getDbClient().link.create({
      data: {
        originalUrl,
        shortCode,
        createdAt: getKoreanDateTime(),
      },
    });

    return {
      success: true,
      shortUrl: `${BASE_URL}/${shortCode}`,
      shortCode,
      originalUrl,
    };
  } catch {
    return { error: 'URL 단축 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}

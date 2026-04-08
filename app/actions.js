'use server';

import { getDbClient } from '@/lib/prisma';
import { generateCode } from '@/utils/base62';
import { getKoreanDateTime, validateUrl } from '@/utils/common';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://dgsw.kr';
const MAX_CODE_ATTEMPTS = 10;

// URL 단축 Server Action
export async function shortenUrl(formData) {
  const originalUrl = formData.get('url')?.toString().trim();

  if (!originalUrl) return { error: 'URL을 입력해 주세요.' };

  const urlValidation = validateUrl(originalUrl);
  if (!urlValidation.valid) return { error: urlValidation.error };

  try {
    // 기존 URL 확인
    const existing = await getDbClient().link.findFirst({ where: { originalUrl } });
    if (existing) {
      return {
        success: true,
        shortUrl: `${BASE_URL}/${existing.shortCode}`,
        shortCode: existing.shortCode,
        originalUrl: existing.originalUrl,
      };
    }

    // 고유 코드 생성 (충돌 시 재시도)
    let shortCode;
    let attempts = 0;

    while (attempts < MAX_CODE_ATTEMPTS) {
      shortCode = generateCode();
      const exists = await getDbClient().link.findUnique({ where: { shortCode } });
      if (!exists) break;
      attempts++;
    }

    if (attempts >= MAX_CODE_ATTEMPTS) {
      return { error: '코드 생성에 실패했습니다. 다시 시도해 주세요.' };
    }

    await getDbClient().link.create({
      data: { originalUrl, shortCode, createdAt: getKoreanDateTime() },
    });

    return { success: true, shortUrl: `${BASE_URL}/${shortCode}`, shortCode, originalUrl };
  } catch {
    return { error: 'URL 단축 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}

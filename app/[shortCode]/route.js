// app/[shortCode]/route.js

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { shortCode } = await params;

  try {
    // 단축 코드로 링크 조회
    const link = await prisma.link.findUnique({
      where: { shortCode },
    });

    if (!link) {
      // 존재하지 않는 링크인 경우 메인 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/', request.url));
    }

    // 클릭 수 증가 (비동기로 처리, 리다이렉트 응답에 영향 없음)
    prisma.link.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } },
    }).catch(console.error);

    // 301 Permanent Redirect (SEO 친화적)
    return NextResponse.redirect(link.originalUrl, {
      status: 301,
    });
  } catch (error) {
    console.error('리다이렉트 오류:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}

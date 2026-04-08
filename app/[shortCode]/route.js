import { getDbClient } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://dgsw.kr';

export async function GET(request, { params }) {
  const { shortCode } = await params;

  try {
    const db = getDbClient();
    const link = await db.link.findUnique({ where: { shortCode } });

    if (!link) return NextResponse.redirect(BASE_URL, { status: 302 });

    // 클릭 수 증가 (비동기)
    db.link.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } },
    }).catch((err) => console.error(`[Click Error] ${shortCode}:`, err.message));

    return NextResponse.redirect(link.originalUrl, { status: 302 });
  } catch (err) {
    console.error(`[Redirect Error] ${shortCode}:`, err.message);
    return NextResponse.redirect(BASE_URL, { status: 302 });
  }
}

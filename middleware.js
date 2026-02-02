// middleware.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'admin_session';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Admin 경로가 아니면 통과
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // 로그인 페이지는 통과
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // JWT 토큰 확인
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  try {
    const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};

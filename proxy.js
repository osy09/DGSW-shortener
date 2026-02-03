// proxy.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'admin_session';

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Admin 경로가 아니면 통과
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // JWT 토큰 확인
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // 로그인 페이지: 이미 인증되어 있으면 /admin으로 리다이렉트
  if (pathname === '/admin/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // 그 외 admin 페이지: 인증 필요
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

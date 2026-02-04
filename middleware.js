// middleware.js
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'admin_session';

// 런타임 환경변수 로딩
function getJwtSecret() {
  // Edge Runtime에서는 fs 사용 불가, process.env 직접 사용
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[Middleware] JWT_SECRET not found');
    return null;
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Admin 경로가 아니면 통과
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const JWT_SECRET = getJwtSecret();
  if (!JWT_SECRET) {
    // JWT_SECRET이 없으면 로그인 페이지로
    if (pathname !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  // JWT 토큰 확인
  const token = request.cookies.get(COOKIE_NAME)?.value;

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

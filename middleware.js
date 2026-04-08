import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'admin_session';

// JWT Secret 로드 (Edge Runtime)
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[Middleware] JWT_SECRET not found');
    return null;
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();

  const JWT_SECRET = getJwtSecret();
  if (!JWT_SECRET) {
    if (pathname !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

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

  // 로그인 페이지: 인증됐으면 /admin으로 리다이렉트
  if (pathname === '/admin/login') {
    return isAuthenticated
      ? NextResponse.redirect(new URL('/admin', request.url))
      : NextResponse.next();
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

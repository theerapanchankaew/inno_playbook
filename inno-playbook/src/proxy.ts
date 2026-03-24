import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// เส้นทางที่ไม่ต้อง login
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/reset',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // อนุญาต public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ตรวจ session cookie ที่ AuthContext ตั้งไว้หลัง login
  const session = request.cookies.get('__inno_session');
  if (!session) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // ป้องกันทุก route ยกเว้น static files, _next, และ api
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};

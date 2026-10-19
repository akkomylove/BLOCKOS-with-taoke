import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const publicRoute = pathname === '/' || pathname === '/login' || pathname.startsWith('/api/auth/')
    || pathname.startsWith('/api/open/') || pathname === '/api/db-status' || pathname.startsWith('/assets/');
  if (publicRoute) return NextResponse.next();
  const hasSession = req.cookies.getAll().some(cookie => !!cookie.value && (
    ['blockos-session', 'demo-session', 'authjs.session-token', '__Secure-authjs.session-token'].includes(cookie.name)
    || /^(?:__Secure-)?authjs\.session-token\.\d+$/.test(cookie.name)));
  if (hasSession || req.headers.get('authorization')?.startsWith('Bearer ')) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const login = new URL('/login', req.url);
  login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)'] };

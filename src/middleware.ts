import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { nextUrl } = req;

  const nextAuthToken = req.cookies.get('authjs.session-token') || req.cookies.get('__Secure-authjs.session-token');
  const demoSession = req.cookies.get('demo-session');
  const isLoggedIn = !!nextAuthToken || !!demoSession;
  
  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
  const isPublicRoute = nextUrl.pathname === '/login' || nextUrl.pathname === '/';
  const isApiRoute = nextUrl.pathname.startsWith('/api');

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  if (isLoggedIn && nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', nextUrl));
  }

  if (!isLoggedIn && isApiRoute && !isApiAuthRoute) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};


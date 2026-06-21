import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAMES = ['bcost_token', 'bcost_access_token'];
const AUTH_REQUIRED_PATHS = ['/dashboard', '/upload-xml'];
const PUBLIC_PATHS = ['/login'];
const DEFAULT_AUTH_REDIRECT = '/dashboard/intelligence';

function hasSession(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => {
    const value = request.cookies.get(name)?.value;
    return Boolean(value && value !== 'null' && value !== 'undefined');
  });
}

function isAuthRequiredPath(pathname: string): boolean {
  return AUTH_REQUIRED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionExists = hasSession(request);

  if (isAuthRequiredPath(pathname) && !sessionExists) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('session', 'required');
    loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicPath(pathname) && sessionExists) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = DEFAULT_AUTH_REDIRECT;
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/upload-xml/:path*', '/login'],
};

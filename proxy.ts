import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAMES = [
  'bcost_token',
  'bcost_access_token',
  'token',
  'access_token',
  'accessToken',
] as const;
const COMPANY_COOKIE_NAMES = [
  'bcost_company_id',
  'companyId',
  'activeCompanyId',
] as const;
const CLEARABLE_SESSION_COOKIE_NAMES = [
  ...SESSION_COOKIE_NAMES,
  ...COMPANY_COOKIE_NAMES,
] as const;
const AUTH_REQUIRED_PATHS = ['/dashboard', '/upload-xml'];
const PUBLIC_PATHS = ['/login'];
const DEFAULT_AUTH_REDIRECT = '/dashboard/intelligence';
const DEMO_TOKEN = 'demo-token-local';

function hasSession(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => {
    const value = request.cookies.get(name)?.value;
    return Boolean(value && value !== 'null' && value !== 'undefined');
  });
}

function hasDemoSession(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => request.cookies.get(name)?.value === DEMO_TOKEN);
}

function isControlledDemoAccessEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' &&
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK === 'true' &&
    process.env.NEXT_PUBLIC_DEMO_ACCESS_MODE === 'controlled'
  );
}

function isOfficialHost(request: NextRequest): boolean {
  const hostname = request.nextUrl.hostname.toLowerCase();
  return hostname === 'bcost.com.br' || hostname.endsWith('.bcost.com.br');
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
  const disallowedDemoSessionOnOfficialHost =
    isOfficialHost(request) && hasDemoSession(request) && !isControlledDemoAccessEnabled();

  if (isAuthRequiredPath(pathname) && (!sessionExists || disallowedDemoSessionOnOfficialHost)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set(
      'session',
      disallowedDemoSessionOnOfficialHost ? 'demo-disabled' : 'required',
    );
    loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);

    if (disallowedDemoSessionOnOfficialHost) {
      for (const cookieName of CLEARABLE_SESSION_COOKIE_NAMES) {
        response.cookies.delete(cookieName);
      }
    }

    return response;
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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

function makeRequest(pathname: string, cookie?: string, origin = 'https://app.bcost.com.br'): NextRequest {
  return new NextRequest(`${origin}${pathname}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe('proxy', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('redirects protected dashboard routes to login without a session cookie', () => {
    const response = proxy(makeRequest('/dashboard/intelligence'));
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toContain('/login');
    expect(location).toContain('session=required');
    expect(location).toContain('redirect=%2Fdashboard%2Fintelligence');
  });

  it('allows protected dashboard routes with legacy auth cookies', () => {
    const response = proxy(makeRequest('/dashboard/intelligence', 'access_token=jwt-legacy'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('does not treat company cookies as authenticated sessions', () => {
    const response = proxy(makeRequest('/dashboard/companies', 'bcost_company_id=company-001'));
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toContain('/login');
    expect(location).toContain('session=required');
  });

  it('blocks stale demo cookies on official hosts before serving protected pages', () => {
    const response = proxy(
      makeRequest('/dashboard/intelligence', 'bcost_token=demo-token-local; bcost_company_id=demo-001'),
    );
    const location = response.headers.get('location');
    const expiredCookies = response.headers.getSetCookie().join(';');

    expect(response.status).toBe(307);
    expect(location).toContain('/login');
    expect(location).toContain('session=demo-disabled');
    expect(expiredCookies).toContain('bcost_token=');
    expect(expiredCookies).toContain('bcost_company_id=');
  });

  it('allows controlled demo cookies on official hosts when release flags are explicit', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'true');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'true');
    vi.stubEnv('NEXT_PUBLIC_DEMO_ACCESS_MODE', 'controlled');

    const response = proxy(
      makeRequest('/dashboard/intelligence', 'bcost_token=demo-token-local; bcost_company_id=demo-001'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('keeps demo cookies usable outside official hosts for controlled local demos', () => {
    const response = proxy(
      makeRequest('/dashboard/intelligence', 'bcost_token=demo-token-local', 'http://localhost:3000'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects logged sessions away from the login route', () => {
    const response = proxy(makeRequest('/login', 'bcost_token=jwt-current'));
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toBe('https://app.bcost.com.br/dashboard/intelligence');
  });
});

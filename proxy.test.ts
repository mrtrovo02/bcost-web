import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

function makeRequest(pathname: string, cookie?: string): NextRequest {
  return new NextRequest(`https://app.bcost.com.br${pathname}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe('proxy', () => {
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

  it('redirects logged sessions away from the login route', () => {
    const response = proxy(makeRequest('/login', 'bcost_token=jwt-current'));
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toBe('https://app.bcost.com.br/dashboard/intelligence');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  createBcostTraceId,
  getToken,
  isDemoSession,
  isMfaRequiredResponse,
  login,
  resolveRequestAuthMetadata,
  resolveRequestCompanyId,
  resolveRequestHeaders,
  verifyMfa,
} from '../api';

describe('isDemoSession', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'bcost_token=; path=/; max-age=0';
    document.cookie = 'bcost_access_token=; path=/; max-age=0';
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'true');
    vi.restoreAllMocks();
  });

  it('does not treat missing auth as a demo session', () => {
    expect(isDemoSession()).toBe(false);
  });

  it('does not enable demo implicitly on official bCost domains', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
        pathname: '/login',
        search: '',
        replace: vi.fn(),
      },
    });
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'false');
    localStorage.setItem('bcost_token', 'demo-token-local');

    expect(isDemoSession()).toBe(false);
  });

  it('drops stale demo tokens on official bCost domains when demo is disabled', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
        pathname: '/dashboard',
        search: '',
        replace: vi.fn(),
      },
    });
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'false');
    localStorage.setItem('bcost_token', 'demo-token-local');

    expect(getToken()).toBeNull();
    expect(resolveRequestHeaders(getToken(), 'demo-001')).toEqual({});
  });

  it('keeps local demo support on localhost during development', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'localhost',
        pathname: '/login',
        search: '',
        replace: vi.fn(),
      },
    });
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'false');
    localStorage.setItem('bcost_token', 'demo-token-local');

    expect(isDemoSession()).toBe(true);
  });

  it('detects an explicit demo token as a demo session', () => {
    localStorage.setItem('bcost_token', 'demo-token-local');

    expect(isDemoSession()).toBe(true);
  });

  it('adds demo auth metadata for demo company context without a real token', () => {
    expect(resolveRequestAuthMetadata(null, 'demo-001')).toEqual({
      token: 'demo-token-local',
      isDemoRequest: true,
    });
  });

  it('does not downgrade a real token to demo auth even with stale demo company context', () => {
    expect(resolveRequestAuthMetadata('real-jwt-token', 'demo-001')).toEqual({
      token: 'real-jwt-token',
      isDemoRequest: false,
    });
  });

  it('does not send stale demo company id with real tokens', () => {
    expect(resolveRequestCompanyId('real-jwt-token', 'demo-001')).toBeNull();
  });

  it('keeps real company id with real tokens', () => {
    expect(resolveRequestCompanyId('real-jwt-token', 'company-real-001')).toBe(
      'company-real-001',
    );
  });

  it('does not send stale real company id without an authenticated token', () => {
    expect(resolveRequestCompanyId(null, 'company-real-001')).toBeNull();
    expect(resolveRequestHeaders(null, 'company-real-001')).toEqual({});
  });

  it('keeps demo company id when request has no real token', () => {
    expect(resolveRequestCompanyId(null, 'demo-001')).toBe('demo-001');
  });

  it('adds the controlled demo session header for explicit demo requests', () => {
    expect(resolveRequestHeaders('demo-token-local', 'demo-001')).toEqual({
      Authorization: 'Bearer demo-token-local',
      'x-company-id': 'demo-001',
      'x-demo-session': 'true',
    });
  });

  it('does not send demo session headers when a real token has stale demo context', () => {
    expect(resolveRequestHeaders('real-jwt-token', 'demo-001')).toEqual({
      Authorization: 'Bearer real-jwt-token',
    });
  });

  it('creates frontend trace IDs with the bCost web prefix', () => {
    expect(createBcostTraceId()).toMatch(/^web-/);
  });

  it('overwrites stale per-call auth and tenant headers through the axios interceptor', async () => {
    localStorage.setItem('bcost_token', 'real-jwt-token');
    localStorage.setItem('bcost_company_id', 'company-real-001');

    let capturedHeaders: Record<string, string | undefined> = {};

    await api.get('/secure-route', {
      headers: {
        Authorization: 'Bearer stale-token',
        'x-company-id': 'demo-001',
        'x-demo-session': 'true',
        'x-bcost-trace-id': 'stale-trace-id',
      },
      adapter: async (config) => {
        capturedHeaders = JSON.parse(JSON.stringify(config.headers)) as Record<
          string,
          string | undefined
        >;

        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      },
    });

    expect(capturedHeaders.Authorization).toBe('Bearer real-jwt-token');
    expect(capturedHeaders['x-company-id']).toBe('company-real-001');
    expect(capturedHeaders['x-demo-session']).toBeUndefined();
    expect(capturedHeaders['x-bcost-trace-id']).toMatch(/^web-/);
    expect(capturedHeaders['x-bcost-trace-id']).not.toBe('stale-trace-id');
  });

  it('does not persist an MFA challenge as an authenticated session', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        access_token: null,
        mfaRequired: true,
        mfaSession: 'mfa-session-001',
        user: {
          id: 'user-001',
          email: 'amandacontabil@bcost.com.br',
          name: 'Amanda',
        },
      },
    });

    const response = await login('amandacontabil@bcost.com.br', 'secure-password');

    expect(isMfaRequiredResponse(response)).toBe(true);
    expect(getToken()).toBeNull();
    expect(localStorage.getItem('bcost_user')).toBeNull();
  });

  it('persists the authenticated session only after MFA verification', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'jwt-after-mfa',
        refresh_token: 'refresh-after-mfa',
        user: {
          id: 'user-001',
          email: 'amandacontabil@bcost.com.br',
          name: 'Amanda',
          companyId: 'company-amel',
        },
        companyId: 'company-amel',
        companies: [
          {
            id: 'company-amel',
            name: 'Amel Contabilidade Digital LTDA',
            cnpj: '00.000.000/0001-00',
          },
        ],
      },
    });

    const response = await verifyMfa('mfa-session-001', '123456');

    expect(response.access_token).toBe('jwt-after-mfa');
    expect(getToken()).toBe('jwt-after-mfa');
    expect(localStorage.getItem('bcost_company_id')).toBe('company-amel');
  });
});

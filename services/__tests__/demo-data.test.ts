import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_COMPANIES, seedDemoData } from '../demo-data';
import { deleteCookie, writeCookie } from '../api';

vi.mock('../api', () => ({
  deleteCookie: vi.fn(),
  writeCookie: vi.fn(),
}));

const deleteCookieMock = vi.mocked(deleteCookie);
const writeCookieMock = vi.mocked(writeCookie);

describe('seedDemoData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'true');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'true');
    vi.stubEnv('NEXT_PUBLIC_DEMO_ACCESS_MODE', 'controlled');
    vi.stubEnv('NODE_ENV', 'development');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'localhost',
      },
    });
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('clears real and legacy session artifacts before creating the demo session', () => {
    const staleKeys = [
      'bcost_token',
      'bcost_access_token',
      'bcost_refresh_token',
      'token',
      'access_token',
      'accessToken',
      'refresh_token',
      'refreshToken',
      'bcost_company_id',
      'companyId',
      'activeCompanyId',
      'bcost_user',
      'user',
      'auth_user',
    ];

    staleKeys.forEach((key) => window.localStorage.setItem(key, `stale-${key}`));

    expect(seedDemoData()).toBe(true);

    expect(window.localStorage.getItem('token')).toBeNull();
    expect(window.localStorage.getItem('access_token')).toBeNull();
    expect(window.localStorage.getItem('accessToken')).toBeNull();
    expect(window.localStorage.getItem('refresh_token')).toBeNull();
    expect(window.localStorage.getItem('refreshToken')).toBeNull();
    expect(window.localStorage.getItem('bcost_token')).toBe('demo-token-local');
    expect(window.localStorage.getItem('bcost_company_id')).toBe(DEMO_COMPANIES[0]?.id);
    expect(window.sessionStorage.getItem('bcost_demo_seeded')).toBe('true');
    const user = JSON.parse(window.localStorage.getItem('bcost_user') ?? '{}') as {
      companyId?: string;
      activeCompanyId?: string;
      companies?: unknown[];
    };
    expect(user.companyId).toBe(DEMO_COMPANIES[0]?.id);
    expect(user.activeCompanyId).toBe(DEMO_COMPANIES[0]?.id);
    expect(user.companies).toHaveLength(DEMO_COMPANIES.length);
    expect(window.localStorage.getItem('user')).toBe(window.localStorage.getItem('bcost_user'));
    expect(deleteCookieMock).toHaveBeenCalledWith('bcost_token');
    expect(deleteCookieMock).toHaveBeenCalledWith('bcost_access_token');
    expect(deleteCookieMock).toHaveBeenCalledWith('bcost_refresh_token');
    expect(deleteCookieMock).toHaveBeenCalledWith('bcost_company_id');
    expect(writeCookieMock).toHaveBeenCalledWith('bcost_token', 'demo-token-local');
    expect(writeCookieMock).toHaveBeenCalledWith('bcost_access_token', 'demo-token-local');
    expect(writeCookieMock).toHaveBeenCalledWith('bcost_company_id', DEMO_COMPANIES[0]?.id);
  });

  it('blocks demo seeding on official domains when the public demo flag is disabled', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'false');
    vi.stubEnv('NODE_ENV', 'development');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
      },
    });

    expect(seedDemoData()).toBe(false);
    expect(window.localStorage.getItem('bcost_token')).toBeNull();
    expect(writeCookieMock).not.toHaveBeenCalled();
  });

  it('blocks demo seeding on official domains without controlled access mode', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'true');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'true');
    vi.stubEnv('NEXT_PUBLIC_DEMO_ACCESS_MODE', '');
    vi.stubEnv('NODE_ENV', 'development');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
      },
    });

    expect(seedDemoData()).toBe(false);
    expect(window.localStorage.getItem('bcost_token')).toBeNull();
    expect(writeCookieMock).not.toHaveBeenCalled();
  });
});

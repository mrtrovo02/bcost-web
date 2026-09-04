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
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
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
    expect(deleteCookieMock).toHaveBeenCalledWith('bcost_token');
    expect(deleteCookieMock).toHaveBeenCalledWith('bcost_access_token');
    expect(deleteCookieMock).toHaveBeenCalledWith('bcost_refresh_token');
    expect(deleteCookieMock).toHaveBeenCalledWith('bcost_company_id');
    expect(writeCookieMock).toHaveBeenCalledWith('bcost_token', 'demo-token-local');
    expect(writeCookieMock).toHaveBeenCalledWith('bcost_access_token', 'demo-token-local');
    expect(writeCookieMock).toHaveBeenCalledWith('bcost_company_id', DEMO_COMPANIES[0]?.id);
  });
});

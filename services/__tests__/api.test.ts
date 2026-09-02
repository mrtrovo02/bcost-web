import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  getToken,
  isDemoSession,
  isMfaRequiredResponse,
  login,
  resolveRequestAuthMetadata,
  resolveRequestCompanyId,
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

  it('keeps demo company id when request has no real token', () => {
    expect(resolveRequestCompanyId(null, 'demo-001')).toBe('demo-001');
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

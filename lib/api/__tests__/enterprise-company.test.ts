import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readStoredEnterpriseCompanyId,
  resolveEnterpriseCompanyIdWithFallback,
} from '../enterprise-company';
import { api, isDemoSession } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
  isDemoSession: vi.fn(() => false),
}));

vi.mock('@/lib/api/enterprise-demo', () => ({
  getDemoEnterpriseCompanyId: () => 'demo-001',
}));

vi.mock('@/lib/config/demo-policy', () => ({
  assertOperationalDemoFallbackEnabled: vi.fn((message?: string) => {
    const error = new Error(message || 'Fallback demonstrativo desabilitado.');
    Object.assign(error, { code: 'DEMO_FALLBACK_DISABLED' });
    throw error;
  }),
}));

const apiGetMock = vi.mocked(api.get);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('enterprise-company resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    isDemoSessionMock.mockReturnValue(false);
  });

  it('keeps explicit demo company ids stored by the demo session', async () => {
    isDemoSessionMock.mockReturnValue(true);
    window.localStorage.setItem('bcost_active_company', 'demo-001');

    expect(readStoredEnterpriseCompanyId()).toBe('demo-001');
    await expect(resolveEnterpriseCompanyIdWithFallback()).resolves.toBe('demo-001');
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('uses demo company id for explicit demo sessions', async () => {
    isDemoSessionMock.mockReturnValue(true);

    await expect(resolveEnterpriseCompanyIdWithFallback()).resolves.toBe('demo-001');
    expect(window.localStorage.getItem('bcost_active_company')).toBe('demo-001');
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('ignores stale demo company id in real sessions and resolves auth company', async () => {
    window.localStorage.setItem('bcost_active_company', 'demo-001');
    window.localStorage.setItem('bcost_company_id', 'demo-001');
    apiGetMock.mockResolvedValueOnce({
      data: {
        id: 'user-1',
        email: 'amandacontabil@bcost.com.br',
        activeCompanyId: 'company-real-001',
      },
    });

    await expect(resolveEnterpriseCompanyIdWithFallback()).resolves.toBe('company-real-001');
    expect(window.localStorage.getItem('bcost_active_company')).toBe('company-real-001');
    expect(window.localStorage.getItem('bcost_company_id')).toBe('company-real-001');
    expect(window.localStorage.getItem('companyId')).toBe('company-real-001');
    expect(window.localStorage.getItem('activeCompanyId')).toBe('company-real-001');
    expect(apiGetMock).toHaveBeenCalledWith('/auth/me');
  });

  it('prefers authenticated company over stale real company stored locally', async () => {
    window.localStorage.setItem('bcost_active_company', 'company-old-001');
    window.localStorage.setItem('bcost_company_id', 'company-old-001');
    apiGetMock.mockResolvedValueOnce({
      data: {
        id: 'user-2',
        email: 'novo@bcost.com.br',
        activeCompanyId: 'company-new-001',
      },
    });

    await expect(resolveEnterpriseCompanyIdWithFallback()).resolves.toBe('company-new-001');
    expect(window.localStorage.getItem('bcost_active_company')).toBe('company-new-001');
    expect(window.localStorage.getItem('bcost_company_id')).toBe('company-new-001');
  });

  it('does not silently create demo company for real sessions without company context', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(resolveEnterpriseCompanyIdWithFallback()).rejects.toMatchObject({
      code: 'DEMO_FALLBACK_DISABLED',
    });
  });
});

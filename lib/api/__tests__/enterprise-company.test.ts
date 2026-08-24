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

  it('does not silently create demo company for real sessions without company context', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(resolveEnterpriseCompanyIdWithFallback()).rejects.toMatchObject({
      code: 'DEMO_FALLBACK_DISABLED',
    });
  });
});

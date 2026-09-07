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

  it('resolves linked membership company from authenticated user payload', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-amanda',
          email: 'amandacontabil@bcost.com.br',
          companies: [
            {
              companyId: 'company-amel',
              role: 'ACCOUNTANT',
              company: {
                id: 'company-amel',
                name: 'Amel Contabilidade Digital LTDA',
                cnpj: '12.345.678/0001-10',
              },
            },
          ],
        },
      },
    });

    await expect(resolveEnterpriseCompanyIdWithFallback()).resolves.toBe('company-amel');
    expect(window.localStorage.getItem('bcost_active_company')).toBe('company-amel');
    expect(window.localStorage.getItem('bcost_company_id')).toBe('company-amel');
  });

  it('uses stored real company when it belongs to authenticated membership list', async () => {
    window.localStorage.setItem('bcost_company_id', 'company-amel-secondary');
    apiGetMock.mockResolvedValueOnce({
      data: {
        id: 'user-amanda',
        email: 'amandacontabil@bcost.com.br',
        companies: [
          {
            companyId: 'company-amel-main',
            company: {
              id: 'company-amel-main',
              name: 'Amel Matriz',
            },
          },
          {
            companyId: 'company-amel-secondary',
            company: {
              id: 'company-amel-secondary',
              name: 'Amel Filial',
            },
          },
        ],
      },
    });

    await expect(resolveEnterpriseCompanyIdWithFallback()).resolves.toBe('company-amel-secondary');
    expect(window.localStorage.getItem('bcost_active_company')).toBe('company-amel-secondary');
  });

  it('does not silently create demo company for real sessions without company context', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(resolveEnterpriseCompanyIdWithFallback()).rejects.toMatchObject({
      code: 'REAL_COMPANY_CONTEXT_REQUIRED',
    });
    expect(window.localStorage.getItem('bcost_active_company')).toBeNull();
    expect(window.localStorage.getItem('bcost_company_id')).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fiscalApi } from '../fiscal';
import { hrApi } from '../hr';
import { revenueApi } from '../revenue';
import { api, getActiveCompanyId, getToken } from '@/services/api';
import { payrollEnterpriseApi } from '../payroll-enterprise';

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');

  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
    },
    getActiveCompanyId: vi.fn(),
    getToken: vi.fn(),
  };
});

vi.mock('../payroll-enterprise', () => ({
  payrollEnterpriseApi: {
    listPayrolls: vi.fn(),
    summary: vi.fn(),
  },
}));

const apiGetMock = vi.mocked(api.get);
const getActiveCompanyIdMock = vi.mocked(getActiveCompanyId);
const getTokenMock = vi.mocked(getToken);
const listPayrollsMock = vi.mocked(payrollEnterpriseApi.listPayrolls);
const payrollSummaryMock = vi.mocked(payrollEnterpriseApi.summary);

describe('tenant company resolution for legacy frontend APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    getTokenMock.mockReturnValue('real-jwt-token');
    getActiveCompanyIdMock.mockReturnValue('company-real-001');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it('uses the canonical active company resolver for revenue URLs', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        data: {
          id: 'user-1',
          email: 'amandacontabil@bcost.com.br',
          activeCompanyId: 'company-real-001',
        },
      })
      .mockResolvedValueOnce({ data: { mrr: 1000 } });

    await revenueApi.getStats();

    expect(apiGetMock).toHaveBeenNthCalledWith(1, '/auth/me');
    expect(apiGetMock).toHaveBeenNthCalledWith(2, '/revenue/stats/company-real-001');
  });

  it('blocks stale demo company ids in revenue when token is real', async () => {
    getActiveCompanyIdMock.mockReturnValue('demo-001');
    window.localStorage.setItem('bcost_active_company', 'demo-001');
    window.localStorage.setItem('bcost_company_id', 'demo-001');
    apiGetMock.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(revenueApi.getContracts()).rejects.toThrow(
      'Nenhuma empresa real ativa foi encontrada',
    );
    expect(apiGetMock).toHaveBeenCalledWith('/auth/me');
  });

  it('keeps revenue local for explicit demo sessions', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'true');
    getTokenMock.mockReturnValue('demo-token-local');
    getActiveCompanyIdMock.mockReturnValue('demo-001');
    window.localStorage.setItem('bcost_token', 'demo-token-local');
    window.localStorage.setItem('bcost_active_company', 'demo-001');

    const [stats, contracts] = await Promise.all([
      revenueApi.getStats(),
      revenueApi.getContracts(),
    ]);

    expect(stats.totalRevenue).toBeGreaterThan(0);
    expect(contracts).toHaveLength(3);
    expect(contracts[0]).toMatchObject({
      companyId: 'demo-001',
      source: 'DEMO_LOCAL',
    });
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('uses the canonical active company resolver for fiscal URLs', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        data: {
          id: 'user-1',
          email: 'amandacontabil@bcost.com.br',
          activeCompanyId: 'company-real-001',
        },
      })
      .mockResolvedValueOnce({ data: [] });

    await fiscalApi.getInvoices();

    expect(apiGetMock).toHaveBeenNthCalledWith(1, '/auth/me');
    expect(apiGetMock).toHaveBeenNthCalledWith(2, '/fiscal/invoices/company-real-001');
  });

  it('blocks stale demo company ids in fiscal when token is real', async () => {
    getActiveCompanyIdMock.mockReturnValue('demo-001');
    window.localStorage.setItem('bcost_active_company', 'demo-001');
    window.localStorage.setItem('bcost_company_id', 'demo-001');
    apiGetMock.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(fiscalApi.getDashboard()).rejects.toThrow(
      'Nenhuma empresa real ativa foi encontrada',
    );
    expect(apiGetMock).toHaveBeenCalledWith('/auth/me');
  });

  it('uses the canonical active company resolver for HR payroll', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        id: 'user-1',
        email: 'amandacontabil@bcost.com.br',
        activeCompanyId: 'company-real-001',
      },
    });
    listPayrollsMock.mockResolvedValueOnce({
      status: 'OK',
      module: 'payrolls',
      model: 'Payroll',
      companyId: 'company-real-001',
      items: [
        {
          id: 'payroll-1',
          companyId: 'company-real-001',
          month: 8,
          year: 2026,
          salariesAmount: 12000,
          proLaboreAmount: 5000,
          totalAmount: 17000,
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
      hasMore: false,
      generatedAt: new Date().toISOString(),
      summary: {
        count: 1,
        salariesAmount: 12000,
        proLaboreAmount: 5000,
        totalAmount: 17000,
        byPeriod: { '2026-08': 17000 },
      },
    });

    await expect(hrApi.getPayroll()).resolves.toEqual([
      expect.objectContaining({ id: 'payroll-1' }),
    ]);
    expect(apiGetMock).toHaveBeenCalledWith('/auth/me');
    expect(listPayrollsMock).toHaveBeenCalledWith('company-real-001');
  });

  it('does not call payroll API with stale demo company id when token is real', async () => {
    getActiveCompanyIdMock.mockReturnValue('demo-001');
    window.localStorage.setItem('bcost_active_company', 'demo-001');
    window.localStorage.setItem('bcost_company_id', 'demo-001');
    apiGetMock.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(hrApi.getPayroll()).resolves.toEqual([]);
    expect(apiGetMock).toHaveBeenCalledWith('/auth/me');
    expect(listPayrollsMock).not.toHaveBeenCalled();
  });

  it('uses payroll enterprise summary for HR employee metrics', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        id: 'user-1',
        email: 'amandacontabil@bcost.com.br',
        activeCompanyId: 'company-real-001',
      },
    });
    payrollSummaryMock.mockResolvedValueOnce({
      status: 'OK',
      module: 'payroll-enterprise-summary',
      companyId: 'company-real-001',
      employees: {
        count: 3,
        active: 2,
        inactive: 1,
        deleted: 0,
        totalBaseSalary: 21000,
        averageBaseSalary: 7000,
        byRegime: { CLT: 2, SOCIO_ADMINISTRADOR: 1 },
        byRole: { Analista: 2, Socio: 1 },
      },
      payrolls: {
        count: 1,
        salariesAmount: 14000,
        proLaboreAmount: 7000,
        totalAmount: 21000,
        byPeriod: { '2026-08': 21000 },
      },
      entries: {
        count: 2,
        baseSalary: 14000,
        inssEmployee: 1200,
        inssEmployer: 2800,
        irrf: 900,
        fgts: 1120,
        otherBenefits: 600,
        otherDeductions: 100,
        netSalary: 12400,
        employerCost: 17920,
        byRegime: { CLT: 2 },
      },
      generatedAt: '2026-08-26T12:00:00.000Z',
    });

    await expect(hrApi.getEmployeeMetrics()).resolves.toMatchObject({
      employees: {
        total: 3,
        active: 2,
        totalBaseSalary: 21000,
      },
      payroll: {
        payrolls: 1,
        totalAmount: 21000,
        employerCost: 17920,
      },
    });
    expect(apiGetMock).toHaveBeenCalledWith('/auth/me');
    expect(payrollSummaryMock).toHaveBeenCalledWith('company-real-001');
  });

  it('does not call payroll summary with stale demo company id when token is real', async () => {
    getActiveCompanyIdMock.mockReturnValue('demo-001');
    window.localStorage.setItem('bcost_active_company', 'demo-001');
    window.localStorage.setItem('bcost_company_id', 'demo-001');
    apiGetMock.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(hrApi.getEmployeeMetrics()).resolves.toBeNull();
    expect(apiGetMock).toHaveBeenCalledWith('/auth/me');
    expect(payrollSummaryMock).not.toHaveBeenCalled();
  });
});

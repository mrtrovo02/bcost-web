import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    getTokenMock.mockReturnValue('real-jwt-token');
    getActiveCompanyIdMock.mockReturnValue('company-real-001');
  });

  it('uses the canonical active company resolver for revenue URLs', async () => {
    apiGetMock.mockResolvedValueOnce({ data: { mrr: 1000 } });

    await revenueApi.getStats();

    expect(apiGetMock).toHaveBeenCalledWith('/revenue/stats/company-real-001');
  });

  it('blocks stale demo company ids in revenue when token is real', async () => {
    getActiveCompanyIdMock.mockReturnValue('demo-001');

    await expect(revenueApi.getContracts()).rejects.toThrow(
      'Empresa ativa não encontrada para consultar receitas.',
    );
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('uses the canonical active company resolver for fiscal URLs', async () => {
    apiGetMock.mockResolvedValueOnce({ data: [] });

    await fiscalApi.getInvoices();

    expect(apiGetMock).toHaveBeenCalledWith('/fiscal/invoices/company-real-001');
  });

  it('blocks stale demo company ids in fiscal when token is real', async () => {
    getActiveCompanyIdMock.mockReturnValue('demo-001');

    await expect(fiscalApi.getDashboard()).rejects.toThrow('Empresa não selecionada.');
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('uses the canonical active company resolver for HR payroll', async () => {
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
    expect(listPayrollsMock).toHaveBeenCalledWith('company-real-001');
  });

  it('does not call payroll API with stale demo company id when token is real', async () => {
    getActiveCompanyIdMock.mockReturnValue('demo-001');

    await expect(hrApi.getPayroll()).resolves.toEqual([]);
    expect(listPayrollsMock).not.toHaveBeenCalled();
  });

  it('uses payroll enterprise summary for HR employee metrics', async () => {
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
    expect(payrollSummaryMock).toHaveBeenCalledWith('company-real-001');
  });

  it('does not call payroll summary with stale demo company id when token is real', async () => {
    getActiveCompanyIdMock.mockReturnValue('demo-001');

    await expect(hrApi.getEmployeeMetrics()).resolves.toBeNull();
    expect(payrollSummaryMock).not.toHaveBeenCalled();
  });
});

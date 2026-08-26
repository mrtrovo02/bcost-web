import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { payrollEnterpriseApi } from '../payroll-enterprise';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('@/lib/config/demo-policy', () => ({
  isDemoEntityId: (value?: string | null) =>
    typeof value === 'string' && value.toLowerCase().startsWith('demo-'),
}));

const apiGetMock = vi.mocked(api.get);
const apiPostMock = vi.mocked(api.post);
const apiPatchMock = vi.mocked(api.patch);

describe('payrollEnterpriseApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('serves summary and lists from the local demo store without calling the backend', async () => {
    const [summary, employees, payrolls, entries] = await Promise.all([
      payrollEnterpriseApi.summary('demo-001'),
      payrollEnterpriseApi.listEmployees('demo-001'),
      payrollEnterpriseApi.listPayrolls('demo-001'),
      payrollEnterpriseApi.listPayrollEntries('demo-001'),
    ]);

    expect(summary.companyId).toBe('demo-001');
    expect(summary.employees.active).toBeGreaterThan(0);
    expect(employees.items.length).toBeGreaterThan(0);
    expect(payrolls.items.length).toBeGreaterThan(0);
    expect(entries.items.length).toBeGreaterThan(0);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('keeps demo create and generate actions local to avoid protected production endpoints', async () => {
    const employeeResponse = await payrollEnterpriseApi.createEmployee('demo-001', {
      name: 'Novo Analista Demo',
      cpf: '111.222.333-44',
      admissionAt: '2026-08-01T00:00:00.000Z',
      role: 'Analista contabil',
      baseSalary: 4300,
      regime: 'CLT',
    });

    const payrollResponse = await payrollEnterpriseApi.generatePayroll('demo-001', {
      month: 8,
      year: 2026,
      createAccountingEntry: true,
      createFinancialEvent: true,
    });

    expect(employeeResponse.item?.name).toBe('Novo Analista Demo');
    expect(payrollResponse.entries?.length).toBeGreaterThan(0);
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it('keeps real companies on backend payroll endpoints', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        status: 'success',
        module: 'payroll-enterprise-summary',
        companyId: 'real-company',
        employees: {
          count: 0,
          active: 0,
          inactive: 0,
          deleted: 0,
          totalBaseSalary: 0,
          averageBaseSalary: 0,
          byRegime: {},
          byRole: {},
        },
        payrolls: {
          count: 0,
          salariesAmount: 0,
          proLaboreAmount: 0,
          totalAmount: 0,
          byPeriod: {},
        },
        entries: {
          count: 0,
          baseSalary: 0,
          inssEmployee: 0,
          inssEmployer: 0,
          irrf: 0,
          fgts: 0,
          otherBenefits: 0,
          otherDeductions: 0,
          netSalary: 0,
          employerCost: 0,
          byRegime: {},
        },
        generatedAt: '2026-08-24T00:00:00.000Z',
      },
    });

    const response = await payrollEnterpriseApi.summary('real-company');

    expect(response.companyId).toBe('real-company');
    expect(apiGetMock).toHaveBeenCalledWith('/payroll/enterprise/summary/real-company');
  });
});

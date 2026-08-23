import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, isDemoSession } from '@/services/api';
import { payrollEnterpriseApi } from '../payroll-enterprise';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  isDemoSession: vi.fn(() => true),
}));

const apiGetMock = vi.mocked(api.get);
const apiPostMock = vi.mocked(api.post);
const apiPatchMock = vi.mocked(api.patch);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('payrollEnterpriseApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    isDemoSessionMock.mockReturnValue(true);
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
});

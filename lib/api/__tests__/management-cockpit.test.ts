import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { getDemoManagementCockpit, getManagementCockpit } from '../management-cockpit';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const apiGetMock = vi.mocked(api.get);

describe('management cockpit api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama a rota consolidada do dashboard', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: getDemoManagementCockpit('Empresa Teste'),
    });

    const result = await getManagementCockpit();

    expect(apiGetMock).toHaveBeenCalledWith('/dashboard/management-cockpit');
    expect(result.kpis.revenueYtd).toBeGreaterThan(0);
    expect(result.reconciliation.invoices.total).toBeGreaterThan(0);
  });

  it('gera fallback demo com DRE, caixa, orçamento e centros de custo', () => {
    const result = getDemoManagementCockpit('Empresa Demo');

    expect(result.company.name).toBe('Empresa Demo');
    expect(result.dre.netIncome).toBeGreaterThan(0);
    expect(result.cashFlow.monthly.length).toBeGreaterThan(0);
    expect(result.costCenters.length).toBeGreaterThan(0);
    expect(result.budgetVsActual.revenue.label).toBe('Receita');
  });
});

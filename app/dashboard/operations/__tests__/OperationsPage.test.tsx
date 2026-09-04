import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OperationsPage from '../page';
import { getManagementCockpit } from '@/lib/api/management-cockpit';
import { isDemoSession } from '@/services/api';

vi.mock('@/app/context/CompanyContext', () => ({
  useCompany: () => ({
    selectedCompany: {
      id: 'real-company-001',
      name: 'Empresa Real Ltda',
      cnpj: '12.345.678/0001-90',
    },
  }),
}));

vi.mock('@/lib/api/management-cockpit', () => ({
  getManagementCockpit: vi.fn(),
  getDemoManagementCockpit: vi.fn(() => ({
    company: { id: 'demo-001', name: 'Empresa Demo' },
    kpis: {
      revenueYtd: 1000,
      netCashYtd: 800,
      ebitdaYtd: 600,
      budgetDeviation: 0.1,
    },
    cashFlow: { monthly: [] },
    budget: {
      revenue: { planned: 1000, actual: 900, deviation: -0.1 },
      expenses: { planned: 500, actual: 450, deviation: -0.1 },
      netCash: { planned: 500, actual: 450, deviation: -0.1 },
    },
    dre: [],
    costCenters: [],
    reconciliation: {
      invoices: { total: 0, reconciled: 0, pending: 0 },
      bankTransactions: { total: 0, reconciled: 0, pending: 0 },
    },
    automation: { running: 0, failed: 0 },
    compliance: [],
  })),
}));

vi.mock('@/services/api', () => ({
  isDemoSession: vi.fn(() => false),
}));

const getManagementCockpitMock = vi.mocked(getManagementCockpit);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('OperationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoSessionMock.mockReturnValue(false);
  });

  it('does not show demo management cockpit data when real company API fails', async () => {
    getManagementCockpitMock.mockRejectedValueOnce(new Error('API real indisponivel'));

    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Controladoria indisponível')).toBeInTheDocument();
    });

    expect(screen.getByText('Não foi possível carregar dados reais desta empresa')).toBeInTheDocument();
    expect(screen.getByText('API real indisponivel')).toBeInTheDocument();
    expect(screen.queryByText('Empresa Demo')).not.toBeInTheDocument();
  });
});

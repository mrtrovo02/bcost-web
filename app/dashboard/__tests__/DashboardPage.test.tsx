import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardPage from '../page';
import { api, isDemoSession } from '@/services/api';

const routerPushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('@/app/context/CompanyContext', () => ({
  useCompany: () => ({
    selectedCompany: {
      id: 'company-real-001',
      name: 'Empresa Real Ltda',
      cnpj: '12.345.678/0001-90',
    },
  }),
}));

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
  isDemoSession: vi.fn(() => false),
}));

vi.mock('@/components/TaxEvolutionChart', () => ({
  default: () => <div data-testid="tax-evolution-chart" />,
}));

vi.mock('@/components/alerts/CbsIbsAlertBanner', () => ({
  calcularCbsIbs: vi.fn((baseValue: number) => ({
    baseValue,
    cbs: baseValue * 0.009,
    ibs: baseValue * 0.001,
    total: baseValue * 0.01,
  })),
  default: () => <div data-testid="cbs-ibs-alert" />,
}));

vi.mock('@/components/split-payment/SplitPaymentProjector', () => ({
  default: () => <div data-testid="split-payment-projector" />,
}));

const apiGetMock = vi.mocked(api.get);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoSessionMock.mockReturnValue(false);
  });

  it('does not call productive revenue APIs with a non UUID real company context', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Painel fiscal indisponível')).toBeInTheDocument();
    });

    expect(apiGetMock).not.toHaveBeenCalled();
    expect(screen.getByText('Dados reais não carregados')).toBeInTheDocument();
    expect(screen.queryByText('Faturamento Bruto')).not.toBeInTheDocument();
    expect(routerPushMock).not.toHaveBeenCalled();
  });
});

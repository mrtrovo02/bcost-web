import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardPage from '../page';
import { api, isDemoSession } from '@/services/api';

const routerPushMock = vi.fn();
type TestCompany = {
  readonly id: string;
  readonly name: string;
  readonly cnpj: string;
};

let selectedCompanyMock: TestCompany = {
  id: 'company-real-001',
  name: 'Empresa Real Ltda',
  cnpj: '12.345.678/0001-90',
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('@/app/context/CompanyContext', () => ({
  useCompany: () => ({
    selectedCompany: selectedCompanyMock,
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
    selectedCompanyMock = {
      id: 'company-real-001',
      name: 'Empresa Real Ltda',
      cnpj: '12.345.678/0001-90',
    };
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

  it('delegates dashboard overview tenant headers to the centralized api interceptor', async () => {
    selectedCompanyMock = {
      id: '6befc33e-95cd-4ef4-b111-111111111111',
      name: 'Empresa Real Ltda',
      cnpj: '12.345.678/0001-90',
    };

    apiGetMock.mockResolvedValue({ data: {} });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        '/dashboard/overview',
        expect.not.objectContaining({
          headers: expect.objectContaining({ 'x-company-id': selectedCompanyMock.id }),
        }),
      );
    });
  });
});

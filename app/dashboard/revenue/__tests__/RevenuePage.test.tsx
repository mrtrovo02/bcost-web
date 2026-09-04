import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RevenuePage from '../page';
import { revenueApi } from '@/lib/api/revenue';
import { isDemoSession } from '@/services/api';

vi.mock('@/lib/api/revenue', () => ({
  revenueApi: {
    getStats: vi.fn(),
  },
}));

vi.mock('@/services/api', () => ({
  isDemoSession: vi.fn(() => false),
}));

vi.mock('@/components/split-payment/SplitPaymentProjector', () => ({
  default: () => <div data-testid="split-payment-projector" />,
}));

const getStatsMock = vi.mocked(revenueApi.getStats);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('RevenuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoSessionMock.mockReturnValue(false);
  });

  it('shows a productive error instead of zeroed revenue KPIs when the API fails', async () => {
    getStatsMock.mockRejectedValueOnce(new Error('Falha na API de receita'));

    render(<RevenuePage />);

    await waitFor(() => {
      expect(screen.getByText('Revenue indisponível')).toBeInTheDocument();
    });

    expect(screen.getByText('Dados reais de receita não carregados')).toBeInTheDocument();
    expect(screen.getByText(/Falha na API de receita/)).toBeInTheDocument();
    expect(screen.queryByText('Receita Total')).not.toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InvoicesPage from '../page';
import { fiscalApi } from '@/lib/api/fiscal';
import { isDemoSession } from '@/services/api';

vi.mock('@/lib/api/fiscal', () => ({
  fiscalApi: {
    getInvoices: vi.fn(),
  },
}));

vi.mock('@/services/api', () => ({
  isDemoSession: vi.fn(() => false),
}));

vi.mock('@/components/UploadModal', () => ({
  default: () => <div data-testid="upload-modal" />,
}));

const getInvoicesMock = vi.mocked(fiscalApi.getInvoices);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('InvoicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoSessionMock.mockReturnValue(false);
  });

  it('distinguishes real invoice API failure from an empty XML repository', async () => {
    getInvoicesMock.mockRejectedValueOnce(new Error('Falha na API fiscal'));

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Não foi possível carregar os XMLs reais desta empresa.'),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Falha na API fiscal/)).toBeInTheDocument();
    expect(screen.queryByText('Nenhum XML encontrado no banco de dados.')).not.toBeInTheDocument();
  });
});

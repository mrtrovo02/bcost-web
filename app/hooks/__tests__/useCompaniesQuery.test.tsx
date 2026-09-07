import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompaniesQuery } from '../useCompaniesQuery';
import { companyService } from '@/services/company.service';

vi.mock('@/services/company.service', () => ({
  companyService: {
    getAll: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function QueryTestWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCompaniesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads companies through the central company service', async () => {
    vi.mocked(companyService.getAll).mockResolvedValueOnce([
      {
        id: 'company-amel',
        name: 'Amel Contabilidade Digital LTDA',
        cnpj: '12.345.678/0001-10',
      },
    ]);

    const { result } = renderHook(() => useCompaniesQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(companyService.getAll).toHaveBeenCalledTimes(1);
    expect(result.current.data?.[0]?.id).toBe('company-amel');
  });
});

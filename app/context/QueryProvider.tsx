'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

type QueryErrorLike = {
  response?: {
    status?: number;
  };
};

function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as QueryErrorLike).response?.status;
  return typeof status === 'number' ? status : null;
}

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = getErrorStatus(error);

  if (status && [400, 401, 403, 404, 409, 422].includes(status)) {
    return false;
  }

  return failureCount < 2;
}

function shouldShowQueryDevtools(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS === 'true'
  );
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: false,
            retry: shouldRetryQuery,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {shouldShowQueryDevtools() && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

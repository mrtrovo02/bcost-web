'use client';

import { useQuery } from '@tanstack/react-query';
import { companyService, type Company } from '@/services/company.service';

export const companiesQueryKey = ['companies', 'current-session'] as const;

export function useCompaniesQuery() {
  return useQuery<Company[]>({
    queryKey: companiesQueryKey,
    queryFn: () => companyService.getAll(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

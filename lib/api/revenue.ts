/**
 * bCost Engine - Revenue & Growth Service
 */
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';
import { api } from '@/services/api';
import { RevenueStats } from '../types/global';

async function requireRevenueCompanyId(): Promise<string> {
  const companyId = await resolveEnterpriseCompanyIdWithFallback();

  if (!companyId || companyId === 'ID_DA_EMPRESA') {
    throw new Error('Empresa ativa não encontrada para consultar receitas.');
  }

  return companyId;
}

export const revenueApi = {
  getStats: async (): Promise<RevenueStats> => {
    const companyId = await requireRevenueCompanyId();
    const { data } = await api.get(`/revenue/stats/${companyId}`);
    return data;
  },

  getContracts: async () => {
    const companyId = await requireRevenueCompanyId();
    const { data } = await api.get(`/revenue/contracts/${companyId}`);
    return data;
  },
};

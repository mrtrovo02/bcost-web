/**
 * bCost Engine - Revenue & Growth Service
 */
import { api, getActiveCompanyId, getToken, resolveRequestCompanyId } from '@/services/api';
import { RevenueStats } from '../types/global';

function requireRevenueCompanyId(): string {
  const companyId = resolveRequestCompanyId(getToken(), getActiveCompanyId());

  if (!companyId || companyId === 'ID_DA_EMPRESA') {
    throw new Error('Empresa ativa não encontrada para consultar receitas.');
  }

  return companyId;
}

export const revenueApi = {
  getStats: async (): Promise<RevenueStats> => {
    const companyId = requireRevenueCompanyId();
    const { data } = await api.get(`/revenue/stats/${companyId}`);
    return data;
  },

  getContracts: async () => {
    const companyId = requireRevenueCompanyId();
    const { data } = await api.get(`/revenue/contracts/${companyId}`);
    return data;
  },
};

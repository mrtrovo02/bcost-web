/**
 * bCost Engine - Revenue & Growth Service
 */
import { api } from '@/services/api';
import { RevenueStats } from '../types/global';

export const revenueApi = {
  getStats: async (): Promise<RevenueStats> => {
    const companyId = localStorage.getItem('bcost_active_company');
    const { data } = await api.get(`/revenue/stats/${companyId}`);
    return data;
  },

  getContracts: async () => {
    const companyId = localStorage.getItem('bcost_active_company');
    const { data } = await api.get(`/revenue/contracts/${companyId}`);
    return data;
  },
};

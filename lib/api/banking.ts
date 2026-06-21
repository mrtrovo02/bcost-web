/**
 * bCost Engine - Banking & Reconciliation Service
 */
import { api } from '@/services/api';
import { BankTransaction } from '../types/global';

export const bankingApi = {
  getTransactions: async (): Promise<BankTransaction[]> => {
    const id = localStorage.getItem('bcost_active_company');
    const { data } = await api.get(`/banking/transactions/${id}`);
    return data;
  },

  uploadStatement: async (file: File): Promise<Blob> => {
    const id = localStorage.getItem('bcost_active_company');
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<Blob>(`/banking/upload/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
    });
    return data;
  },

  runAiReconciliation: async (): Promise<{ jobId: string }> => {
    const id = localStorage.getItem('bcost_active_company');
    const { data } = await api.post(`/reconciliation/auto/${id}`);
    return data;
  },
};

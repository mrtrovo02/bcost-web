'use strict';

import { api } from '@/services/api';
import {
  FiscalDashboardStats,
  MonthlyPerformance,
  Invoice,
  BatchUploadResponse,
  XmlDocumentType,
  PayrollDiagnostic,
} from '../types/fiscal';

const resolveCompanyId = (id?: string): string => {
  if (typeof window === 'undefined') return id || '';

  const activeId = id || localStorage.getItem('bcost_active_company');

  if (!activeId || activeId === 'ID_DA_EMPRESA') {
    console.error('⚠️ [bCost]: Requisição bloqueada - companyId ausente ou inválido.');
    throw new Error('Empresa não selecionada.');
  }

  return activeId;
};

export const fiscalApi = {
  getDashboard: async (
    companyId?: string,
    month?: number,
    year?: number,
  ): Promise<FiscalDashboardStats> => {
    const id = resolveCompanyId(companyId);
    const { data } = await api.get(`/fiscal/status/${id}`, {
      params: { month, year },
    });
    return data;
  },

  getPerformance: async (companyId?: string, year?: number): Promise<MonthlyPerformance[]> => {
    const id = resolveCompanyId(companyId);
    const { data } = await api.get(`/fiscal/analytics/pnl/${id}`, {
      params: { year },
    });
    return data;
  },

  getPayrollDiagnostics: async (companyId?: string): Promise<PayrollDiagnostic> => {
    const id = resolveCompanyId(companyId);
    const { data } = await api.get(`/fiscal/diagnostics/${id}`);
    return data;
  },

  getInvoices: async (companyId?: string): Promise<Invoice[]> => {
    const id = resolveCompanyId(companyId);
    const { data } = await api.get(`/fiscal/invoices/${id}`);
    return data;
  },

  uploadXmlBatch: async (
    files: File[],
    type: XmlDocumentType = XmlDocumentType.NFE,
    companyId?: string,
  ): Promise<BatchUploadResponse> => {
    const id = resolveCompanyId(companyId);
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const { data } = await api.post(`/fiscal/upload/${id}`, formData, {
      params: { type },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  exportData: async (
    format: 'DOMINIO' | 'QUESTOR' | 'ALTERDATA',
    companyId?: string,
  ): Promise<Blob> => {
    const id = resolveCompanyId(companyId);
    const { data } = await api.get(`/fiscal/export/${id}`, {
      params: { format },
      responseType: 'blob',
    });
    return data;
  },

  seedDemo: async (companyId?: string): Promise<{ message: string }> => {
    const id = resolveCompanyId(companyId);
    const { data } = await api.post(`/fiscal/seed-demo/${id}`);
    return data;
  },
};

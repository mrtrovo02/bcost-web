'use strict';

import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';
import { api } from '@/services/api';
import {
  FiscalDashboardStats,
  MonthlyPerformance,
  Invoice,
  BatchUploadResponse,
  XmlDocumentType,
  PayrollDiagnostic,
  CbsIbsSimulationResult,
  TaxCalculationResult,
  TaxReformResolvedParameters,
  TaxReformResolvedSimulationInput,
  TaxReformSimulationInput,
  TaxReformXmlBuildResult,
} from '../types/fiscal';

const resolveCompanyId = async (id?: string): Promise<string> => {
  const activeId = id || (await resolveEnterpriseCompanyIdWithFallback());

  if (!activeId || activeId === 'ID_DA_EMPRESA') {
    console.error('⚠️ [bCost]: Requisição bloqueada - companyId ausente ou inválido.');
    throw new Error('Empresa não selecionada.');
  }

  return activeId;
};

type BackendInvoice = Record<string, unknown>;

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return Number((value as { toNumber: () => number }).toNumber());
  }
  return 0;
}

function toStringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function normalizeInvoiceStatus(value: unknown): Invoice['status'] {
  const status = toStringValue(value).toUpperCase();
  if (status === 'PENDING') return 'PENDING';
  if (['NORMAL', 'PAID', 'PARTIAL', 'VALID'].includes(status)) return 'VALID';
  return 'INVALID';
}

function normalizeInvoiceType(value: unknown): XmlDocumentType {
  const type = toStringValue(value).toUpperCase();
  if (type === 'SERVICE' || type === 'NFSE') return XmlDocumentType.NFSE;
  if (type === 'CTE') return XmlDocumentType.CTE;
  return XmlDocumentType.NFE;
}

function normalizeTaxReformPayload(value: unknown): Invoice['taxReformPayload'] {
  if (!value || typeof value !== 'object') return undefined;
  const payload = value as Record<string, unknown>;
  if (payload.group !== 'UB') return undefined;

  return {
    group: 'UB',
    cbsValue: toNumber(payload.cbsValue),
    ibsValue: toNumber(payload.ibsValue),
    selectiveTaxValue: toNumber(payload.selectiveTaxValue),
    raw: payload.raw,
  };
}

function normalizeInvoice(row: BackendInvoice): Invoice {
  const customer = row.customer as Record<string, unknown> | undefined;
  const amount = row.value ?? row.amount ?? row.totalValue;
  const issuedAt = row.date ?? row.issuedAt ?? row.issueDate;

  return {
    id: toStringValue(row.id),
    accessKey: toStringValue(row.accessKey),
    number: toStringValue(row.number, 'S/N'),
    issuer: toStringValue(row.issuer ?? row.companyName, 'Emissor Não Identificado'),
    recipient: toStringValue(
      row.recipient ?? customer?.name ?? row.customerName,
      'Cliente não identificado',
    ),
    value: toNumber(amount),
    date: toStringValue(issuedAt),
    type: normalizeInvoiceType(row.type),
    status: normalizeInvoiceStatus(row.status),
    finNFe: toStringValue(row.finNFe) || undefined,
    issuePurpose: toStringValue(row.issuePurpose) as Invoice['issuePurpose'],
    cstCode: toStringValue(row.cstCode) || undefined,
    cClassTribCode: toStringValue(row.cClassTribCode) || undefined,
    destinationStateIbge: toStringValue(row.destinationStateIbge) || undefined,
    destinationMunicipalityIbge: toStringValue(row.destinationMunicipalityIbge) || undefined,
    hasLegacyTaxes: typeof row.hasLegacyTaxes === 'boolean' ? row.hasLegacyTaxes : undefined,
    taxReformPayload: normalizeTaxReformPayload(row.taxReformPayload),
  };
}

export const fiscalApi = {
  getDashboard: async (
    companyId?: string,
    month?: number,
    year?: number,
  ): Promise<FiscalDashboardStats> => {
    const id = await resolveCompanyId(companyId);
    const { data } = await api.get(`/fiscal/status/${id}`, {
      params: { month, year },
    });
    return data;
  },

  getPerformance: async (companyId?: string, year?: number): Promise<MonthlyPerformance[]> => {
    const id = await resolveCompanyId(companyId);
    const { data } = await api.get(`/fiscal/analytics/pnl/${id}`, {
      params: { year },
    });
    return data;
  },

  getPayrollDiagnostics: async (companyId?: string): Promise<PayrollDiagnostic> => {
    const id = await resolveCompanyId(companyId);
    const { data } = await api.get(`/fiscal/diagnostics/${id}`);
    return data;
  },

  getInvoices: async (companyId?: string): Promise<Invoice[]> => {
    const id = await resolveCompanyId(companyId);
    const { data } = await api.get(`/fiscal/invoices/${id}`);
    return Array.isArray(data) ? data.map((row) => normalizeInvoice(row)) : [];
  },

  simulateCbsIbs: async (
    projectedRevenue: number,
    companyId?: string,
  ): Promise<CbsIbsSimulationResult> => {
    const id = await resolveCompanyId(companyId);
    const { data } = await api.post('/tax/simulate-cbs-ibs', {
      companyId: id,
      projectedRevenue,
    });
    return data;
  },

  simulateTaxReform2026: async (input: TaxReformSimulationInput): Promise<TaxCalculationResult> => {
    const { data } = await api.post('/tax/simulate-reform-2026', input);
    return data;
  },

  simulateTaxReform2026Resolved: async (
    input: TaxReformResolvedSimulationInput,
    companyId?: string,
  ): Promise<{
    parameters: TaxReformResolvedParameters;
    calculation: TaxCalculationResult;
  }> => {
    const { data } = await api.post('/tax/simulate-reform-2026/resolved', {
      ...input,
      companyId: input.companyId ?? (await resolveCompanyId(companyId)),
    });
    return data;
  },

  getTaxReformParameters: async (
    params: {
      operationDate?: string;
      destinationStateIbge?: string;
      destinationMunicipalityIbge?: string;
      cstCode?: string;
      cClassTribCode?: string;
    } = {},
    companyId?: string,
  ): Promise<TaxReformResolvedParameters> => {
    const { data } = await api.get('/tax/reform-parameters', {
      params: { ...params, companyId: await resolveCompanyId(companyId) },
    });
    return data;
  },

  buildGrupoUB: async (input: TaxReformSimulationInput): Promise<TaxReformXmlBuildResult> => {
    const { data } = await api.post('/tax/build-grupo-ub', input);
    return data;
  },

  uploadXmlBatch: async (
    files: File[],
    type: XmlDocumentType = XmlDocumentType.NFE,
    companyId?: string,
  ): Promise<BatchUploadResponse> => {
    const id = await resolveCompanyId(companyId);
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
    const id = await resolveCompanyId(companyId);
    const { data } = await api.get(`/fiscal/export/${id}`, {
      params: { format },
      responseType: 'blob',
    });
    return data;
  },

  seedDemo: async (companyId?: string): Promise<{ message: string }> => {
    const id = await resolveCompanyId(companyId);
    const { data } = await api.post(`/fiscal/seed-demo/${id}`);
    return data;
  },
};

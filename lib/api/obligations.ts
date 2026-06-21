'use strict';

import { api } from '@/services/api';

export type TaxObligationStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIAL';

export type FiscalObligationType =
  | 'DAS'
  | 'GPS'
  | 'DARF'
  | 'SPED_FISCAL'
  | 'SPED_CONTRIBUICOES'
  | 'ECD'
  | 'ECF'
  | 'DCTF'
  | 'RAIS'
  | 'CAGED'
  | 'DIRF'
  | 'DEFIS'
  | 'PGDAS';

export type FiscalObligationStatus =
  | 'PENDING'
  | 'GENERATED'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'OVERDUE';

export type TaxObligationRecord = {
  id: string;
  companyId: string;
  name: string;
  dueDate: string;
  amount: number;
  status: TaxObligationStatus;
  fileUrl?: string | null;
  createdAt?: string | null;
  version?: number;
  operationalStatus?: string;
  daysToDue?: number | null;
  overdue?: boolean;
  paid?: boolean;
  cancelled?: boolean;
  [key: string]: unknown;
};

export type FiscalObligationRecord = {
  id: string;
  companyId: string;
  type: FiscalObligationType;
  referenceMonth: number;
  referenceYear: number;
  dueDate: string;
  status: FiscalObligationStatus;
  fileUrl?: string | null;
  fileHash?: string | null;
  submittedAt?: string | null;
  receiptCode?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  operationalStatus?: string;
  daysToDue?: number | null;
  overdue?: boolean;
  submitted?: boolean;
  accepted?: boolean;
  rejected?: boolean;
  [key: string]: unknown;
};

export type TaxSummary = {
  count: number;
  pending: number;
  paid: number;
  overdue: number;
  cancelled: number;
  partial: number;
  totalAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  nextDue?: {
    id: string;
    name: string;
    dueDate: string;
    amount: number;
    daysToDue: number | null;
  } | null;
  status: Record<string, number>;
};

export type FiscalSummary = {
  count: number;
  pending: number;
  generated: number;
  submitted: number;
  accepted: number;
  rejected: number;
  overdue: number;
  nextDue?: {
    id: string;
    type: string;
    referenceMonth: number;
    referenceYear: number;
    dueDate: string;
    daysToDue: number | null;
  } | null;
  status: Record<string, number>;
  type: Record<string, number>;
};

export type TaxListResponse = {
  status: string;
  module: 'tax-obligations';
  model: 'TaxObligation';
  companyId: string;
  items: TaxObligationRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: TaxSummary;
  generatedAt: string;
};

export type FiscalListResponse = {
  status: string;
  module: 'fiscal-obligations';
  model: 'FiscalObligation';
  companyId: string;
  items: FiscalObligationRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: FiscalSummary;
  generatedAt: string;
};

export type ObligationActionResponse<T> = {
  status: string;
  message: string;
  companyId: string;
  item?: T;
  deletedId?: string;
  audit?: {
    recorded: boolean;
    error?: string;
  };
  generatedAt: string;
};

export type CreateTaxPayload = {
  name: string;
  dueDate: string;
  amount: number;
  status?: TaxObligationStatus;
  fileUrl?: string;
};

export type UpdateTaxPayload = Partial<CreateTaxPayload>;

export type CreateFiscalPayload = {
  type: FiscalObligationType;
  referenceMonth: number;
  referenceYear: number;
  dueDate: string;
  status?: FiscalObligationStatus;
  fileUrl?: string;
  fileHash?: string;
  submittedAt?: string;
  receiptCode?: string;
};

export type UpdateFiscalPayload = Partial<CreateFiscalPayload>;

export type SubmitFiscalPayload = {
  fileUrl?: string;
  fileHash?: string;
  receiptCode?: string;
  submittedAt?: string;
};

export type ObligationsQuery = {
  limit?: number;
  offset?: number;
  status?: string;
  type?: string;
  search?: string;
  from?: string;
  to?: string;
  month?: number;
  year?: number;
};

export type AuditLogRecord = {
  id: string;
  companyId: string;
  userId?: string | null;
  module?: string | null;
  action?: string | null;
  entity?: string | null;
  entityId?: string | null;
  payload?: unknown;
  createdAt?: string | null;
  [key: string]: unknown;
};

export type AuditLogListResponse = {
  items: AuditLogRecord[];
  total: number;
  limit: number;
  offset: number;
  generatedAt: string;
};

function buildQuery(params?: Record<string, unknown>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '' || value === 'ALL') {
      continue;
    }

    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

export const obligationsApi = {
  listTax: async (companyId: string, params: ObligationsQuery = {}): Promise<TaxListResponse> => {
    const response = await api.get<TaxListResponse>(
      `/obligations/enterprise/tax/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  listFiscal: async (
    companyId: string,
    params: ObligationsQuery = {},
  ): Promise<FiscalListResponse> => {
    const response = await api.get<FiscalListResponse>(
      `/obligations/enterprise/fiscal/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createTax: async (
    companyId: string,
    payload: CreateTaxPayload,
  ): Promise<ObligationActionResponse<TaxObligationRecord>> => {
    const response = await api.post<ObligationActionResponse<TaxObligationRecord>>(
      `/obligations/enterprise/tax/${companyId}`,
      payload,
    );

    return response.data;
  },

  createFiscal: async (
    companyId: string,
    payload: CreateFiscalPayload,
  ): Promise<ObligationActionResponse<FiscalObligationRecord>> => {
    const response = await api.post<ObligationActionResponse<FiscalObligationRecord>>(
      `/obligations/enterprise/fiscal/${companyId}`,
      payload,
    );

    return response.data;
  },

  updateTax: async (
    companyId: string,
    obligationId: string,
    payload: UpdateTaxPayload,
  ): Promise<ObligationActionResponse<TaxObligationRecord>> => {
    const response = await api.patch<ObligationActionResponse<TaxObligationRecord>>(
      `/obligations/enterprise/tax/${companyId}/${obligationId}`,
      payload,
    );

    return response.data;
  },

  updateFiscal: async (
    companyId: string,
    obligationId: string,
    payload: UpdateFiscalPayload,
  ): Promise<ObligationActionResponse<FiscalObligationRecord>> => {
    const response = await api.patch<ObligationActionResponse<FiscalObligationRecord>>(
      `/obligations/enterprise/fiscal/${companyId}/${obligationId}`,
      payload,
    );

    return response.data;
  },

  payTax: async (
    companyId: string,
    obligationId: string,
  ): Promise<ObligationActionResponse<TaxObligationRecord>> => {
    const response = await api.post<ObligationActionResponse<TaxObligationRecord>>(
      `/obligations/enterprise/tax/${companyId}/${obligationId}/pay`,
    );

    return response.data;
  },

  cancelTax: async (
    companyId: string,
    obligationId: string,
  ): Promise<ObligationActionResponse<TaxObligationRecord>> => {
    const response = await api.post<ObligationActionResponse<TaxObligationRecord>>(
      `/obligations/enterprise/tax/${companyId}/${obligationId}/cancel`,
    );

    return response.data;
  },

  submitFiscal: async (
    companyId: string,
    obligationId: string,
    payload: SubmitFiscalPayload = {},
  ): Promise<ObligationActionResponse<FiscalObligationRecord>> => {
    const response = await api.post<ObligationActionResponse<FiscalObligationRecord>>(
      `/obligations/enterprise/fiscal/${companyId}/${obligationId}/submit`,
      payload,
    );

    return response.data;
  },

  acceptFiscal: async (
    companyId: string,
    obligationId: string,
  ): Promise<ObligationActionResponse<FiscalObligationRecord>> => {
    const response = await api.post<ObligationActionResponse<FiscalObligationRecord>>(
      `/obligations/enterprise/fiscal/${companyId}/${obligationId}/accept`,
    );

    return response.data;
  },

  rejectFiscal: async (
    companyId: string,
    obligationId: string,
  ): Promise<ObligationActionResponse<FiscalObligationRecord>> => {
    const response = await api.post<ObligationActionResponse<FiscalObligationRecord>>(
      `/obligations/enterprise/fiscal/${companyId}/${obligationId}/reject`,
    );

    return response.data;
  },

  audit: async (
    companyId: string,
    module: 'tax-obligations' | 'fiscal-obligations',
    params: Record<string, unknown> = {},
  ): Promise<AuditLogListResponse> => {
    const response = await api.get<AuditLogListResponse>(
      `/audit/${companyId}${buildQuery({
        limit: 20,
        module,
        ...params,
      })}`,
    );

    return response.data;
  },
};

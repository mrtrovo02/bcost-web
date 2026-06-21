'use strict';

import { api } from '@/services/api';

export type FinanceOperationStatus =
  | 'PAID'
  | 'RECEIVED'
  | 'OPEN'
  | 'PENDING'
  | 'OVERDUE'
  | 'DUE_SOON'
  | 'CANCELLED'
  | 'UNKNOWN';

export type FinanceRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FinanceItemType = 'RECEIVABLE' | 'PAYABLE' | 'CASH_IN' | 'CASH_OUT';

export type FinanceItem = {
  id: string;
  type: FinanceItemType;
  source: string;
  title: string;
  description: string | null;
  amount: number;
  status: FinanceOperationStatus;
  dueDate: string | null;
  occurredAt: string | null;
  customerName?: string | null;
  document?: string | null;
  daysOverdue: number;
  daysToDue: number | null;
  riskLevel: FinanceRiskLevel;
};

export type FinanceBucket = {
  count: number;
  amount: number;
};

export type FinanceAging = {
  current: FinanceBucket;
  dueSoon7: FinanceBucket;
  overdue1To7: FinanceBucket;
  overdue8To30: FinanceBucket;
  overdue31To60: FinanceBucket;
  overdue61Plus: FinanceBucket;
};

export type FinanceListSummary = {
  count: number;
  totalAmount: number;
  openAmount: number;
  overdueAmount: number;
  dueSoonAmount: number;
  settledAmount: number;
  overdueCount: number;
  dueSoonCount: number;
  openCount: number;
  settledCount: number;
};

export type FinanceCashflow = {
  cashIn: number;
  cashOut: number;
  netCash: number;
  receivableOpen: number;
  payableOpen: number;
  projectedNet: number;
  riskStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
};

export type FinanceOperationsSummaryResponse = {
  status: string;
  module: string;
  companyId: string;
  company: Record<string, unknown>;
  requestedBy?: {
    userId?: string | null;
    email?: string | null;
    role?: string | null;
  };
  executiveSummary: {
    financeScore: number;
    financeStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
    receivables: FinanceListSummary;
    payables: FinanceListSummary;
    cashflow: FinanceCashflow;
    totalOpenAmount: number;
    totalOverdueAmount: number;
    totalOverdueCount: number;
  };
  aging: {
    receivables: FinanceAging;
    payables: FinanceAging;
  };
  lists: {
    receivables: FinanceItem[];
    payables: FinanceItem[];
    cashItems: FinanceItem[];
  };
  supportingData: {
    sourceCounts: Record<string, number>;
    bankAccounts?: unknown[];
    financialSnapshots?: unknown[];
    cashFlowProjections?: unknown[];
  };
  generatedAt: string;
};

export type FinanceOperationsListResponse = {
  status: string;
  module: string;
  companyId: string;
  summary: FinanceListSummary;
  aging: FinanceAging;
  items: FinanceItem[];
  generatedAt: string;
};

export type FinanceOperationsCashflowResponse = {
  status: string;
  module: string;
  companyId: string;
  cashflow: FinanceCashflow;
  cashItems: FinanceItem[];
  cashFlowProjections: unknown[];
  generatedAt: string;
};

export type FinanceOperationsTimelineResponse = {
  status: string;
  module: string;
  companyId: string;
  items: FinanceItem[];
  financialEvents: unknown[];
  generatedAt: string;
};

export type FinanceOperationsQuery = {
  limit?: number;
  from?: string;
  to?: string;
  status?: string;
  source?: string;
  includeRaw?: boolean;
  includeTimeline?: boolean;
};

function buildQuery(query: FinanceOperationsQuery = {}) {
  const search = new URLSearchParams();

  if (query.limit !== undefined) search.set('limit', String(query.limit));
  if (query.from) search.set('from', query.from);
  if (query.to) search.set('to', query.to);
  if (query.status) search.set('status', query.status);
  if (query.source) search.set('source', query.source);
  if (query.includeRaw !== undefined) {
    search.set('includeRaw', String(query.includeRaw));
  }
  if (query.includeTimeline !== undefined) {
    search.set('includeTimeline', String(query.includeTimeline));
  }

  const value = search.toString();

  return value ? `?${value}` : '';
}

export const financeOperationsEnterpriseApi = {
  summary: async (
    companyId: string,
    query: FinanceOperationsQuery = { limit: 50, includeRaw: false },
  ): Promise<FinanceOperationsSummaryResponse> => {
    const response = await api.get<FinanceOperationsSummaryResponse>(
      `/finance/operations/${companyId}${buildQuery(query)}`,
    );

    return response.data;
  },

  receivables: async (
    companyId: string,
    query: FinanceOperationsQuery = { limit: 50 },
  ): Promise<FinanceOperationsListResponse> => {
    const response = await api.get<FinanceOperationsListResponse>(
      `/finance/operations/${companyId}/receivables${buildQuery(query)}`,
    );

    return response.data;
  },

  payables: async (
    companyId: string,
    query: FinanceOperationsQuery = { limit: 50 },
  ): Promise<FinanceOperationsListResponse> => {
    const response = await api.get<FinanceOperationsListResponse>(
      `/finance/operations/${companyId}/payables${buildQuery(query)}`,
    );

    return response.data;
  },

  cashflow: async (
    companyId: string,
    query: FinanceOperationsQuery = { limit: 50 },
  ): Promise<FinanceOperationsCashflowResponse> => {
    const response = await api.get<FinanceOperationsCashflowResponse>(
      `/finance/operations/${companyId}/cashflow${buildQuery(query)}`,
    );

    return response.data;
  },

  timeline: async (
    companyId: string,
    query: FinanceOperationsQuery = { limit: 50 },
  ): Promise<FinanceOperationsTimelineResponse> => {
    const response = await api.get<FinanceOperationsTimelineResponse>(
      `/finance/operations/${companyId}/timeline${buildQuery(query)}`,
    );

    return response.data;
  },
};

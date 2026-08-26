'use strict';

import { api } from '@/services/api';
import { isDemoEntityId } from '@/lib/config/demo-policy';

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

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function emptyAging(): FinanceAging {
  return {
    current: { count: 0, amount: 0 },
    dueSoon7: { count: 0, amount: 0 },
    overdue1To7: { count: 0, amount: 0 },
    overdue8To30: { count: 0, amount: 0 },
    overdue31To60: { count: 0, amount: 0 },
    overdue61Plus: { count: 0, amount: 0 },
  };
}

function summarizeItems(items: FinanceItem[]): FinanceListSummary {
  return items.reduce<FinanceListSummary>(
    (summary, item) => {
      const amount = Number(item.amount || 0);
      const settled = item.status === 'PAID' || item.status === 'RECEIVED';
      const overdue = item.status === 'OVERDUE';
      const dueSoon = item.status === 'DUE_SOON';

      summary.count += 1;
      summary.totalAmount += amount;
      summary.openAmount += settled ? 0 : amount;
      summary.overdueAmount += overdue ? amount : 0;
      summary.dueSoonAmount += dueSoon ? amount : 0;
      summary.settledAmount += settled ? amount : 0;
      summary.overdueCount += overdue ? 1 : 0;
      summary.dueSoonCount += dueSoon ? 1 : 0;
      summary.openCount += settled ? 0 : 1;
      summary.settledCount += settled ? 1 : 0;

      return summary;
    },
    {
      count: 0,
      totalAmount: 0,
      openAmount: 0,
      overdueAmount: 0,
      dueSoonAmount: 0,
      settledAmount: 0,
      overdueCount: 0,
      dueSoonCount: 0,
      openCount: 0,
      settledCount: 0,
    },
  );
}

function agingFromItems(items: FinanceItem[]): FinanceAging {
  const aging = emptyAging();

  for (const item of items) {
    const amount = Number(item.amount || 0);
    const bucket =
      item.daysOverdue >= 61
        ? aging.overdue61Plus
        : item.daysOverdue >= 31
          ? aging.overdue31To60
          : item.daysOverdue >= 8
            ? aging.overdue8To30
            : item.daysOverdue >= 1
              ? aging.overdue1To7
              : (item.daysToDue ?? 99) <= 7
                ? aging.dueSoon7
                : aging.current;

    bucket.count += 1;
    bucket.amount += amount;
  }

  return aging;
}

function demoFinanceItem(
  id: string,
  type: FinanceItemType,
  title: string,
  amount: number,
  status: FinanceOperationStatus,
  days: number,
  riskLevel: FinanceRiskLevel,
): FinanceItem {
  const isOverdue = days < 0;

  return {
    id,
    type,
    source:
      type === 'PAYABLE' ? 'Obrigação fiscal' : type === 'RECEIVABLE' ? 'Nota fiscal' : 'Banco',
    title,
    description: 'Registro operacional demonstrativo enquanto a API real não retorna dados.',
    amount,
    status,
    dueDate: daysFromNow(days),
    occurredAt: type === 'CASH_IN' || type === 'CASH_OUT' ? daysFromNow(days) : null,
    customerName: type === 'RECEIVABLE' ? 'Cliente demonstração' : null,
    document: `DEMO-${id}`,
    daysOverdue: isOverdue ? Math.abs(days) : 0,
    daysToDue: isOverdue ? null : days,
    riskLevel,
  };
}

function createDemoFinanceSummary(companyId: string): FinanceOperationsSummaryResponse {
  const receivables = [
    demoFinanceItem('rec-001', 'RECEIVABLE', 'Mensalidade SaaS', 24800, 'OPEN', 12, 'LOW'),
    demoFinanceItem(
      'rec-002',
      'RECEIVABLE',
      'Serviços contábeis recorrentes',
      13750,
      'DUE_SOON',
      5,
      'MEDIUM',
    ),
    demoFinanceItem('rec-003', 'RECEIVABLE', 'Projeto de implantação', 9100, 'OVERDUE', -9, 'HIGH'),
  ];
  const payables = [
    demoFinanceItem('pay-001', 'PAYABLE', 'DAS competência atual', 4280, 'OPEN', 8, 'MEDIUM'),
    demoFinanceItem('pay-002', 'PAYABLE', 'Encargos de folha', 6800, 'DUE_SOON', 4, 'HIGH'),
    demoFinanceItem('pay-003', 'PAYABLE', 'Fornecedor operacional', 3100, 'PAID', -2, 'LOW'),
  ];
  const cashItems = [
    demoFinanceItem('cash-001', 'CASH_IN', 'Entrada conciliada', 19000, 'RECEIVED', -1, 'LOW'),
    demoFinanceItem('cash-002', 'CASH_OUT', 'Saída operacional', 7200, 'PAID', -1, 'LOW'),
  ];

  const receivablesSummary = summarizeItems(receivables);
  const payablesSummary = summarizeItems(payables);
  const cashIn = cashItems
    .filter((item) => item.type === 'CASH_IN')
    .reduce((sum, item) => sum + item.amount, 0);
  const cashOut = cashItems
    .filter((item) => item.type === 'CASH_OUT')
    .reduce((sum, item) => sum + item.amount, 0);
  const netCash = cashIn - cashOut;
  const projectedNet = netCash + receivablesSummary.openAmount - payablesSummary.openAmount;

  return {
    status: 'OK_WITH_FALLBACK',
    module: 'finance-operations',
    companyId,
    company: { id: companyId, name: 'Empresa demonstração' },
    executiveSummary: {
      financeScore: projectedNet < 0 ? 62 : 84,
      financeStatus: projectedNet < 0 ? 'ATTENTION' : 'HEALTHY',
      receivables: receivablesSummary,
      payables: payablesSummary,
      cashflow: {
        cashIn,
        cashOut,
        netCash,
        receivableOpen: receivablesSummary.openAmount,
        payableOpen: payablesSummary.openAmount,
        projectedNet,
        riskStatus: projectedNet < 0 ? 'ATTENTION' : 'HEALTHY',
      },
      totalOpenAmount: receivablesSummary.openAmount + payablesSummary.openAmount,
      totalOverdueAmount: receivablesSummary.overdueAmount + payablesSummary.overdueAmount,
      totalOverdueCount: receivablesSummary.overdueCount + payablesSummary.overdueCount,
    },
    aging: {
      receivables: agingFromItems(receivables),
      payables: agingFromItems(payables),
    },
    lists: {
      receivables,
      payables,
      cashItems,
    },
    supportingData: {
      sourceCounts: {
        invoices: receivables.length,
        taxObligations: payables.length,
        bankTransactions: cashItems.length,
      },
      bankAccounts: [],
      financialSnapshots: [],
      cashFlowProjections: [],
    },
    generatedAt: new Date().toISOString(),
  };
}

function fallbackFinanceSummary(companyId: string): FinanceOperationsSummaryResponse {
  return createDemoFinanceSummary(companyId);
}

function shouldUseFinanceFallback(companyId: string): boolean {
  return isDemoEntityId(companyId);
}

export const financeOperationsEnterpriseApi = {
  summary: async (
    companyId: string,
    query: FinanceOperationsQuery = { limit: 50, includeRaw: false },
  ): Promise<FinanceOperationsSummaryResponse> => {
    if (shouldUseFinanceFallback(companyId)) {
      return fallbackFinanceSummary(companyId);
    }

    try {
      const response = await api.get<FinanceOperationsSummaryResponse>(
        `/finance/operations/${companyId}${buildQuery(query)}`,
      );

      return response.data;
    } catch (error) {
      if (isDemoEntityId(companyId)) {
        return fallbackFinanceSummary(companyId);
      }

      throw error;
    }
  },

  receivables: async (
    companyId: string,
    query: FinanceOperationsQuery = { limit: 50 },
  ): Promise<FinanceOperationsListResponse> => {
    if (shouldUseFinanceFallback(companyId)) {
      const summary = fallbackFinanceSummary(companyId);
      return {
        status: summary.status,
        module: summary.module,
        companyId,
        summary: summary.executiveSummary.receivables,
        aging: summary.aging.receivables,
        items: summary.lists.receivables,
        generatedAt: summary.generatedAt,
      };
    }

    try {
      const response = await api.get<FinanceOperationsListResponse>(
        `/finance/operations/${companyId}/receivables${buildQuery(query)}`,
      );

      return response.data;
    } catch (error) {
      if (!isDemoEntityId(companyId)) {
        throw error;
      }

      const summary = fallbackFinanceSummary(companyId);
      return {
        status: summary.status,
        module: summary.module,
        companyId,
        summary: summary.executiveSummary.receivables,
        aging: summary.aging.receivables,
        items: summary.lists.receivables,
        generatedAt: summary.generatedAt,
      };
    }
  },

  payables: async (
    companyId: string,
    query: FinanceOperationsQuery = { limit: 50 },
  ): Promise<FinanceOperationsListResponse> => {
    if (shouldUseFinanceFallback(companyId)) {
      const summary = fallbackFinanceSummary(companyId);
      return {
        status: summary.status,
        module: summary.module,
        companyId,
        summary: summary.executiveSummary.payables,
        aging: summary.aging.payables,
        items: summary.lists.payables,
        generatedAt: summary.generatedAt,
      };
    }

    try {
      const response = await api.get<FinanceOperationsListResponse>(
        `/finance/operations/${companyId}/payables${buildQuery(query)}`,
      );

      return response.data;
    } catch (error) {
      if (!isDemoEntityId(companyId)) {
        throw error;
      }

      const summary = fallbackFinanceSummary(companyId);
      return {
        status: summary.status,
        module: summary.module,
        companyId,
        summary: summary.executiveSummary.payables,
        aging: summary.aging.payables,
        items: summary.lists.payables,
        generatedAt: summary.generatedAt,
      };
    }
  },

  cashflow: async (
    companyId: string,
    query: FinanceOperationsQuery = { limit: 50 },
  ): Promise<FinanceOperationsCashflowResponse> => {
    if (shouldUseFinanceFallback(companyId)) {
      const summary = fallbackFinanceSummary(companyId);
      return {
        status: summary.status,
        module: summary.module,
        companyId,
        cashflow: summary.executiveSummary.cashflow,
        cashItems: summary.lists.cashItems,
        cashFlowProjections: summary.supportingData.cashFlowProjections || [],
        generatedAt: summary.generatedAt,
      };
    }

    try {
      const response = await api.get<FinanceOperationsCashflowResponse>(
        `/finance/operations/${companyId}/cashflow${buildQuery(query)}`,
      );

      return response.data;
    } catch (error) {
      if (!isDemoEntityId(companyId)) {
        throw error;
      }

      const summary = fallbackFinanceSummary(companyId);
      return {
        status: summary.status,
        module: summary.module,
        companyId,
        cashflow: summary.executiveSummary.cashflow,
        cashItems: summary.lists.cashItems,
        cashFlowProjections: summary.supportingData.cashFlowProjections || [],
        generatedAt: summary.generatedAt,
      };
    }
  },

  timeline: async (
    companyId: string,
    query: FinanceOperationsQuery = { limit: 50 },
  ): Promise<FinanceOperationsTimelineResponse> => {
    if (shouldUseFinanceFallback(companyId)) {
      const summary = fallbackFinanceSummary(companyId);
      return {
        status: summary.status,
        module: summary.module,
        companyId,
        items: [
          ...summary.lists.receivables,
          ...summary.lists.payables,
          ...summary.lists.cashItems,
        ],
        financialEvents: [],
        generatedAt: summary.generatedAt,
      };
    }

    try {
      const response = await api.get<FinanceOperationsTimelineResponse>(
        `/finance/operations/${companyId}/timeline${buildQuery(query)}`,
      );

      return response.data;
    } catch (error) {
      if (!isDemoEntityId(companyId)) {
        throw error;
      }

      const summary = fallbackFinanceSummary(companyId);
      return {
        status: summary.status,
        module: summary.module,
        companyId,
        items: [
          ...summary.lists.receivables,
          ...summary.lists.payables,
          ...summary.lists.cashItems,
        ],
        financialEvents: [],
        generatedAt: summary.generatedAt,
      };
    }
  },
};

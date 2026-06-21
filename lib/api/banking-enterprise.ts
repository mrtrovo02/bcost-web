'use strict';

import { api } from '@/services/api';

export type TransactionType = 'CREDIT' | 'DEBIT';

export type ReconciliationTargetType = 'INVOICE' | 'TAX_OBLIGATION';

export type BankAccountEnterpriseRecord = {
  id: string;
  companyId: string;
  bankName: string;
  agency: string;
  account: string;
  balanceCache: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  status?: 'ACTIVE' | 'DELETED' | string;
  [key: string]: unknown;
};

export type BankTransactionEnterpriseRecord = {
  id: string;
  companyId: string;
  bankAccountId: string;
  type: TransactionType;
  amount: number;
  signedAmount?: number;
  description: string;
  occurredAt: string;
  reconciled: boolean;
  invoiceId?: string | null;
  taxObligationId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  version?: number;
  reconciliationStatus?: string;
  bankAccount?: BankAccountEnterpriseRecord;
  invoice?: Record<string, unknown> | null;
  taxObligation?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type BankAccountSummary = {
  count: number;
  active: number;
  deleted: number;
  totalBalance: number;
  byBank: Record<string, number>;
};

export type BankTransactionSummary = {
  count: number;
  credits: number;
  debits: number;
  totalCredit: number;
  totalDebit: number;
  netAmount: number;
  reconciled: number;
  pending: number;
  reconciliationRate: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byBankAccountId: Record<string, number>;
};

export type BankAccountsListResponse = {
  status: string;
  module: 'bank-accounts';
  model: 'BankAccount';
  companyId: string;
  items: BankAccountEnterpriseRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: BankAccountSummary;
  generatedAt: string;
};

export type BankTransactionsListResponse = {
  status: string;
  module: 'bank-transactions';
  model: 'BankTransaction';
  companyId: string;
  items: BankTransactionEnterpriseRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: BankTransactionSummary;
  generatedAt: string;
};

export type BankingSummaryResponse = {
  status: string;
  module: 'banking-enterprise-summary';
  companyId: string;
  accounts: BankAccountSummary;
  transactions: BankTransactionSummary;
  generatedAt: string;
};

export type CreateBankAccountPayload = {
  bankName: string;
  agency: string;
  account: string;
  balanceCache?: number;
};

export type UpdateBankAccountPayload = Partial<CreateBankAccountPayload>;

export type CreateBankTransactionPayload = {
  bankAccountId: string;
  type: TransactionType;
  amount: number;
  description: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export type UpdateBankTransactionPayload = Partial<
  Omit<CreateBankTransactionPayload, 'bankAccountId'>
>;

export type BankingActionResponse<T> = {
  status: string;
  message: string;
  companyId: string;
  item?: T;
  target?: Record<string, unknown>;
  financialEvent?: {
    recorded: boolean;
    event?: Record<string, unknown>;
    error?: string;
  };
  audit?: {
    recorded: boolean;
    error?: string;
  };
  generatedAt: string;
};

export type ReconciliationCandidate = {
  targetType: ReconciliationTargetType;
  targetId: string;
  score: number;
  amountScore: number;
  dateScore: number;
  descriptionScore: number;
  reason: string[];
  target: Record<string, unknown>;
};

export type ReconciliationCandidatesResponse = {
  status: string;
  module: 'bank-reconciliation';
  companyId: string;
  transaction: BankTransactionEnterpriseRecord;
  candidates: ReconciliationCandidate[];
  total: number;
  generatedAt: string;
};

export type ManualReconciliationPayload = {
  bankTransactionId: string;
  targetType: ReconciliationTargetType;
  targetId: string;
  force?: boolean;
  note?: string;
};

export type AutoReconciliationPayload = {
  dateToleranceDays?: number;
  amountTolerance?: number;
  limit?: number;
};

export type AutoReconciliationResponse = {
  status: string;
  message: string;
  companyId: string;
  totals: {
    processed: number;
    matched: number;
    skipped: number;
    failed: number;
  };
  results: Array<Record<string, unknown>>;
  audit?: {
    recorded: boolean;
    error?: string;
  };
  generatedAt: string;
};

export type BankingQuery = {
  limit?: number;
  offset?: number;
  search?: string;
  bankAccountId?: string;
  type?: string;
  reconciled?: string;
  invoiceId?: string;
  taxObligationId?: string;
  from?: string;
  to?: string;
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

export const bankingEnterpriseApi = {
  summary: async (companyId: string): Promise<BankingSummaryResponse> => {
    const response = await api.get<BankingSummaryResponse>(
      `/banking/enterprise/summary/${companyId}`,
    );

    return response.data;
  },

  listAccounts: async (
    companyId: string,
    params: BankingQuery = {},
  ): Promise<BankAccountsListResponse> => {
    const response = await api.get<BankAccountsListResponse>(
      `/banking/enterprise/accounts/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createAccount: async (
    companyId: string,
    payload: CreateBankAccountPayload,
  ): Promise<BankingActionResponse<BankAccountEnterpriseRecord>> => {
    const response = await api.post<BankingActionResponse<BankAccountEnterpriseRecord>>(
      `/banking/enterprise/accounts/${companyId}`,
      payload,
    );

    return response.data;
  },

  updateAccount: async (
    companyId: string,
    bankAccountId: string,
    payload: UpdateBankAccountPayload,
  ): Promise<BankingActionResponse<BankAccountEnterpriseRecord>> => {
    const response = await api.patch<BankingActionResponse<BankAccountEnterpriseRecord>>(
      `/banking/enterprise/accounts/${companyId}/${bankAccountId}`,
      payload,
    );

    return response.data;
  },

  deactivateAccount: async (
    companyId: string,
    bankAccountId: string,
  ): Promise<BankingActionResponse<BankAccountEnterpriseRecord>> => {
    const response = await api.post<BankingActionResponse<BankAccountEnterpriseRecord>>(
      `/banking/enterprise/accounts/${companyId}/${bankAccountId}/deactivate`,
    );

    return response.data;
  },

  listTransactions: async (
    companyId: string,
    params: BankingQuery = {},
  ): Promise<BankTransactionsListResponse> => {
    const response = await api.get<BankTransactionsListResponse>(
      `/banking/enterprise/transactions/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createTransaction: async (
    companyId: string,
    payload: CreateBankTransactionPayload,
  ): Promise<BankingActionResponse<BankTransactionEnterpriseRecord>> => {
    const response = await api.post<BankingActionResponse<BankTransactionEnterpriseRecord>>(
      `/banking/enterprise/transactions/${companyId}`,
      payload,
    );

    return response.data;
  },

  updateTransaction: async (
    companyId: string,
    transactionId: string,
    payload: UpdateBankTransactionPayload,
  ): Promise<BankingActionResponse<BankTransactionEnterpriseRecord>> => {
    const response = await api.patch<BankingActionResponse<BankTransactionEnterpriseRecord>>(
      `/banking/enterprise/transactions/${companyId}/${transactionId}`,
      payload,
    );

    return response.data;
  },

  detailTransaction: async (
    companyId: string,
    transactionId: string,
  ): Promise<{
    status: string;
    item: BankTransactionEnterpriseRecord;
    generatedAt: string;
  }> => {
    const response = await api.get<{
      status: string;
      item: BankTransactionEnterpriseRecord;
      generatedAt: string;
    }>(`/banking/enterprise/transactions/${companyId}/${transactionId}`);

    return response.data;
  },

  candidates: async (
    companyId: string,
    transactionId: string,
    params: AutoReconciliationPayload = {},
  ): Promise<ReconciliationCandidatesResponse> => {
    const response = await api.get<ReconciliationCandidatesResponse>(
      `/banking/enterprise/reconciliation/${companyId}/candidates/${transactionId}${buildQuery(
        params,
      )}`,
    );

    return response.data;
  },

  manualReconcile: async (
    companyId: string,
    payload: ManualReconciliationPayload,
  ): Promise<BankingActionResponse<BankTransactionEnterpriseRecord>> => {
    const response = await api.post<BankingActionResponse<BankTransactionEnterpriseRecord>>(
      `/banking/enterprise/reconciliation/${companyId}/manual`,
      payload,
    );

    return response.data;
  },

  autoReconcile: async (
    companyId: string,
    payload: AutoReconciliationPayload,
  ): Promise<AutoReconciliationResponse> => {
    const response = await api.post<AutoReconciliationResponse>(
      `/banking/enterprise/reconciliation/${companyId}/auto`,
      payload,
    );

    return response.data;
  },

  undoReconciliation: async (
    companyId: string,
    transactionId: string,
  ): Promise<BankingActionResponse<BankTransactionEnterpriseRecord>> => {
    const response = await api.post<BankingActionResponse<BankTransactionEnterpriseRecord>>(
      `/banking/enterprise/reconciliation/${companyId}/undo/${transactionId}`,
    );

    return response.data;
  },

  audit: async (
    companyId: string,
    module: 'bank-accounts' | 'bank-transactions' | 'bank-reconciliation',
    params: Record<string, unknown> = {},
  ): Promise<AuditLogListResponse> => {
    const response = await api.get<AuditLogListResponse>(
      `/audit/${companyId}${buildQuery({
        limit: 30,
        module,
        ...params,
      })}`,
    );

    return response.data;
  },
};

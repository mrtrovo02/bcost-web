'use strict';

import { api } from '@/services/api';
import { isDemoEntityId } from '@/lib/config/demo-policy';

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

type DemoBankingStore = {
  accounts: BankAccountEnterpriseRecord[];
  transactions: BankTransactionEnterpriseRecord[];
  audits: AuditLogRecord[];
};

const DEMO_STORE_VERSION = 'v1';

function isDemoCompany(companyId: string): boolean {
  return isDemoEntityId(companyId);
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

function nowIso(): string {
  return new Date().toISOString();
}

function roundMoney(value: number): number {
  return Number(Number(value || 0).toFixed(2));
}

function signedAmount(type: TransactionType, amount: number): number {
  return type === 'CREDIT' ? roundMoney(amount) : roundMoney(-amount);
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function demoStoreKey(companyId: string): string {
  return `bcost:${DEMO_STORE_VERSION}:banking-enterprise:${companyId}`;
}

function makeDemoStore(companyId: string): DemoBankingStore {
  const accounts: BankAccountEnterpriseRecord[] = [
    {
      id: 'demo-bank-account-001',
      companyId,
      bankName: 'Banco bCost PJ',
      agency: '0001',
      account: '12345-6',
      balanceCache: 784769.82,
      status: 'ACTIVE',
      createdAt: addDays(-180),
    },
    {
      id: 'demo-bank-account-002',
      companyId,
      bankName: 'Conta Recebimentos',
      agency: '0002',
      account: '98765-4',
      balanceCache: 142300.15,
      status: 'ACTIVE',
      createdAt: addDays(-95),
    },
  ];

  const transactions: BankTransactionEnterpriseRecord[] = [
    {
      id: 'demo-bank-transaction-001',
      companyId,
      bankAccountId: accounts[0].id,
      type: 'CREDIT',
      amount: 83000,
      signedAmount: 83000,
      description: 'Recebimento NFSe 2026-000148',
      occurredAt: addDays(-2),
      reconciled: false,
      reconciliationStatus: 'PENDING',
      metadata: { source: 'demo-open-finance' },
      bankAccount: accounts[0],
      createdAt: nowIso(),
      version: 1,
    },
    {
      id: 'demo-bank-transaction-002',
      companyId,
      bankAccountId: accounts[0].id,
      type: 'DEBIT',
      amount: 2470.35,
      signedAmount: -2470.35,
      description: 'Pagamento DAS Simples Nacional',
      occurredAt: addDays(-1),
      reconciled: true,
      taxObligationId: 'demo-tax-das-current',
      reconciliationStatus: 'RECONCILED',
      metadata: { source: 'demo-open-finance' },
      bankAccount: accounts[0],
      createdAt: nowIso(),
      version: 1,
    },
    {
      id: 'demo-bank-transaction-003',
      companyId,
      bankAccountId: accounts[1].id,
      type: 'DEBIT',
      amount: 5400,
      signedAmount: -5400,
      description: 'Folha analista fiscal',
      occurredAt: addDays(-5),
      reconciled: false,
      reconciliationStatus: 'PENDING',
      metadata: { source: 'demo-open-finance' },
      bankAccount: accounts[1],
      createdAt: nowIso(),
      version: 1,
    },
  ];

  return {
    accounts,
    transactions,
    audits: [
      {
        id: 'demo-audit-banking-ready',
        companyId,
        module: 'bank-reconciliation',
        action: 'DEMO_BANKING_READY',
        entity: 'BankTransaction',
        entityId: transactions[0].id,
        payload: { source: 'demo-store', mode: 'DEMO_OPERATIONAL' },
        createdAt: nowIso(),
      },
    ],
  };
}

function readStore(companyId: string): DemoBankingStore {
  if (!isBrowserRuntime()) return makeDemoStore(companyId);

  try {
    const raw = window.localStorage.getItem(demoStoreKey(companyId));
    if (raw) return JSON.parse(raw) as DemoBankingStore;
  } catch {
    window.localStorage.removeItem(demoStoreKey(companyId));
  }

  const seeded = makeDemoStore(companyId);
  writeStore(companyId, seeded);
  return seeded;
}

function writeStore(companyId: string, store: DemoBankingStore): void {
  if (!isBrowserRuntime()) return;
  window.localStorage.setItem(demoStoreKey(companyId), JSON.stringify(store));
}

function appendAudit(
  store: DemoBankingStore,
  companyId: string,
  module: 'bank-accounts' | 'bank-transactions' | 'bank-reconciliation',
  action: string,
  entity: string,
  entityId?: string,
  payload: Record<string, unknown> = {},
): void {
  store.audits.unshift({
    id: `demo-audit-banking-${Date.now()}`,
    companyId,
    module,
    action,
    entity,
    entityId,
    payload: { source: 'demo-store', mode: 'DEMO_OPERATIONAL', ...payload },
    createdAt: nowIso(),
  });
}

function accountSummary(accounts: BankAccountEnterpriseRecord[]): BankAccountSummary {
  const byBank: Record<string, number> = {};
  let active = 0;
  let deleted = 0;
  let totalBalance = 0;

  for (const account of accounts) {
    if (account.deletedAt || account.status === 'DELETED') deleted += 1;
    else active += 1;

    totalBalance += account.balanceCache;
    byBank[account.bankName] = (byBank[account.bankName] || 0) + 1;
  }

  return {
    count: accounts.length,
    active,
    deleted,
    totalBalance: roundMoney(totalBalance),
    byBank,
  };
}

function transactionSummary(
  transactions: BankTransactionEnterpriseRecord[],
): BankTransactionSummary {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byBankAccountId: Record<string, number> = {};
  let totalCredit = 0;
  let totalDebit = 0;
  let reconciled = 0;

  for (const transaction of transactions) {
    if (transaction.type === 'CREDIT') totalCredit += transaction.amount;
    if (transaction.type === 'DEBIT') totalDebit += transaction.amount;
    if (transaction.reconciled) reconciled += 1;

    byType[transaction.type] = (byType[transaction.type] || 0) + 1;
    const status = transaction.reconciled ? 'RECONCILED' : 'PENDING';
    byStatus[status] = (byStatus[status] || 0) + 1;
    byBankAccountId[transaction.bankAccountId] =
      (byBankAccountId[transaction.bankAccountId] || 0) + 1;
  }

  const pending = transactions.length - reconciled;

  return {
    count: transactions.length,
    credits: byType.CREDIT || 0,
    debits: byType.DEBIT || 0,
    totalCredit: roundMoney(totalCredit),
    totalDebit: roundMoney(totalDebit),
    netAmount: roundMoney(totalCredit - totalDebit),
    reconciled,
    pending,
    reconciliationRate: transactions.length
      ? roundMoney((reconciled / transactions.length) * 100)
      : 0,
    byType,
    byStatus,
    byBankAccountId,
  };
}

function paginate<T>(items: T[], params: BankingQuery): T[] {
  const offset = Number(params.offset || 0);
  const limit = Number(params.limit || 100);
  return items.slice(offset, offset + limit);
}

function filterAccounts(
  accounts: BankAccountEnterpriseRecord[],
  params: BankingQuery,
): BankAccountEnterpriseRecord[] {
  const search = String(params.search || '')
    .trim()
    .toLowerCase();

  return accounts.filter((account) => {
    if (!search) return true;
    return `${account.bankName} ${account.agency} ${account.account}`
      .toLowerCase()
      .includes(search);
  });
}

function filterTransactions(
  transactions: BankTransactionEnterpriseRecord[],
  params: BankingQuery,
): BankTransactionEnterpriseRecord[] {
  const search = String(params.search || '')
    .trim()
    .toLowerCase();

  return transactions.filter((transaction) => {
    if (params.bankAccountId && transaction.bankAccountId !== params.bankAccountId) return false;
    if (params.type && params.type !== 'ALL' && transaction.type !== params.type) return false;
    if (params.reconciled === 'true' && !transaction.reconciled) return false;
    if (params.reconciled === 'false' && transaction.reconciled) return false;
    if (!search) return true;
    return `${transaction.description} ${transaction.type}`.toLowerCase().includes(search);
  });
}

function buildCandidates(
  companyId: string,
  transaction: BankTransactionEnterpriseRecord,
): ReconciliationCandidate[] {
  if (transaction.reconciled) return [];

  const amountScore = transaction.amount >= 1000 ? 94 : 84;
  const descriptionScore = transaction.description.toLowerCase().includes('das') ? 96 : 78;
  const score = Math.round((amountScore + descriptionScore + 88) / 3);

  return [
    {
      targetType: transaction.type === 'DEBIT' ? 'TAX_OBLIGATION' : 'INVOICE',
      targetId:
        transaction.type === 'DEBIT'
          ? `demo-tax-${transaction.id}`
          : `demo-invoice-${transaction.id}`,
      score,
      amountScore,
      dateScore: 88,
      descriptionScore,
      reason: [
        'Valor compatível com o documento candidato',
        'Data dentro da tolerância operacional',
        'Descrição contém sinal fiscal/bancário relevante',
      ],
      target: {
        id:
          transaction.type === 'DEBIT'
            ? `demo-tax-${transaction.id}`
            : `demo-invoice-${transaction.id}`,
        companyId,
        amount: transaction.amount,
        description:
          transaction.type === 'DEBIT'
            ? `Guia candidata para ${transaction.description}`
            : `Nota candidata para ${transaction.description}`,
      },
    },
  ];
}

export const bankingEnterpriseApi = {
  summary: async (companyId: string): Promise<BankingSummaryResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      return {
        status: 'success',
        module: 'banking-enterprise-summary',
        companyId,
        accounts: accountSummary(store.accounts),
        transactions: transactionSummary(store.transactions),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<BankingSummaryResponse>(
      `/banking/enterprise/summary/${companyId}`,
    );

    return response.data;
  },

  listAccounts: async (
    companyId: string,
    params: BankingQuery = {},
  ): Promise<BankAccountsListResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const filtered = filterAccounts(store.accounts, params);
      const items = paginate(filtered, params);
      return {
        status: 'success',
        module: 'bank-accounts',
        model: 'BankAccount',
        companyId,
        items,
        total: filtered.length,
        limit: Number(params.limit || 100),
        offset: Number(params.offset || 0),
        hasMore: Number(params.offset || 0) + items.length < filtered.length,
        summary: accountSummary(filtered),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<BankAccountsListResponse>(
      `/banking/enterprise/accounts/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createAccount: async (
    companyId: string,
    payload: CreateBankAccountPayload,
  ): Promise<BankingActionResponse<BankAccountEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const account: BankAccountEnterpriseRecord = {
        id: `demo-bank-account-${Date.now()}`,
        companyId,
        bankName: payload.bankName,
        agency: payload.agency,
        account: payload.account,
        balanceCache: roundMoney(payload.balanceCache || 0),
        status: 'ACTIVE',
        createdAt: nowIso(),
      };

      store.accounts.unshift(account);
      appendAudit(
        store,
        companyId,
        'bank-accounts',
        'DEMO_BANK_ACCOUNT_CREATED',
        'BankAccount',
        account.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Conta bancária criada na sessão demo.',
        companyId,
        item: account,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const index = store.accounts.findIndex((account) => account.id === bankAccountId);
      const current = store.accounts[index];

      if (!current) throw new Error(`Conta bancária demo não encontrada: ${bankAccountId}`);

      const account: BankAccountEnterpriseRecord = {
        ...current,
        ...payload,
        balanceCache:
          payload.balanceCache === undefined
            ? current.balanceCache
            : roundMoney(payload.balanceCache),
        updatedAt: nowIso(),
      };

      store.accounts[index] = account;
      store.transactions = store.transactions.map((transaction) =>
        transaction.bankAccountId === bankAccountId
          ? { ...transaction, bankAccount: account }
          : transaction,
      );
      appendAudit(
        store,
        companyId,
        'bank-accounts',
        'DEMO_BANK_ACCOUNT_UPDATED',
        'BankAccount',
        account.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Conta bancária atualizada na sessão demo.',
        companyId,
        item: account,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      const response = await bankingEnterpriseApi.updateAccount(companyId, bankAccountId, {});
      const item = response.item
        ? { ...response.item, status: 'DELETED', deletedAt: nowIso() }
        : undefined;
      if (item) {
        const store = readStore(companyId);
        const index = store.accounts.findIndex((account) => account.id === bankAccountId);
        if (index >= 0) {
          store.accounts[index] = item;
          appendAudit(
            store,
            companyId,
            'bank-accounts',
            'DEMO_BANK_ACCOUNT_DEACTIVATED',
            'BankAccount',
            item.id,
          );
          writeStore(companyId, store);
        }
      }

      return {
        ...response,
        message: 'Conta bancária desativada na sessão demo.',
        item,
      };
    }

    const response = await api.post<BankingActionResponse<BankAccountEnterpriseRecord>>(
      `/banking/enterprise/accounts/${companyId}/${bankAccountId}/deactivate`,
    );

    return response.data;
  },

  listTransactions: async (
    companyId: string,
    params: BankingQuery = {},
  ): Promise<BankTransactionsListResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const filtered = filterTransactions(store.transactions, params);
      const items = paginate(filtered, params);
      return {
        status: 'success',
        module: 'bank-transactions',
        model: 'BankTransaction',
        companyId,
        items,
        total: filtered.length,
        limit: Number(params.limit || 100),
        offset: Number(params.offset || 0),
        hasMore: Number(params.offset || 0) + items.length < filtered.length,
        summary: transactionSummary(filtered),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<BankTransactionsListResponse>(
      `/banking/enterprise/transactions/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createTransaction: async (
    companyId: string,
    payload: CreateBankTransactionPayload,
  ): Promise<BankingActionResponse<BankTransactionEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const account = store.accounts.find((item) => item.id === payload.bankAccountId);

      if (!account) throw new Error(`Conta bancária demo não encontrada: ${payload.bankAccountId}`);

      const transaction: BankTransactionEnterpriseRecord = {
        id: `demo-bank-transaction-${Date.now()}`,
        companyId,
        bankAccountId: payload.bankAccountId,
        type: payload.type,
        amount: roundMoney(payload.amount),
        signedAmount: signedAmount(payload.type, payload.amount),
        description: payload.description,
        occurredAt: payload.occurredAt,
        reconciled: false,
        reconciliationStatus: 'PENDING',
        metadata: payload.metadata || { source: 'demo-store' },
        bankAccount: account,
        createdAt: nowIso(),
        version: 1,
      };

      store.transactions.unshift(transaction);
      appendAudit(
        store,
        companyId,
        'bank-transactions',
        'DEMO_BANK_TRANSACTION_CREATED',
        'BankTransaction',
        transaction.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Transação bancária criada na sessão demo.',
        companyId,
        item: transaction,
        financialEvent: { recorded: true, event: { source: 'demo-store' } },
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const index = store.transactions.findIndex((transaction) => transaction.id === transactionId);
      const current = store.transactions[index];

      if (!current) throw new Error(`Transação bancária demo não encontrada: ${transactionId}`);

      const amount = payload.amount === undefined ? current.amount : roundMoney(payload.amount);
      const type = payload.type || current.type;
      const transaction: BankTransactionEnterpriseRecord = {
        ...current,
        ...payload,
        type,
        amount,
        signedAmount: signedAmount(type, amount),
        version: Number(current.version || 1) + 1,
      };

      store.transactions[index] = transaction;
      appendAudit(
        store,
        companyId,
        'bank-transactions',
        'DEMO_BANK_TRANSACTION_UPDATED',
        'BankTransaction',
        transaction.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Transação bancária atualizada na sessão demo.',
        companyId,
        item: transaction,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const item = store.transactions.find((transaction) => transaction.id === transactionId);

      if (!item) throw new Error(`Transação bancária demo não encontrada: ${transactionId}`);

      return {
        status: 'success',
        item,
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const transaction = store.transactions.find((item) => item.id === transactionId);

      if (!transaction) throw new Error(`Transação bancária demo não encontrada: ${transactionId}`);

      const candidates = buildCandidates(companyId, transaction).slice(
        0,
        Number(params.limit || 10),
      );

      return {
        status: 'success',
        module: 'bank-reconciliation',
        companyId,
        transaction,
        candidates,
        total: candidates.length,
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const index = store.transactions.findIndex(
        (transaction) => transaction.id === payload.bankTransactionId,
      );
      const current = store.transactions[index];

      if (!current) {
        throw new Error(`Transação bancária demo não encontrada: ${payload.bankTransactionId}`);
      }

      const transaction: BankTransactionEnterpriseRecord = {
        ...current,
        reconciled: true,
        reconciliationStatus: 'RECONCILED',
        invoiceId: payload.targetType === 'INVOICE' ? payload.targetId : current.invoiceId,
        taxObligationId:
          payload.targetType === 'TAX_OBLIGATION' ? payload.targetId : current.taxObligationId,
        metadata: {
          ...(current.metadata || {}),
          reconciliationNote: payload.note,
          reconciledAt: nowIso(),
        },
        version: Number(current.version || 1) + 1,
      };

      store.transactions[index] = transaction;
      appendAudit(
        store,
        companyId,
        'bank-reconciliation',
        'DEMO_BANK_TRANSACTION_RECONCILED',
        'BankTransaction',
        transaction.id,
        { targetType: payload.targetType, targetId: payload.targetId },
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Conciliação realizada na sessão demo.',
        companyId,
        item: transaction,
        target: { id: payload.targetId, type: payload.targetType },
        financialEvent: { recorded: true, event: { source: 'demo-reconciliation' } },
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const limit = Number(payload.limit || 50);
      let matched = 0;
      let processed = 0;

      store.transactions = store.transactions.map((transaction) => {
        if (processed >= limit || transaction.reconciled) return transaction;
        processed += 1;

        const candidates = buildCandidates(companyId, transaction);
        const candidate = candidates[0];
        if (!candidate || candidate.score < 80) return transaction;

        matched += 1;
        return {
          ...transaction,
          reconciled: true,
          reconciliationStatus: 'RECONCILED',
          invoiceId:
            candidate.targetType === 'INVOICE' ? candidate.targetId : transaction.invoiceId,
          taxObligationId:
            candidate.targetType === 'TAX_OBLIGATION'
              ? candidate.targetId
              : transaction.taxObligationId,
          metadata: {
            ...(transaction.metadata || {}),
            autoReconciledAt: nowIso(),
            autoReconciliationScore: candidate.score,
          },
          version: Number(transaction.version || 1) + 1,
        };
      });

      appendAudit(
        store,
        companyId,
        'bank-reconciliation',
        'DEMO_BANK_AUTO_RECONCILIATION_FINISHED',
        'BankTransaction',
        undefined,
        { processed, matched },
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Conciliação automática finalizada na sessão demo.',
        companyId,
        totals: {
          processed,
          matched,
          skipped: Math.max(processed - matched, 0),
          failed: 0,
        },
        results: [],
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const index = store.transactions.findIndex((transaction) => transaction.id === transactionId);
      const current = store.transactions[index];

      if (!current) throw new Error(`Transação bancária demo não encontrada: ${transactionId}`);

      const transaction: BankTransactionEnterpriseRecord = {
        ...current,
        reconciled: false,
        reconciliationStatus: 'PENDING',
        invoiceId: null,
        taxObligationId: null,
        metadata: {
          ...(current.metadata || {}),
          reconciliationUndoneAt: nowIso(),
        },
        version: Number(current.version || 1) + 1,
      };

      store.transactions[index] = transaction;
      appendAudit(
        store,
        companyId,
        'bank-reconciliation',
        'DEMO_BANK_RECONCILIATION_UNDONE',
        'BankTransaction',
        transaction.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Conciliação desfeita na sessão demo.',
        companyId,
        item: transaction,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const limit = Number(params.limit || 30);
      const offset = Number(params.offset || 0);
      const items = store.audits.filter((item) => item.module === module);

      return {
        items: items.slice(offset, offset + limit),
        total: items.length,
        limit,
        offset,
        generatedAt: nowIso(),
      };
    }

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

'use strict';

import { api } from '@/services/api';
import { createDemoEnterpriseResponse } from './enterprise-demo';
import { isDemoEntityId, isOperationalDemoFallbackEnabled } from '@/lib/config/demo-policy';

export type AccountType =
  | 'ATIVO'
  | 'PASSIVO'
  | 'PATRIMONIO_LIQUIDO'
  | 'RECEITA'
  | 'DESPESA'
  | 'CUSTO';

export type EntryOrigin =
  | 'MANUAL'
  | 'INVOICE_AUTO'
  | 'PAYROLL_AUTO'
  | 'BANK_IMPORT'
  | 'TAX_PAYMENT';

export type AccountPlanRecord = {
  id: string;
  companyId?: string | null;
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string | null;
  active: boolean;
  createdAt?: string | null;
  scope?: 'COMPANY' | 'GLOBAL' | string;
  [key: string]: unknown;
};

export type AccountingEntryRecord = {
  id: string;
  companyId: string;
  date: string;
  description: string;
  debitCode: string;
  creditCode: string;
  amount: number;
  origin: EntryOrigin;
  referenceId?: string | null;
  referenceType?: string | null;
  month: number;
  year: number;
  locked: boolean;
  createdAt?: string | null;
  periodLabel?: string;
  [key: string]: unknown;
};

export type BalanceLockRecord = {
  id: string;
  companyId: string;
  month: number;
  year: number;
  lockedAt: string;
  lockedBy: string;
  [key: string]: unknown;
};

export type AccountPlanSummary = {
  count: number;
  active: number;
  inactive: number;
  companySpecific: number;
  global: number;
  type: Record<string, number>;
};

export type AccountingEntrySummary = {
  count: number;
  totalDebit: number;
  totalCredit: number;
  totalAmount: number;
  locked: number;
  unlocked: number;
  byOrigin: Record<string, number>;
  byMonth: Record<string, number>;
  byDebitCode: Record<string, number>;
  byCreditCode: Record<string, number>;
  balanced: boolean;
};

export type AccountPlanListResponse = {
  status: string;
  module: 'account-plan';
  model: 'AccountPlan';
  companyId: string;
  items: AccountPlanRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: AccountPlanSummary;
  generatedAt: string;
};

export type AccountingEntriesListResponse = {
  status: string;
  module: 'accounting-entries';
  model: 'AccountingEntry';
  companyId: string;
  items: AccountingEntryRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: AccountingEntrySummary;
  generatedAt: string;
};

export type BalanceLocksListResponse = {
  status: string;
  module: 'balance-locks';
  model: 'BalanceLock';
  companyId: string;
  items: BalanceLockRecord[];
  total: number;
  generatedAt: string;
};

export type AccountingActionResponse<T> = {
  status: string;
  message: string;
  companyId: string;
  item?: T;
  deletedId?: string;
  results?: Array<{
    code: string;
    status: 'CREATED' | 'SKIPPED';
    id?: string;
  }>;
  audit?: {
    recorded: boolean;
    error?: string;
  };
  generatedAt: string;
};

export type CreateAccountPlanPayload = {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  active?: boolean;
};

export type UpdateAccountPlanPayload = Partial<Omit<CreateAccountPlanPayload, 'code'>>;

export type CreateAccountingEntryPayload = {
  date: string;
  description: string;
  debitCode: string;
  creditCode: string;
  amount: number;
  origin?: EntryOrigin;
  referenceId?: string;
  referenceType?: string;
};

export type UpdateAccountingEntryPayload = Partial<CreateAccountingEntryPayload>;

export type LockPeriodPayload = {
  month: number;
  year: number;
  lockedBy?: string;
};

export type AccountingQuery = {
  limit?: number;
  offset?: number;
  search?: string;
  type?: string;
  origin?: string;
  referenceType?: string;
  referenceId?: string;
  code?: string;
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

export const accountingApi = {
  listAccountPlan: async (
    companyId: string,
    params: AccountingQuery = {},
  ): Promise<AccountPlanListResponse> => {
    // Demo short-circuit
    if (isDemoEntityId(companyId) && isOperationalDemoFallbackEnabled()) {
      const demo = createDemoEnterpriseResponse('account-plan', companyId, params);
      return {
        status: demo.status,
        module: 'account-plan',
        model: 'AccountPlan',
        companyId,
        items: (demo.items as unknown as AccountPlanRecord[]) || [],
        total: demo.total || 0,
        limit: demo.limit || params.limit || 100,
        offset: demo.offset || params.offset || 0,
        hasMore: !!demo.hasMore,
        summary: (demo.summary as unknown as AccountPlanSummary) || {
          count: 0,
          active: 0,
          inactive: 0,
          companySpecific: 0,
          global: 0,
          type: {},
        },
        generatedAt: demo.generatedAt || new Date().toISOString(),
      };
    }

    const response = await api.get<AccountPlanListResponse>(
      `/accounting/enterprise/account-plan/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },


  seedDefaultAccountPlan: async (
    companyId: string,
  ): Promise<AccountingActionResponse<AccountPlanRecord>> => {
    const response = await api.post<AccountingActionResponse<AccountPlanRecord>>(
      `/accounting/enterprise/account-plan/${companyId}/seed-default`,
    );

    return response.data;
  },

  createAccountPlan: async (
    companyId: string,
    payload: CreateAccountPlanPayload,
  ): Promise<AccountingActionResponse<AccountPlanRecord>> => {
    const response = await api.post<AccountingActionResponse<AccountPlanRecord>>(
      `/accounting/enterprise/account-plan/${companyId}`,
      payload,
    );

    return response.data;
  },

  updateAccountPlan: async (
    companyId: string,
    accountId: string,
    payload: UpdateAccountPlanPayload,
  ): Promise<AccountingActionResponse<AccountPlanRecord>> => {
    const response = await api.patch<AccountingActionResponse<AccountPlanRecord>>(
      `/accounting/enterprise/account-plan/${companyId}/${accountId}`,
      payload,
    );

    return response.data;
  },

  deactivateAccountPlan: async (
    companyId: string,
    accountId: string,
  ): Promise<AccountingActionResponse<AccountPlanRecord>> => {
    const response = await api.post<AccountingActionResponse<AccountPlanRecord>>(
      `/accounting/enterprise/account-plan/${companyId}/${accountId}/deactivate`,
    );

    return response.data;
  },

  listEntries: async (
    companyId: string,
    params: AccountingQuery = {},
  ): Promise<AccountingEntriesListResponse> => {
    // Demo short-circuit
    if (isDemoEntityId(companyId) && isOperationalDemoFallbackEnabled()) {
      const demo = createDemoEnterpriseResponse('accounting-entries', companyId, params);
      return {
        status: demo.status,
        module: 'accounting-entries',
        model: 'AccountingEntry',
        companyId,
        items: (demo.items as unknown as AccountingEntryRecord[]) || [],
        total: demo.total || 0,
        limit: demo.limit || params.limit || 100,
        offset: demo.offset || params.offset || 0,
        hasMore: !!demo.hasMore,
        summary: (demo.summary as unknown as AccountingEntrySummary) || {
          count: 0,
          totalDebit: 0,
          totalCredit: 0,
          totalAmount: 0,
          locked: 0,
          unlocked: 0,
          byOrigin: {},
          byMonth: {},
          byDebitCode: {},
          byCreditCode: {},
          balanced: true,
        },
        generatedAt: demo.generatedAt || new Date().toISOString(),
      };
    }

    const response = await api.get<AccountingEntriesListResponse>(
      `/accounting/enterprise/entries/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },


  createEntry: async (
    companyId: string,
    payload: CreateAccountingEntryPayload,
  ): Promise<AccountingActionResponse<AccountingEntryRecord>> => {
    const response = await api.post<AccountingActionResponse<AccountingEntryRecord>>(
      `/accounting/enterprise/entries/${companyId}`,
      payload,
    );

    return response.data;
  },

  updateEntry: async (
    companyId: string,
    entryId: string,
    payload: UpdateAccountingEntryPayload,
  ): Promise<AccountingActionResponse<AccountingEntryRecord>> => {
    const response = await api.patch<AccountingActionResponse<AccountingEntryRecord>>(
      `/accounting/enterprise/entries/${companyId}/${entryId}`,
      payload,
    );

    return response.data;
  },

  deleteEntry: async (
    companyId: string,
    entryId: string,
  ): Promise<AccountingActionResponse<AccountingEntryRecord>> => {
    const response = await api.delete<AccountingActionResponse<AccountingEntryRecord>>(
      `/accounting/enterprise/entries/${companyId}/${entryId}`,
    );

    return response.data;
  },

  listLocks: async (companyId: string): Promise<BalanceLocksListResponse> => {
    // Demo short-circuit
    if (isDemoEntityId(companyId) && isOperationalDemoFallbackEnabled()) {
      const demo = createDemoEnterpriseResponse('balance-locks', companyId);
      return {
        status: demo.status,
        module: 'balance-locks',
        model: 'BalanceLock',
        companyId,
        items: (demo.items as unknown as BalanceLockRecord[]) || [],
        total: demo.total || 0,
        generatedAt: demo.generatedAt || new Date().toISOString(),
      };
    }

    const response = await api.get<BalanceLocksListResponse>(
      `/accounting/enterprise/locks/${companyId}`,
    );

    return response.data;
  },


  lockPeriod: async (
    companyId: string,
    payload: LockPeriodPayload,
  ): Promise<AccountingActionResponse<BalanceLockRecord>> => {
    const response = await api.post<AccountingActionResponse<BalanceLockRecord>>(
      `/accounting/enterprise/locks/${companyId}`,
      payload,
    );

    return response.data;
  },

  unlockPeriod: async (
    companyId: string,
    month: number,
    year: number,
  ): Promise<AccountingActionResponse<BalanceLockRecord>> => {
    const response = await api.delete<AccountingActionResponse<BalanceLockRecord>>(
      `/accounting/enterprise/locks/${companyId}/${month}/${year}`,
    );

    return response.data;
  },

  audit: async (
    companyId: string,
    module: 'account-plan' | 'accounting-entries' | 'balance-locks',
    params: Record<string, unknown> = {},
  ): Promise<AuditLogListResponse> => {
    // Demo short-circuit: return empty audit list for demo companies
    if (isDemoEntityId(companyId) && isOperationalDemoFallbackEnabled()) {
      return {
        items: [],
        total: 0,
        limit: Number(params.limit || 30),
        offset: 0,
        generatedAt: new Date().toISOString(),
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

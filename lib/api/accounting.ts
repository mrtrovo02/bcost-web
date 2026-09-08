'use strict';

import { api, isDemoSession } from '@/services/api';
import { assertOperationalDemoFallbackEnabled, isDemoEntityId } from '@/lib/config/demo-policy';

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

type DemoAccountingStore = {
  accountPlan: AccountPlanRecord[];
  entries: AccountingEntryRecord[];
  locks: BalanceLockRecord[];
  audits: AuditLogRecord[];
};

type DemoAccountSeed = {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string | null;
  active: boolean;
  scope: 'COMPANY' | 'GLOBAL';
};

const DEMO_STORE_VERSION = 'v1';

const DEFAULT_DEMO_ACCOUNTS: DemoAccountSeed[] = [
  { code: '1', name: 'Ativo', type: 'ATIVO', parentCode: null, active: true, scope: 'GLOBAL' },
  {
    code: '1.1',
    name: 'Ativo Circulante',
    type: 'ATIVO',
    parentCode: '1',
    active: true,
    scope: 'GLOBAL',
  },
  {
    code: '1.1.01',
    name: 'Caixa e Equivalentes',
    type: 'ATIVO',
    parentCode: '1.1',
    active: true,
    scope: 'COMPANY',
  },
  {
    code: '1.1.02',
    name: 'Bancos Conta Movimento',
    type: 'ATIVO',
    parentCode: '1.1',
    active: true,
    scope: 'COMPANY',
  },
  { code: '2', name: 'Passivo', type: 'PASSIVO', parentCode: null, active: true, scope: 'GLOBAL' },
  {
    code: '2.1.01',
    name: 'Tributos a Recolher',
    type: 'PASSIVO',
    parentCode: '2',
    active: true,
    scope: 'COMPANY',
  },
  {
    code: '3',
    name: 'Patrimônio Líquido',
    type: 'PATRIMONIO_LIQUIDO',
    parentCode: null,
    active: true,
    scope: 'GLOBAL',
  },
  {
    code: '4.1.01',
    name: 'Receita de Serviços',
    type: 'RECEITA',
    parentCode: null,
    active: true,
    scope: 'COMPANY',
  },
  {
    code: '5.1.01',
    name: 'Despesas Administrativas',
    type: 'DESPESA',
    parentCode: null,
    active: true,
    scope: 'COMPANY',
  },
  {
    code: '5.2.01',
    name: 'Folha e Encargos',
    type: 'DESPESA',
    parentCode: null,
    active: true,
    scope: 'COMPANY',
  },
];

function shouldUseAccountingDemo(companyId: string): boolean {
  if (!isDemoEntityId(companyId)) return false;

  const message =
    'Contabilidade demonstrativa indisponivel e fallback demonstrativo desabilitado neste ambiente.';

  if (!isDemoSession()) {
    throw new Error(message);
  }

  assertOperationalDemoFallbackEnabled(message);

  return true;
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

function monthYearFromDate(value: string): { month: number; year: number } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

function periodLabel(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${year}`;
}

function storeKey(companyId: string): string {
  return `bcost:${DEMO_STORE_VERSION}:accounting-enterprise:${companyId}`;
}

function makeAccount(companyId: string, account: DemoAccountSeed): AccountPlanRecord {
  return {
    ...account,
    id: `demo-account-${account.code.replace(/\./g, '-')}`,
    companyId,
    createdAt: nowIso(),
  };
}

function makeEntry(
  companyId: string,
  input: CreateAccountingEntryPayload & { id?: string; locked?: boolean; createdAt?: string },
): AccountingEntryRecord {
  const { month, year } = monthYearFromDate(input.date);

  return {
    id: input.id || `demo-entry-${Date.now()}`,
    companyId,
    date: input.date,
    description: input.description,
    debitCode: input.debitCode,
    creditCode: input.creditCode,
    amount: roundMoney(input.amount),
    origin: input.origin || 'MANUAL',
    referenceId: input.referenceId || null,
    referenceType: input.referenceType || null,
    month,
    year,
    locked: Boolean(input.locked),
    createdAt: input.createdAt || nowIso(),
    periodLabel: periodLabel(month, year),
  };
}

function makeDemoStore(companyId: string): DemoAccountingStore {
  const accountPlan = DEFAULT_DEMO_ACCOUNTS.map((account) => makeAccount(companyId, account));
  const entries = [
    makeEntry(companyId, {
      id: 'demo-entry-revenue-001',
      date: new Date().toISOString(),
      description: 'Reconhecimento de receita NFSe 2026-000148',
      debitCode: '1.1.02',
      creditCode: '4.1.01',
      amount: 83000,
      origin: 'INVOICE_AUTO',
      referenceId: 'demo-invoice-001',
      referenceType: 'INVOICE',
    }),
    makeEntry(companyId, {
      id: 'demo-entry-tax-001',
      date: new Date().toISOString(),
      description: 'Provisão DAS Simples Nacional',
      debitCode: '5.1.01',
      creditCode: '2.1.01',
      amount: 2470.35,
      origin: 'TAX_PAYMENT',
      referenceId: 'demo-tax-das-current',
      referenceType: 'TAX_OBLIGATION',
    }),
    makeEntry(companyId, {
      id: 'demo-entry-payroll-001',
      date: new Date().toISOString(),
      description: 'Provisão folha e encargos',
      debitCode: '5.2.01',
      creditCode: '2.1.01',
      amount: 18400,
      origin: 'PAYROLL_AUTO',
      referenceId: 'demo-payroll-current',
      referenceType: 'PAYROLL',
    }),
  ];

  return {
    accountPlan,
    entries,
    locks: [],
    audits: [
      {
        id: 'demo-audit-accounting-ready',
        companyId,
        module: 'accounting-entries',
        action: 'DEMO_ACCOUNTING_READY',
        entity: 'AccountingEntry',
        entityId: entries[0]?.id,
        payload: { source: 'demo-store', mode: 'DEMO_OPERATIONAL' },
        createdAt: nowIso(),
      },
    ],
  };
}

function readStore(companyId: string): DemoAccountingStore {
  if (!isBrowserRuntime()) return makeDemoStore(companyId);

  try {
    const raw = window.localStorage.getItem(storeKey(companyId));
    if (raw) return JSON.parse(raw) as DemoAccountingStore;
  } catch {
    window.localStorage.removeItem(storeKey(companyId));
  }

  const seeded = makeDemoStore(companyId);
  writeStore(companyId, seeded);
  return seeded;
}

function writeStore(companyId: string, store: DemoAccountingStore): void {
  if (!isBrowserRuntime()) return;
  window.localStorage.setItem(storeKey(companyId), JSON.stringify(store));
}

function appendAudit(
  store: DemoAccountingStore,
  companyId: string,
  module: 'account-plan' | 'accounting-entries' | 'balance-locks',
  action: string,
  entity: string,
  entityId?: string,
  payload: Record<string, unknown> = {},
): void {
  store.audits.unshift({
    id: `demo-audit-accounting-${Date.now()}`,
    companyId,
    module,
    action,
    entity,
    entityId,
    payload: { source: 'demo-store', mode: 'DEMO_OPERATIONAL', ...payload },
    createdAt: nowIso(),
  });
}

function accountSummary(items: AccountPlanRecord[]): AccountPlanSummary {
  const type: Record<string, number> = {};
  let active = 0;
  let inactive = 0;
  let companySpecific = 0;
  let global = 0;

  for (const item of items) {
    if (item.active) active += 1;
    else inactive += 1;

    if (item.scope === 'COMPANY') companySpecific += 1;
    else global += 1;

    type[item.type] = (type[item.type] || 0) + 1;
  }

  return {
    count: items.length,
    active,
    inactive,
    companySpecific,
    global,
    type,
  };
}

function entriesSummary(items: AccountingEntryRecord[]): AccountingEntrySummary {
  const byOrigin: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  const byDebitCode: Record<string, number> = {};
  const byCreditCode: Record<string, number> = {};
  let totalAmount = 0;
  let locked = 0;

  for (const item of items) {
    totalAmount += item.amount;
    if (item.locked) locked += 1;

    byOrigin[item.origin] = (byOrigin[item.origin] || 0) + 1;
    byMonth[item.periodLabel || periodLabel(item.month, item.year)] =
      (byMonth[item.periodLabel || periodLabel(item.month, item.year)] || 0) + item.amount;
    byDebitCode[item.debitCode] = (byDebitCode[item.debitCode] || 0) + item.amount;
    byCreditCode[item.creditCode] = (byCreditCode[item.creditCode] || 0) + item.amount;
  }

  return {
    count: items.length,
    totalDebit: roundMoney(totalAmount),
    totalCredit: roundMoney(totalAmount),
    totalAmount: roundMoney(totalAmount),
    locked,
    unlocked: items.length - locked,
    byOrigin,
    byMonth,
    byDebitCode,
    byCreditCode,
    balanced: true,
  };
}

function paginate<T>(items: T[], params: AccountingQuery): T[] {
  const offset = Number(params.offset || 0);
  const limit = Number(params.limit || 100);
  return items.slice(offset, offset + limit);
}

function filterAccounts(items: AccountPlanRecord[], params: AccountingQuery): AccountPlanRecord[] {
  const search = String(params.search || '')
    .trim()
    .toLowerCase();

  return items.filter((item) => {
    if (params.type && params.type !== 'ALL' && item.type !== params.type) return false;
    if (params.code && item.code !== params.code) return false;
    if (!search) return true;
    return `${item.code} ${item.name} ${item.type}`.toLowerCase().includes(search);
  });
}

function filterEntries(
  items: AccountingEntryRecord[],
  params: AccountingQuery,
): AccountingEntryRecord[] {
  const search = String(params.search || '')
    .trim()
    .toLowerCase();

  return items.filter((item) => {
    if (params.origin && params.origin !== 'ALL' && item.origin !== params.origin) return false;
    if (params.month && Number(params.month) !== item.month) return false;
    if (params.year && Number(params.year) !== item.year) return false;
    if (params.referenceType && item.referenceType !== params.referenceType) return false;
    if (params.referenceId && item.referenceId !== params.referenceId) return false;
    if (!search) return true;
    return `${item.description} ${item.debitCode} ${item.creditCode} ${item.origin}`
      .toLowerCase()
      .includes(search);
  });
}

export const accountingApi = {
  listAccountPlan: async (
    companyId: string,
    params: AccountingQuery = {},
  ): Promise<AccountPlanListResponse> => {
    if (shouldUseAccountingDemo(companyId)) {
      const store = readStore(companyId);
      const filtered = filterAccounts(store.accountPlan, params);
      const items = paginate(filtered, params);

      return {
        status: 'success',
        module: 'account-plan',
        model: 'AccountPlan',
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

    const response = await api.get<AccountPlanListResponse>(
      `/accounting/enterprise/account-plan/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  seedDefaultAccountPlan: async (
    companyId: string,
  ): Promise<AccountingActionResponse<AccountPlanRecord>> => {
    if (shouldUseAccountingDemo(companyId)) {
      const store = readStore(companyId);
      const existingCodes = new Set(store.accountPlan.map((item) => item.code));
      const results: NonNullable<AccountingActionResponse<AccountPlanRecord>['results']> = [];

      for (const account of DEFAULT_DEMO_ACCOUNTS) {
        if (existingCodes.has(account.code)) {
          results.push({ code: account.code, status: 'SKIPPED' });
          continue;
        }

        const item = makeAccount(companyId, account);
        store.accountPlan.push(item);
        results.push({ code: item.code, status: 'CREATED', id: item.id });
      }

      appendAudit(store, companyId, 'account-plan', 'DEMO_ACCOUNT_PLAN_SEEDED', 'AccountPlan');
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Plano base aplicado na sessão demo.',
        companyId,
        item: store.accountPlan[0],
        results,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

    const response = await api.post<AccountingActionResponse<AccountPlanRecord>>(
      `/accounting/enterprise/account-plan/${companyId}/seed-default`,
    );

    return response.data;
  },

  createAccountPlan: async (
    companyId: string,
    payload: CreateAccountPlanPayload,
  ): Promise<AccountingActionResponse<AccountPlanRecord>> => {
    if (shouldUseAccountingDemo(companyId)) {
      const store = readStore(companyId);

      if (store.accountPlan.some((item) => item.code === payload.code)) {
        throw new Error(`Conta contábil demo já existe: ${payload.code}`);
      }

      const item = makeAccount(companyId, {
        code: payload.code,
        name: payload.name,
        type: payload.type,
        parentCode: payload.parentCode || null,
        active: payload.active ?? true,
        scope: 'COMPANY',
      });

      store.accountPlan.unshift(item);
      appendAudit(
        store,
        companyId,
        'account-plan',
        'DEMO_ACCOUNT_PLAN_CREATED',
        'AccountPlan',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Conta contábil criada na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (shouldUseAccountingDemo(companyId)) {
      const store = readStore(companyId);
      const index = store.accountPlan.findIndex((item) => item.id === accountId);
      const current = store.accountPlan[index];

      if (!current) throw new Error(`Conta contábil demo não encontrada: ${accountId}`);

      const item: AccountPlanRecord = {
        ...current,
        ...payload,
        parentCode: payload.parentCode ?? current.parentCode,
      };

      store.accountPlan[index] = item;
      appendAudit(
        store,
        companyId,
        'account-plan',
        'DEMO_ACCOUNT_PLAN_UPDATED',
        'AccountPlan',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Conta contábil atualizada na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (shouldUseAccountingDemo(companyId)) {
      const response = await accountingApi.updateAccountPlan(companyId, accountId, {
        active: false,
      });

      return {
        ...response,
        message: 'Conta contábil desativada na sessão demo.',
      };
    }

    const response = await api.post<AccountingActionResponse<AccountPlanRecord>>(
      `/accounting/enterprise/account-plan/${companyId}/${accountId}/deactivate`,
    );

    return response.data;
  },

  listEntries: async (
    companyId: string,
    params: AccountingQuery = {},
  ): Promise<AccountingEntriesListResponse> => {
    if (shouldUseAccountingDemo(companyId)) {
      const store = readStore(companyId);
      const filtered = filterEntries(store.entries, params);
      const items = paginate(filtered, params);

      return {
        status: 'success',
        module: 'accounting-entries',
        model: 'AccountingEntry',
        companyId,
        items,
        total: filtered.length,
        limit: Number(params.limit || 100),
        offset: Number(params.offset || 0),
        hasMore: Number(params.offset || 0) + items.length < filtered.length,
        summary: entriesSummary(filtered),
        generatedAt: nowIso(),
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
    if (shouldUseAccountingDemo(companyId)) {
      const store = readStore(companyId);
      const { month, year } = monthYearFromDate(payload.date);
      const locked = store.locks.some((lock) => lock.month === month && lock.year === year);

      if (locked) {
        throw new Error(`Competência ${periodLabel(month, year)} está travada na sessão demo.`);
      }

      const item = makeEntry(companyId, payload);
      store.entries.unshift(item);
      appendAudit(
        store,
        companyId,
        'accounting-entries',
        'DEMO_ACCOUNTING_ENTRY_CREATED',
        'AccountingEntry',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Lançamento contábil criado na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (shouldUseAccountingDemo(companyId)) {
      const store = readStore(companyId);
      const index = store.entries.findIndex((entry) => entry.id === entryId);
      const current = store.entries[index];

      if (!current) throw new Error(`Lançamento contábil demo não encontrado: ${entryId}`);
      if (current.locked)
        throw new Error('Lançamento em competência travada não pode ser alterado.');

      const item = makeEntry(companyId, {
        ...current,
        ...payload,
        date: payload.date || current.date,
        description: payload.description || current.description,
        debitCode: payload.debitCode || current.debitCode,
        creditCode: payload.creditCode || current.creditCode,
        amount: payload.amount ?? current.amount,
        origin: payload.origin || current.origin,
        referenceId: payload.referenceId ?? current.referenceId ?? undefined,
        referenceType: payload.referenceType ?? current.referenceType ?? undefined,
        id: current.id,
        createdAt: current.createdAt || nowIso(),
        locked: current.locked,
      });

      store.entries[index] = item;
      appendAudit(
        store,
        companyId,
        'accounting-entries',
        'DEMO_ACCOUNTING_ENTRY_UPDATED',
        'AccountingEntry',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Lançamento contábil atualizado na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (shouldUseAccountingDemo(companyId)) {
      const store = readStore(companyId);
      const index = store.entries.findIndex((entry) => entry.id === entryId);
      const item = store.entries[index];

      if (!item) throw new Error(`Lançamento contábil demo não encontrado: ${entryId}`);
      if (item.locked) throw new Error('Lançamento em competência travada não pode ser removido.');

      store.entries.splice(index, 1);
      appendAudit(
        store,
        companyId,
        'accounting-entries',
        'DEMO_ACCOUNTING_ENTRY_DELETED',
        'AccountingEntry',
        entryId,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Lançamento contábil removido na sessão demo.',
        companyId,
        item,
        deletedId: entryId,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

    const response = await api.delete<AccountingActionResponse<AccountingEntryRecord>>(
      `/accounting/enterprise/entries/${companyId}/${entryId}`,
    );

    return response.data;
  },

  listLocks: async (companyId: string): Promise<BalanceLocksListResponse> => {
    if (shouldUseAccountingDemo(companyId)) {
      const store = readStore(companyId);
      return {
        status: 'success',
        module: 'balance-locks',
        model: 'BalanceLock',
        companyId,
        items: store.locks,
        total: store.locks.length,
        generatedAt: nowIso(),
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
    if (shouldUseAccountingDemo(companyId)) {
      const store = readStore(companyId);
      const existing = store.locks.find(
        (lock) => lock.month === payload.month && lock.year === payload.year,
      );

      if (existing) {
        return {
          status: 'success',
          message: 'Período já estava travado na sessão demo.',
          companyId,
          item: existing,
          audit: { recorded: true },
          generatedAt: nowIso(),
        };
      }

      const item: BalanceLockRecord = {
        id: `demo-lock-${payload.year}-${payload.month}`,
        companyId,
        month: payload.month,
        year: payload.year,
        lockedAt: nowIso(),
        lockedBy: payload.lockedBy || 'demo-user',
      };

      store.locks.unshift(item);
      store.entries = store.entries.map((entry) =>
        entry.month === payload.month && entry.year === payload.year
          ? { ...entry, locked: true }
          : entry,
      );
      appendAudit(
        store,
        companyId,
        'balance-locks',
        'DEMO_ACCOUNTING_PERIOD_LOCKED',
        'BalanceLock',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Período bloqueado na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (shouldUseAccountingDemo(companyId)) {
      const store = readStore(companyId);
      const index = store.locks.findIndex((lock) => lock.month === month && lock.year === year);
      const item = store.locks[index];

      if (!item) throw new Error(`Competência ${periodLabel(month, year)} não está travada.`);

      store.locks.splice(index, 1);
      store.entries = store.entries.map((entry) =>
        entry.month === month && entry.year === year ? { ...entry, locked: false } : entry,
      );
      appendAudit(
        store,
        companyId,
        'balance-locks',
        'DEMO_ACCOUNTING_PERIOD_UNLOCKED',
        'BalanceLock',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Período desbloqueado na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (shouldUseAccountingDemo(companyId)) {
      const store = readStore(companyId);
      const limit = Number(params.limit || 30);
      const offset = Number(params.offset || 0);
      const items = store.audits.filter((audit) => audit.module === module);

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

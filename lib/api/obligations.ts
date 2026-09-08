'use strict';

import { api, isDemoSession } from '@/services/api';
import { assertOperationalDemoFallbackEnabled, isDemoEntityId } from '@/lib/config/demo-policy';

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

export type RegisterTaxEvidencePayload = {
  fileUrl: string;
  receiptCode: string;
  notes?: string;
};

export type TaxEvidenceResponse = ObligationActionResponse<TaxObligationRecord> & {
  evidence?: {
    obligationId: string;
    companyId: string;
    fileUrl: string;
    receiptCode: string;
    notes?: string | null;
    source: 'GOVERNMENT_PORTAL';
    recordedBy?: string | null;
    recordedAt: string;
    integrityHash: string;
  };
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

type DemoObligationsStore = {
  tax: TaxObligationRecord[];
  fiscal: FiscalObligationRecord[];
  audits: AuditLogRecord[];
};

const DEMO_STORE_VERSION = 'v1';

function shouldUseObligationsDemo(companyId: string): boolean {
  if (!isDemoEntityId(companyId)) return false;

  const message =
    'Obrigacoes demonstrativas indisponiveis e fallback demonstrativo desabilitado neste ambiente.';

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

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 0);
  return date.toISOString();
}

function roundMoney(value: number): number {
  return Number(Number(value || 0).toFixed(2));
}

function daysToDue(dueDate: string): number | null {
  const due = new Date(dueDate).getTime();
  if (Number.isNaN(due)) return null;
  return Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24));
}

function enrichTax(item: TaxObligationRecord): TaxObligationRecord {
  const days = daysToDue(item.dueDate);
  const overdue =
    item.status !== 'PAID' && item.status !== 'CANCELLED' && days !== null && days < 0;

  return {
    ...item,
    daysToDue: days,
    overdue,
    paid: item.status === 'PAID',
    cancelled: item.status === 'CANCELLED',
    operationalStatus: overdue ? 'OVERDUE' : item.status,
  };
}

function enrichFiscal(item: FiscalObligationRecord): FiscalObligationRecord {
  const days = daysToDue(item.dueDate);
  const overdue = !['ACCEPTED', 'REJECTED'].includes(item.status) && days !== null && days < 0;

  return {
    ...item,
    daysToDue: days,
    overdue,
    submitted: ['SUBMITTED', 'ACCEPTED', 'REJECTED'].includes(item.status),
    accepted: item.status === 'ACCEPTED',
    rejected: item.status === 'REJECTED',
    operationalStatus: overdue ? 'OVERDUE' : item.status,
  };
}

function makeDemoStore(companyId: string): DemoObligationsStore {
  const tax = [
    enrichTax({
      id: 'demo-tax-das-current',
      companyId,
      name: 'DAS Simples Nacional',
      dueDate: addDays(12),
      amount: 2470.35,
      status: 'PENDING',
      fileUrl: null,
      createdAt: nowIso(),
    }),
    enrichTax({
      id: 'demo-tax-darf-irrf',
      companyId,
      name: 'DARF IRRF Folha',
      dueDate: addDays(5),
      amount: 890.4,
      status: 'PARTIAL',
      fileUrl: null,
      createdAt: nowIso(),
    }),
    enrichTax({
      id: 'demo-tax-gps-paid',
      companyId,
      name: 'GPS/INSS Pró-labore',
      dueDate: addDays(-9),
      amount: 1320,
      status: 'PAID',
      fileUrl: 'demo://guia-gps-inss.pdf',
      createdAt: nowIso(),
    }),
  ];

  const fiscal = [
    enrichFiscal({
      id: 'demo-fiscal-defis',
      companyId,
      type: 'DEFIS',
      referenceMonth: 12,
      referenceYear: new Date().getFullYear() - 1,
      dueDate: addDays(42),
      status: 'GENERATED',
      fileUrl: 'demo://defis-prevalidada.json',
      fileHash: 'DEMO-DEFIS-HASH',
      receiptCode: null,
      createdAt: nowIso(),
    }),
    enrichFiscal({
      id: 'demo-fiscal-dctfweb',
      companyId,
      type: 'DCTF',
      referenceMonth: new Date().getMonth() + 1,
      referenceYear: new Date().getFullYear(),
      dueDate: addDays(18),
      status: 'SUBMITTED',
      fileUrl: 'demo://dctfweb.xml',
      fileHash: 'DEMO-DCTF-HASH',
      receiptCode: 'REC-DEMO-DCTF-001',
      submittedAt: nowIso(),
      createdAt: nowIso(),
    }),
    enrichFiscal({
      id: 'demo-fiscal-sped',
      companyId,
      type: 'SPED_CONTRIBUICOES',
      referenceMonth: new Date().getMonth(),
      referenceYear: new Date().getFullYear(),
      dueDate: addDays(-3),
      status: 'OVERDUE',
      fileUrl: null,
      fileHash: null,
      receiptCode: null,
      createdAt: nowIso(),
    }),
  ];

  return {
    tax,
    fiscal,
    audits: [
      {
        id: 'demo-audit-obligations-ready',
        companyId,
        module: 'tax-obligations',
        action: 'DEMO_OBLIGATIONS_READY',
        entity: 'TaxObligation',
        entityId: tax[0]?.id,
        payload: { source: 'demo-store', mode: 'DEMO_OPERATIONAL' },
        createdAt: nowIso(),
      },
    ],
  };
}

function storeKey(companyId: string): string {
  return `bcost:${DEMO_STORE_VERSION}:obligations:${companyId}`;
}

function readStore(companyId: string): DemoObligationsStore {
  if (!isBrowserRuntime()) return makeDemoStore(companyId);

  try {
    const raw = window.localStorage.getItem(storeKey(companyId));
    if (raw) return JSON.parse(raw) as DemoObligationsStore;
  } catch {
    window.localStorage.removeItem(storeKey(companyId));
  }

  const seeded = makeDemoStore(companyId);
  writeStore(companyId, seeded);
  return seeded;
}

function writeStore(companyId: string, store: DemoObligationsStore): void {
  if (!isBrowserRuntime()) return;
  window.localStorage.setItem(storeKey(companyId), JSON.stringify(store));
}

function appendAudit(
  store: DemoObligationsStore,
  companyId: string,
  module: 'tax-obligations' | 'fiscal-obligations',
  action: string,
  entity: string,
  entityId?: string,
  payload: Record<string, unknown> = {},
): void {
  store.audits.unshift({
    id: `demo-audit-obligation-${Date.now()}`,
    companyId,
    module,
    action,
    entity,
    entityId,
    payload: { source: 'demo-store', mode: 'DEMO_OPERATIONAL', ...payload },
    createdAt: nowIso(),
  });
}

function paginate<T>(items: T[], params: ObligationsQuery): T[] {
  const offset = Number(params.offset || 0);
  const limit = Number(params.limit || 100);
  return items.slice(offset, offset + limit);
}

function filterTax(items: TaxObligationRecord[], params: ObligationsQuery): TaxObligationRecord[] {
  const search = String(params.search || '')
    .trim()
    .toLowerCase();

  return items.filter((item) => {
    if (params.status && params.status !== 'ALL' && item.status !== params.status) return false;
    if (search && !`${item.name} ${item.status}`.toLowerCase().includes(search)) return false;
    return true;
  });
}

function filterFiscal(
  items: FiscalObligationRecord[],
  params: ObligationsQuery,
): FiscalObligationRecord[] {
  const search = String(params.search || '')
    .trim()
    .toLowerCase();

  return items.filter((item) => {
    if (params.status && params.status !== 'ALL' && item.status !== params.status) return false;
    if (params.type && params.type !== 'ALL' && item.type !== params.type) return false;
    if (params.month && Number(params.month) !== item.referenceMonth) return false;
    if (params.year && Number(params.year) !== item.referenceYear) return false;
    if (
      search &&
      !`${item.type} ${item.status} ${item.receiptCode || ''}`.toLowerCase().includes(search)
    ) {
      return false;
    }
    return true;
  });
}

function taxSummary(items: TaxObligationRecord[]): TaxSummary {
  const status: Record<string, number> = {};
  let totalAmount = 0;
  let pendingAmount = 0;
  let overdueAmount = 0;

  for (const item of items) {
    totalAmount += item.amount;
    status[item.status] = (status[item.status] || 0) + 1;
    if (['PENDING', 'PARTIAL'].includes(item.status)) pendingAmount += item.amount;
    if (item.status === 'OVERDUE' || item.overdue) overdueAmount += item.amount;
  }

  const nextDue =
    items
      .filter((item) => !item.paid && !item.cancelled)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] || null;

  return {
    count: items.length,
    pending: status.PENDING || 0,
    paid: status.PAID || 0,
    overdue: items.filter((item) => item.status === 'OVERDUE' || item.overdue).length,
    cancelled: status.CANCELLED || 0,
    partial: status.PARTIAL || 0,
    totalAmount: roundMoney(totalAmount),
    pendingAmount: roundMoney(pendingAmount),
    overdueAmount: roundMoney(overdueAmount),
    nextDue: nextDue
      ? {
          id: nextDue.id,
          name: nextDue.name,
          dueDate: nextDue.dueDate,
          amount: nextDue.amount,
          daysToDue: nextDue.daysToDue ?? null,
        }
      : null,
    status,
  };
}

function fiscalSummary(items: FiscalObligationRecord[]): FiscalSummary {
  const status: Record<string, number> = {};
  const type: Record<string, number> = {};

  for (const item of items) {
    status[item.status] = (status[item.status] || 0) + 1;
    type[item.type] = (type[item.type] || 0) + 1;
  }

  const nextDue =
    items
      .filter((item) => !item.accepted && !item.rejected)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] || null;

  return {
    count: items.length,
    pending: status.PENDING || 0,
    generated: status.GENERATED || 0,
    submitted: status.SUBMITTED || 0,
    accepted: status.ACCEPTED || 0,
    rejected: status.REJECTED || 0,
    overdue: items.filter((item) => item.status === 'OVERDUE' || item.overdue).length,
    nextDue: nextDue
      ? {
          id: nextDue.id,
          type: nextDue.type,
          referenceMonth: nextDue.referenceMonth,
          referenceYear: nextDue.referenceYear,
          dueDate: nextDue.dueDate,
          daysToDue: nextDue.daysToDue ?? null,
        }
      : null,
    status,
    type,
  };
}

export const obligationsApi = {
  listTax: async (companyId: string, params: ObligationsQuery = {}): Promise<TaxListResponse> => {
    if (shouldUseObligationsDemo(companyId)) {
      const store = readStore(companyId);
      const filtered = filterTax(store.tax.map(enrichTax), params);
      const items = paginate(filtered, params);

      return {
        status: 'success',
        module: 'tax-obligations',
        model: 'TaxObligation',
        companyId,
        items,
        total: filtered.length,
        limit: Number(params.limit || 100),
        offset: Number(params.offset || 0),
        hasMore: Number(params.offset || 0) + items.length < filtered.length,
        summary: taxSummary(filtered),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<TaxListResponse>(
      `/obligations/enterprise/tax/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  listFiscal: async (
    companyId: string,
    params: ObligationsQuery = {},
  ): Promise<FiscalListResponse> => {
    if (shouldUseObligationsDemo(companyId)) {
      const store = readStore(companyId);
      const filtered = filterFiscal(store.fiscal.map(enrichFiscal), params);
      const items = paginate(filtered, params);

      return {
        status: 'success',
        module: 'fiscal-obligations',
        model: 'FiscalObligation',
        companyId,
        items,
        total: filtered.length,
        limit: Number(params.limit || 100),
        offset: Number(params.offset || 0),
        hasMore: Number(params.offset || 0) + items.length < filtered.length,
        summary: fiscalSummary(filtered),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<FiscalListResponse>(
      `/obligations/enterprise/fiscal/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createTax: async (
    companyId: string,
    payload: CreateTaxPayload,
  ): Promise<ObligationActionResponse<TaxObligationRecord>> => {
    if (shouldUseObligationsDemo(companyId)) {
      const store = readStore(companyId);
      const item = enrichTax({
        id: `demo-tax-${Date.now()}`,
        companyId,
        name: payload.name,
        dueDate: payload.dueDate,
        amount: roundMoney(payload.amount),
        status: payload.status || 'PENDING',
        fileUrl: payload.fileUrl || null,
        createdAt: nowIso(),
      });

      store.tax.unshift(item);
      appendAudit(
        store,
        companyId,
        'tax-obligations',
        'DEMO_TAX_OBLIGATION_CREATED',
        'TaxObligation',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Obrigação tributária criada na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (shouldUseObligationsDemo(companyId)) {
      const store = readStore(companyId);
      const item = enrichFiscal({
        id: `demo-fiscal-${Date.now()}`,
        companyId,
        type: payload.type,
        referenceMonth: payload.referenceMonth,
        referenceYear: payload.referenceYear,
        dueDate: payload.dueDate,
        status: payload.status || 'PENDING',
        fileUrl: payload.fileUrl || null,
        fileHash: payload.fileHash || null,
        submittedAt: payload.submittedAt || null,
        receiptCode: payload.receiptCode || null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });

      store.fiscal.unshift(item);
      appendAudit(
        store,
        companyId,
        'fiscal-obligations',
        'DEMO_FISCAL_OBLIGATION_CREATED',
        'FiscalObligation',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Obrigação fiscal criada na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (shouldUseObligationsDemo(companyId)) {
      const store = readStore(companyId);
      const index = store.tax.findIndex((item) => item.id === obligationId);
      const current = store.tax[index];

      if (!current) throw new Error(`Obrigação tributária demo não encontrada: ${obligationId}`);

      const item = enrichTax({
        ...current,
        ...payload,
        amount: payload.amount === undefined ? current.amount : roundMoney(payload.amount),
      });
      store.tax[index] = item;
      appendAudit(
        store,
        companyId,
        'tax-obligations',
        'DEMO_TAX_OBLIGATION_UPDATED',
        'TaxObligation',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Obrigação tributária atualizada na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (shouldUseObligationsDemo(companyId)) {
      const store = readStore(companyId);
      const index = store.fiscal.findIndex((item) => item.id === obligationId);
      const current = store.fiscal[index];

      if (!current) throw new Error(`Obrigação fiscal demo não encontrada: ${obligationId}`);

      const item = enrichFiscal({
        ...current,
        ...payload,
        updatedAt: nowIso(),
      });
      store.fiscal[index] = item;
      appendAudit(
        store,
        companyId,
        'fiscal-obligations',
        'DEMO_FISCAL_OBLIGATION_UPDATED',
        'FiscalObligation',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Obrigação fiscal atualizada na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (shouldUseObligationsDemo(companyId)) {
      return obligationsApi.updateTax(companyId, obligationId, { status: 'PAID' });
    }

    const response = await api.post<ObligationActionResponse<TaxObligationRecord>>(
      `/obligations/enterprise/tax/${companyId}/${obligationId}/pay`,
    );

    return response.data;
  },

  cancelTax: async (
    companyId: string,
    obligationId: string,
  ): Promise<ObligationActionResponse<TaxObligationRecord>> => {
    if (shouldUseObligationsDemo(companyId)) {
      return obligationsApi.updateTax(companyId, obligationId, { status: 'CANCELLED' });
    }

    const response = await api.post<ObligationActionResponse<TaxObligationRecord>>(
      `/obligations/enterprise/tax/${companyId}/${obligationId}/cancel`,
    );

    return response.data;
  },

  registerTaxEvidence: async (
    companyId: string,
    obligationId: string,
    payload: RegisterTaxEvidencePayload,
  ): Promise<TaxEvidenceResponse> => {
    if (shouldUseObligationsDemo(companyId)) {
      const store = readStore(companyId);
      const index = store.tax.findIndex((item) => item.id === obligationId);
      const current = store.tax[index];

      if (!current) throw new Error(`Obrigação tributária demo não encontrada: ${obligationId}`);

      const integrityHash = `DEMO-${obligationId}-${payload.receiptCode}`.toUpperCase();
      const item = enrichTax({
        ...current,
        fileUrl: payload.fileUrl,
        status: 'PAID',
      });
      const evidence = {
        obligationId,
        companyId,
        fileUrl: payload.fileUrl,
        receiptCode: payload.receiptCode,
        notes: payload.notes || null,
        source: 'GOVERNMENT_PORTAL' as const,
        recordedBy: 'demo-user',
        recordedAt: nowIso(),
        integrityHash,
      };

      store.tax[index] = item;
      appendAudit(
        store,
        companyId,
        'tax-obligations',
        'TAX_OBLIGATION_OFFICIAL_EVIDENCE_REGISTERED',
        'TaxObligation',
        item.id,
        { evidence },
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Evidência oficial registrada na sessão demo.',
        companyId,
        item,
        evidence,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

    const response = await api.post<TaxEvidenceResponse>(
      `/obligations/enterprise/tax/${companyId}/${obligationId}/evidence`,
      payload,
    );

    return response.data;
  },

  submitFiscal: async (
    companyId: string,
    obligationId: string,
    payload: SubmitFiscalPayload = {},
  ): Promise<ObligationActionResponse<FiscalObligationRecord>> => {
    if (shouldUseObligationsDemo(companyId)) {
      return obligationsApi.updateFiscal(companyId, obligationId, {
        status: 'SUBMITTED',
        submittedAt: payload.submittedAt || nowIso(),
        fileHash: payload.fileHash || `DEMO-HASH-${Date.now()}`,
        receiptCode: payload.receiptCode || `REC-DEMO-${Date.now()}`,
      });
    }

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
    if (shouldUseObligationsDemo(companyId)) {
      return obligationsApi.updateFiscal(companyId, obligationId, { status: 'ACCEPTED' });
    }

    const response = await api.post<ObligationActionResponse<FiscalObligationRecord>>(
      `/obligations/enterprise/fiscal/${companyId}/${obligationId}/accept`,
    );

    return response.data;
  },

  rejectFiscal: async (
    companyId: string,
    obligationId: string,
  ): Promise<ObligationActionResponse<FiscalObligationRecord>> => {
    if (shouldUseObligationsDemo(companyId)) {
      return obligationsApi.updateFiscal(companyId, obligationId, { status: 'REJECTED' });
    }

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
    if (shouldUseObligationsDemo(companyId)) {
      const store = readStore(companyId);
      const limit = Number(params.limit || 20);
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
        limit: 20,
        module,
        ...params,
      })}`,
    );

    return response.data;
  },
};

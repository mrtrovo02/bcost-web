'use strict';

import { api, isDemoSession } from '@/services/api';
import { isDemoEntityId, isOperationalDemoFallbackEnabled } from '@/lib/config/demo-policy';

export type CertificateStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export type CertificateOperationalStatus =
  | 'VALID'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'REVOKED'
  | string;

export type DigitalCertificateRecord = {
  id: string;
  companyId: string;
  issuer: string;
  thumbprint?: string | null;
  serialNumber?: string | null;
  validFrom: string;
  validTo: string;
  status: CertificateStatus;
  createdAt?: string | null;
  operationalStatus?: CertificateOperationalStatus;
  daysToExpire?: number | null;
  expired?: boolean;
  expiringSoon?: boolean;
  revoked?: boolean;
  [key: string]: unknown;
};

export type DigitalCertificateSummary = {
  count: number;
  active: number;
  expired: number;
  revoked: number;
  expiringSoon: number;
  valid: number;
  nextExpiration?: {
    id: string;
    issuer: string;
    validTo: string;
    daysToExpire: number | null;
  } | null;
  status: Record<string, number>;
};

export type DigitalCertificatesListResponse = {
  status: string;
  module: string;
  model: string;
  companyId: string;
  items: DigitalCertificateRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: DigitalCertificateSummary;
  generatedAt: string;
};

export type DigitalCertificateDetailResponse = {
  status: string;
  module: string;
  model: string;
  companyId: string;
  item: DigitalCertificateRecord;
  generatedAt: string;
};

export type DigitalCertificateActionResponse = {
  status: string;
  message: string;
  companyId: string;
  item?: DigitalCertificateRecord;
  deletedId?: string;
  audit?: {
    recorded: boolean;
    error?: string;
  };
  generatedAt: string;
};

export type CreateDigitalCertificatePayload = {
  issuer: string;
  thumbprint?: string;
  serialNumber?: string;
  validFrom: string;
  validTo: string;
  status?: CertificateStatus;
};

export type UpdateDigitalCertificatePayload = Partial<CreateDigitalCertificatePayload>;

export type DigitalCertificatesQuery = {
  limit?: number;
  offset?: number;
  status?: CertificateStatus | 'ALL';
  search?: string;
  expiringInDays?: number;
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

type DemoCertificatesStore = {
  certificates: DigitalCertificateRecord[];
  audits: AuditLogRecord[];
};

const DEMO_STORE_VERSION = 'v1';

function isDemoCompany(companyId: string): boolean {
  return isDemoEntityId(companyId) || (isDemoSession() && isOperationalDemoFallbackEnabled());
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
  return date.toISOString();
}

function daysUntil(value: string): number {
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function enrichCertificate(record: DigitalCertificateRecord): DigitalCertificateRecord {
  const daysToExpire = daysUntil(record.validTo);
  const revoked = record.status === 'REVOKED';
  const expired = record.status === 'EXPIRED' || daysToExpire < 0;
  const expiringSoon = !revoked && !expired && daysToExpire <= 30;
  const operationalStatus: CertificateOperationalStatus = revoked
    ? 'REVOKED'
    : expired
      ? 'EXPIRED'
      : expiringSoon
        ? 'EXPIRING_SOON'
        : 'VALID';

  return {
    ...record,
    daysToExpire,
    revoked,
    expired,
    expiringSoon,
    operationalStatus,
  };
}

function storeKey(companyId: string): string {
  return `bcost:${DEMO_STORE_VERSION}:digital-certificates:${companyId}`;
}

function makeDemoStore(companyId: string): DemoCertificatesStore {
  return {
    certificates: [
      enrichCertificate({
        id: 'demo-certificate-001',
        companyId,
        issuer: 'AC Certisign RFB G5 - e-CNPJ',
        thumbprint: 'A1B2C3D4E5F6',
        serialNumber: 'CERT-2026-0001',
        validFrom: addDays(-300),
        validTo: addDays(24),
        status: 'ACTIVE',
        createdAt: addDays(-300),
      }),
      enrichCertificate({
        id: 'demo-certificate-002',
        companyId,
        issuer: 'AC SERASA RFB - e-CPF responsável',
        thumbprint: 'F6E5D4C3B2A1',
        serialNumber: 'CERT-2026-0002',
        validFrom: addDays(-120),
        validTo: addDays(220),
        status: 'ACTIVE',
        createdAt: addDays(-120),
      }),
      enrichCertificate({
        id: 'demo-certificate-003',
        companyId,
        issuer: 'AC Demo Revogado',
        thumbprint: '0000REVOKED',
        serialNumber: 'CERT-2025-0003',
        validFrom: addDays(-420),
        validTo: addDays(80),
        status: 'REVOKED',
        createdAt: addDays(-420),
      }),
    ],
    audits: [],
  };
}

function readStore(companyId: string): DemoCertificatesStore {
  const fallback = makeDemoStore(companyId);
  if (!isBrowserRuntime()) return fallback;

  const raw = window.localStorage.getItem(storeKey(companyId));
  if (!raw) {
    writeStore(companyId, fallback);
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as DemoCertificatesStore;
    return {
      certificates: Array.isArray(parsed.certificates)
        ? parsed.certificates.map(enrichCertificate)
        : fallback.certificates,
      audits: Array.isArray(parsed.audits) ? parsed.audits : [],
    };
  } catch {
    window.localStorage.removeItem(storeKey(companyId));
    writeStore(companyId, fallback);
    return fallback;
  }
}

function writeStore(companyId: string, store: DemoCertificatesStore): void {
  if (!isBrowserRuntime()) return;
  window.localStorage.setItem(storeKey(companyId), JSON.stringify(store));
}

function appendAudit(
  store: DemoCertificatesStore,
  companyId: string,
  action: string,
  entityId: string,
  payload?: unknown,
): void {
  store.audits.unshift({
    id: `demo-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    companyId,
    module: 'digital-certificates',
    action,
    entity: 'DigitalCertificate',
    entityId,
    payload,
    createdAt: nowIso(),
  });
  store.audits = store.audits.slice(0, 50);
}

function summarize(items: DigitalCertificateRecord[]): DigitalCertificateSummary {
  const status = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
  const active = items.filter((item) => item.status === 'ACTIVE');
  const nextExpiration = active
    .filter((item) => typeof item.daysToExpire === 'number' && Number(item.daysToExpire) >= 0)
    .sort((a, b) => Number(a.daysToExpire) - Number(b.daysToExpire))[0];

  return {
    count: items.length,
    active: active.length,
    expired: items.filter((item) => item.expired).length,
    revoked: items.filter((item) => item.revoked).length,
    expiringSoon: items.filter((item) => item.expiringSoon).length,
    valid: items.filter((item) => item.operationalStatus === 'VALID').length,
    nextExpiration: nextExpiration
      ? {
          id: nextExpiration.id,
          issuer: nextExpiration.issuer,
          validTo: nextExpiration.validTo,
          daysToExpire: nextExpiration.daysToExpire ?? null,
        }
      : null,
    status,
  };
}

function filterCertificates(
  items: DigitalCertificateRecord[],
  params: DigitalCertificatesQuery,
): DigitalCertificateRecord[] {
  const term = params.search?.trim().toLowerCase();
  return items.filter((item) => {
    if (params.status && params.status !== 'ALL' && item.status !== params.status) return false;
    if (typeof params.expiringInDays === 'number') {
      const days = Number(item.daysToExpire ?? 999999);
      if (days < 0 || days > params.expiringInDays) return false;
    }
    if (!term) return true;
    return `${item.issuer} ${item.thumbprint || ''} ${item.serialNumber || ''}`
      .toLowerCase()
      .includes(term);
  });
}

function pageItems<T>(items: T[], params: DigitalCertificatesQuery): T[] {
  const offset = params.offset ?? 0;
  const limit = params.limit ?? 100;
  return items.slice(offset, offset + limit);
}

function actionResponse(
  companyId: string,
  message: string,
  item?: DigitalCertificateRecord,
  deletedId?: string,
): DigitalCertificateActionResponse {
  return {
    status: 'OK_DEMO',
    message,
    companyId,
    item,
    deletedId,
    audit: { recorded: true },
    generatedAt: nowIso(),
  };
}

export const digitalCertificatesApi = {
  list: async (
    companyId: string,
    params: DigitalCertificatesQuery = {},
  ): Promise<DigitalCertificatesListResponse> => {
    const query = buildQuery(params);

    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const filtered = filterCertificates(store.certificates, params);
      const items = pageItems(filtered, params);
      return {
        status: 'OK_DEMO',
        module: 'digital-certificates',
        model: 'DigitalCertificate',
        companyId,
        items,
        total: filtered.length,
        limit: params.limit ?? 100,
        offset: params.offset ?? 0,
        hasMore: (params.offset ?? 0) + (params.limit ?? 100) < filtered.length,
        summary: summarize(filtered),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<DigitalCertificatesListResponse>(
      `/digital-certificates/enterprise/${companyId}${query}`,
    );

    return response.data;
  },

  summary: async (
    companyId: string,
  ): Promise<{
    status: string;
    module: string;
    model: string;
    companyId: string;
    summary: DigitalCertificateSummary;
    generatedAt: string;
  }> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      return {
        status: 'OK_DEMO',
        module: 'digital-certificates',
        model: 'DigitalCertificate',
        companyId,
        summary: summarize(store.certificates),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get(`/digital-certificates/enterprise/${companyId}/summary`);

    return response.data;
  },

  detail: async (
    companyId: string,
    certificateId: string,
  ): Promise<DigitalCertificateDetailResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const item = store.certificates.find((certificate) => certificate.id === certificateId);
      if (!item) throw new Error(`Certificado demo não encontrado: ${certificateId}`);
      return {
        status: 'OK_DEMO',
        module: 'digital-certificates',
        model: 'DigitalCertificate',
        companyId,
        item,
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<DigitalCertificateDetailResponse>(
      `/digital-certificates/enterprise/${companyId}/${certificateId}`,
    );

    return response.data;
  },

  create: async (
    companyId: string,
    payload: CreateDigitalCertificatePayload,
  ): Promise<DigitalCertificateActionResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const item = enrichCertificate({
        id: `demo-certificate-${Date.now()}`,
        companyId,
        issuer: payload.issuer,
        thumbprint: payload.thumbprint,
        serialNumber: payload.serialNumber,
        validFrom: payload.validFrom,
        validTo: payload.validTo,
        status: payload.status ?? 'ACTIVE',
        createdAt: nowIso(),
      });
      store.certificates.unshift(item);
      appendAudit(store, companyId, 'create', item.id, payload);
      writeStore(companyId, store);
      return actionResponse(companyId, 'Certificado demo criado.', item);
    }

    const response = await api.post<DigitalCertificateActionResponse>(
      `/digital-certificates/enterprise/${companyId}`,
      payload,
    );

    return response.data;
  },

  update: async (
    companyId: string,
    certificateId: string,
    payload: UpdateDigitalCertificatePayload,
  ): Promise<DigitalCertificateActionResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const current = store.certificates.find((item) => item.id === certificateId);
      if (!current) throw new Error(`Certificado demo não encontrado: ${certificateId}`);
      const updated = enrichCertificate({ ...current, ...payload });
      store.certificates = store.certificates.map((item) =>
        item.id === certificateId ? updated : item,
      );
      appendAudit(store, companyId, 'update', certificateId, payload);
      writeStore(companyId, store);
      return actionResponse(companyId, 'Certificado demo atualizado.', updated);
    }

    const response = await api.patch<DigitalCertificateActionResponse>(
      `/digital-certificates/enterprise/${companyId}/${certificateId}`,
      payload,
    );

    return response.data;
  },

  revoke: async (
    companyId: string,
    certificateId: string,
  ): Promise<DigitalCertificateActionResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const current = store.certificates.find((item) => item.id === certificateId);
      if (!current) throw new Error(`Certificado demo não encontrado: ${certificateId}`);
      const updated = enrichCertificate({ ...current, status: 'REVOKED' });
      store.certificates = store.certificates.map((item) =>
        item.id === certificateId ? updated : item,
      );
      appendAudit(store, companyId, 'revoke', certificateId, { status: 'REVOKED' });
      writeStore(companyId, store);
      return actionResponse(companyId, 'Certificado demo revogado.', updated);
    }

    const response = await api.post<DigitalCertificateActionResponse>(
      `/digital-certificates/enterprise/${companyId}/${certificateId}/revoke`,
    );

    return response.data;
  },

  remove: async (
    companyId: string,
    certificateId: string,
  ): Promise<DigitalCertificateActionResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const exists = store.certificates.some((item) => item.id === certificateId);
      if (!exists) throw new Error(`Certificado demo não encontrado: ${certificateId}`);
      store.certificates = store.certificates.filter((item) => item.id !== certificateId);
      appendAudit(store, companyId, 'delete', certificateId);
      writeStore(companyId, store);
      return actionResponse(companyId, 'Certificado demo removido.', undefined, certificateId);
    }

    const response = await api.delete<DigitalCertificateActionResponse>(
      `/digital-certificates/enterprise/${companyId}/${certificateId}`,
    );

    return response.data;
  },

  audit: async (
    companyId: string,
    params: Record<string, unknown> = {},
  ): Promise<AuditLogListResponse> => {
    const query = buildQuery({
      limit: 10,
      module: 'digital-certificates',
      ...params,
    });

    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      return {
        items: store.audits.slice(0, Number(params.limit || 10)),
        total: store.audits.length,
        limit: Number(params.limit || 10),
        offset: 0,
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<AuditLogListResponse>(`/audit/${companyId}${query}`);

    return response.data;
  },
};

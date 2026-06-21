'use strict';

import { api } from '@/services/api';

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

export const digitalCertificatesApi = {
  list: async (
    companyId: string,
    params: DigitalCertificatesQuery = {},
  ): Promise<DigitalCertificatesListResponse> => {
    const query = buildQuery(params);

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
    const response = await api.get(`/digital-certificates/enterprise/${companyId}/summary`);

    return response.data;
  },

  detail: async (
    companyId: string,
    certificateId: string,
  ): Promise<DigitalCertificateDetailResponse> => {
    const response = await api.get<DigitalCertificateDetailResponse>(
      `/digital-certificates/enterprise/${companyId}/${certificateId}`,
    );

    return response.data;
  },

  create: async (
    companyId: string,
    payload: CreateDigitalCertificatePayload,
  ): Promise<DigitalCertificateActionResponse> => {
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
    const response = await api.post<DigitalCertificateActionResponse>(
      `/digital-certificates/enterprise/${companyId}/${certificateId}/revoke`,
    );

    return response.data;
  },

  remove: async (
    companyId: string,
    certificateId: string,
  ): Promise<DigitalCertificateActionResponse> => {
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

    const response = await api.get<AuditLogListResponse>(`/audit/${companyId}${query}`);

    return response.data;
  },
};

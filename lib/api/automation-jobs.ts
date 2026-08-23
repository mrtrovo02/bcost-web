'use strict';

import { api } from '@/services/api';
import {
  assertOperationalDemoFallbackEnabled,
  isDemoEntityId,
  isOperationalDemoFallbackEnabled,
} from '@/lib/config/demo-policy';
import { createDemoEnterpriseResponse } from './enterprise-demo';

export type AutomationJobStatus =
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'QUEUED'
  | 'PENDING'
  | 'CANCELLED'
  | 'CANCELED'
  | string;

export type AutomationJobRecord = {
  id: string;
  companyId: string;
  name?: string | null;
  type?: string | null;
  status?: AutomationJobStatus | null;
  progress?: number | null;
  payload?: unknown;
  result?: unknown;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type AutomationJobsQuery = {
  limit?: number;
  offset?: number;
  status?: string;
  type?: string;
  search?: string;
  from?: string;
  to?: string;
};

export type AutomationJobsListResponse = {
  status: string;
  module: string;
  model: string;
  companyId: string;
  items: AutomationJobRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: Record<string, unknown>;
  generatedAt: string;
};

export type AutomationJobDetailResponse = {
  status: string;
  module: string;
  model: string;
  companyId: string;
  job: AutomationJobRecord;
  generatedAt: string;
};

export type AutomationJobActionResponse = {
  status: 'OK' | 'OK_WITH_WARNING' | string;
  action: 'retry' | 'cancel' | 'acknowledge' | string;
  jobId: string;
  companyId: string;
  applied: boolean;
  message: string;
  job: AutomationJobRecord;
  execution?: unknown;
  audit?: {
    recorded: boolean;
    error?: string;
  };
  generatedAt: string;
};

export type AuditLogRecord = {
  id: string;
  companyId: string;
  userId?: string | null;
  module?: string | null;
  action?: string | null;
  entity?: string | null;
  entityId?: string | null;
  severity?: string | null;
  source?: string | null;
  statusCode?: number | null;
  metadata?: unknown;
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

function demoAutomationResponse(companyId: string, params: AutomationJobsQuery = {}) {
  assertOperationalDemoFallbackEnabled(
    'Automacoes indisponiveis e fallback demonstrativo desabilitado neste ambiente.',
  );

  const demo = createDemoEnterpriseResponse('automation-jobs', companyId, params);

  return {
    status: demo.status,
    module: 'automation-jobs',
    model: 'AutomationJob',
    companyId,
    items: demo.items as AutomationJobRecord[],
    total: demo.total,
    limit: demo.limit,
    offset: demo.offset,
    hasMore: demo.hasMore,
    summary: demo.summary,
    generatedAt: demo.generatedAt,
  } satisfies AutomationJobsListResponse;
}

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

export const automationJobsApi = {
  list: async (
    companyId: string,
    params: AutomationJobsQuery = {},
  ): Promise<AutomationJobsListResponse> => {
    const query = buildQuery(params);

    if (isDemoEntityId(companyId) && isOperationalDemoFallbackEnabled()) {
      return demoAutomationResponse(companyId, params);
    }

    try {
      const response = await api.get<AutomationJobsListResponse>(
        `/automation/jobs/${companyId}${query}`,
      );

      return response.data;
    } catch (error) {
      if (isDemoEntityId(companyId)) {
        return demoAutomationResponse(companyId, params);
      }

      throw error;
    }
  },

  detail: async (companyId: string, jobId: string): Promise<AutomationJobDetailResponse> => {
    if (isDemoEntityId(companyId) && isOperationalDemoFallbackEnabled()) {
      const demo = demoAutomationResponse(companyId);
      const job = demo.items.find((item) => item.id === jobId) || demo.items[0];

      return {
        status: 'OK_DEMO',
        module: 'automation-jobs',
        model: 'AutomationJob',
        companyId,
        job,
        generatedAt: new Date().toISOString(),
      };
    }

    try {
      const response = await api.get<AutomationJobDetailResponse>(
        `/automation/jobs/${companyId}/${jobId}`,
      );

      return response.data;
    } catch (error) {
      if (!isDemoEntityId(companyId)) {
        throw error;
      }

      const demo = demoAutomationResponse(companyId);
      const job = demo.items.find((item) => item.id === jobId) || demo.items[0];

      return {
        status: 'OK_DEMO',
        module: 'automation-jobs',
        model: 'AutomationJob',
        companyId,
        job,
        generatedAt: new Date().toISOString(),
      };
    }
  },

  retry: async (jobId: string): Promise<AutomationJobActionResponse> => {
    const response = await api.post<AutomationJobActionResponse>(`/automation/jobs/${jobId}/retry`);

    return response.data;
  },

  cancel: async (jobId: string): Promise<AutomationJobActionResponse> => {
    const response = await api.post<AutomationJobActionResponse>(
      `/automation/jobs/${jobId}/cancel`,
    );

    return response.data;
  },

  acknowledge: async (jobId: string): Promise<AutomationJobActionResponse> => {
    const response = await api.post<AutomationJobActionResponse>(
      `/automation/jobs/${jobId}/acknowledge`,
    );

    return response.data;
  },

  audit: async (
    companyId: string,
    params: Record<string, unknown> = {},
  ): Promise<AuditLogListResponse> => {
    const query = buildQuery({
      limit: 10,
      module: 'automation',
      ...params,
    });

    try {
      const response = await api.get<AuditLogListResponse>(`/audit/${companyId}${query}`);

      return response.data;
    } catch {
      return {
        items: [],
        total: 0,
        limit: Number(params.limit || 10),
        offset: 0,
        generatedAt: new Date().toISOString(),
      };
    }
  },
};

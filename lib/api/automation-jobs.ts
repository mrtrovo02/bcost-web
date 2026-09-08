'use strict';

import { api, isDemoSession } from '@/services/api';
import { assertOperationalDemoFallbackEnabled, isDemoEntityId } from '@/lib/config/demo-policy';
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
  const demo = createDemoEnterpriseResponse('automation-jobs', companyId, params);
  const items =
    demo.items.length > 0
      ? (demo.items as AutomationJobRecord[])
      : createLocalDemoAutomationJobs(companyId);

  return {
    status: demo.status,
    module: 'automation-jobs',
    model: 'AutomationJob',
    companyId,
    items,
    total: items.length,
    limit: demo.limit,
    offset: demo.offset,
    hasMore: demo.hasMore && demo.items.length > 0,
    summary: demo.summary,
    generatedAt: demo.generatedAt,
  } satisfies AutomationJobsListResponse;
}

function createLocalDemoAutomationJobs(companyId: string): AutomationJobRecord[] {
  const generatedAt = new Date().toISOString();

  return [
    {
      id: 'job-001',
      companyId,
      name: 'Importacao XML e classificacao fiscal',
      type: 'XML_IMPORT',
      status: 'COMPLETED',
      progress: 100,
      result: { imported: 128, classified: 126, pendingReview: 2 },
      createdAt: generatedAt,
      updatedAt: generatedAt,
    },
    {
      id: 'job-002',
      companyId,
      name: 'Conciliacao bancaria assistida',
      type: 'BANK_RECONCILIATION',
      status: 'RUNNING',
      progress: 72,
      result: { matched: 84, pending: 19 },
      createdAt: generatedAt,
      updatedAt: generatedAt,
    },
    {
      id: 'job-003',
      companyId,
      name: 'Agenda de obrigacoes fiscais',
      type: 'COMPLIANCE_CALENDAR',
      status: 'QUEUED',
      progress: 0,
      result: null,
      createdAt: generatedAt,
      updatedAt: generatedAt,
    },
  ];
}

function shouldUseAutomationDemo(companyId: string): boolean {
  if (!isDemoEntityId(companyId)) return false;

  const message =
    'Automacoes demonstrativas indisponiveis e fallback demonstrativo desabilitado neste ambiente.';

  if (!isDemoSession()) {
    throw new Error(message);
  }

  assertOperationalDemoFallbackEnabled(message);

  return true;
}

function isDemoAutomationJobId(jobId: string): boolean {
  return /^job-\d{3}$/i.test(jobId);
}

function makeDemoActionResponse(
  companyId: string,
  action: AutomationJobActionResponse['action'],
  jobId: string,
): AutomationJobActionResponse {
  const demo = demoAutomationResponse(companyId);
  const fallbackJob = demo.items.find((item) => item.id === jobId) || demo.items[0];
  const generatedAt = new Date().toISOString();
  const statusByAction: Record<string, AutomationJobStatus> = {
    retry: 'QUEUED',
    cancel: 'CANCELLED',
    acknowledge: 'COMPLETED',
  };
  const job: AutomationJobRecord = {
    ...fallbackJob,
    status: statusByAction[action] ?? fallbackJob.status,
    updatedAt: generatedAt,
    result:
      action === 'retry'
        ? { status: 'QUEUED', message: 'Job demo reenfileirado para processamento.' }
        : fallbackJob.result,
  };

  return {
    status: 'OK',
    action,
    jobId,
    companyId,
    applied: true,
    message:
      action === 'retry'
        ? 'Job demo reenfileirado com sucesso.'
        : action === 'cancel'
          ? 'Job demo cancelado com sucesso.'
          : 'Job demo reconhecido com sucesso.',
    job,
    audit: {
      recorded: true,
    },
    generatedAt,
  };
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

    if (shouldUseAutomationDemo(companyId)) {
      return demoAutomationResponse(companyId, params);
    }

    const response = await api.get<AutomationJobsListResponse>(
      `/automation/jobs/${companyId}${query}`,
    );

    return response.data;
  },

  detail: async (companyId: string, jobId: string): Promise<AutomationJobDetailResponse> => {
    if (shouldUseAutomationDemo(companyId)) {
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

    const response = await api.get<AutomationJobDetailResponse>(
      `/automation/jobs/${companyId}/${jobId}`,
    );

    return response.data;
  },

  retry: async (companyId: string, jobId: string): Promise<AutomationJobActionResponse> => {
    if (shouldUseAutomationDemo(companyId) && isDemoAutomationJobId(jobId)) {
      return makeDemoActionResponse(companyId, 'retry', jobId);
    }

    const response = await api.post<AutomationJobActionResponse>(`/automation/jobs/${jobId}/retry`);

    return response.data;
  },

  cancel: async (companyId: string, jobId: string): Promise<AutomationJobActionResponse> => {
    if (shouldUseAutomationDemo(companyId) && isDemoAutomationJobId(jobId)) {
      return makeDemoActionResponse(companyId, 'cancel', jobId);
    }

    const response = await api.post<AutomationJobActionResponse>(
      `/automation/jobs/${jobId}/cancel`,
    );

    return response.data;
  },

  acknowledge: async (companyId: string, jobId: string): Promise<AutomationJobActionResponse> => {
    if (shouldUseAutomationDemo(companyId) && isDemoAutomationJobId(jobId)) {
      return makeDemoActionResponse(companyId, 'acknowledge', jobId);
    }

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

    if (shouldUseAutomationDemo(companyId)) {
      return {
        items: [],
        total: 0,
        limit: Number(params.limit || 10),
        offset: 0,
        generatedAt: new Date().toISOString(),
      };
    }

    const response = await api.get<AuditLogListResponse>(`/audit/${companyId}${query}`);

    return response.data;
  },
};

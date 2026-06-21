'use strict';

import { api } from '@/services/api';

export type ComplianceSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type ComplianceStatus = 'OPEN' | 'RESOLVED' | 'IGNORED' | 'IN_PROGRESS';

export type BusinessRuleEnterpriseRecord = {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  enabled: boolean;
  lastTriggeredAt?: string | null;
  triggerCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  operationalStatus?: 'ENABLED' | 'DISABLED' | string;
  [key: string]: unknown;
};

export type ComplianceCheckEnterpriseRecord = {
  id: string;
  companyId: string;
  checkName: string;
  severity: ComplianceSeverity;
  status: ComplianceStatus;
  description?: string | null;
  resolved: boolean;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  operationalStatus?: string;
  [key: string]: unknown;
};

export type BusinessRulesSummary = {
  count: number;
  enabled: number;
  disabled: number;
  totalTriggerCount: number;
};

export type ComplianceChecksSummary = {
  count: number;
  open: number;
  resolved: number;
  ignored: number;
  inProgress: number;
  info: number;
  warning: number;
  critical: number;
  riskScore: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
};

export type ComplianceEnterpriseSummaryResponse = {
  status: string;
  module: 'compliance-enterprise-summary';
  companyId: string;
  rules: BusinessRulesSummary;
  checks: ComplianceChecksSummary;
  generatedAt: string;
};

export type BusinessRulesListResponse = {
  status: string;
  module: 'business-rules';
  model: 'BusinessRule';
  companyId: string;
  items: BusinessRuleEnterpriseRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: BusinessRulesSummary;
  generatedAt: string;
};

export type ComplianceChecksListResponse = {
  status: string;
  module: 'compliance-checks';
  model: 'ComplianceCheck';
  companyId: string;
  items: ComplianceCheckEnterpriseRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: ComplianceChecksSummary;
  generatedAt: string;
};

export type CreateBusinessRulePayload = {
  name: string;
  description?: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  enabled?: boolean;
};

export type UpdateBusinessRulePayload = Partial<CreateBusinessRulePayload>;

export type CreateComplianceCheckPayload = {
  checkName: string;
  severity?: ComplianceSeverity;
  status?: ComplianceStatus;
  description?: string;
};

export type UpdateComplianceCheckPayload = {
  severity?: ComplianceSeverity;
  status?: ComplianceStatus;
  description?: string;
};

export type RunComplianceEnginePayload = {
  createChecks?: boolean;
  includeResolved?: boolean;
  resolveStaleEngineChecks?: boolean;
};

export type ComplianceActionResponse<T> = {
  status: string;
  message: string;
  companyId: string;
  item?: T;
  created?: T[];
  skipped?: T[];
  findings?: Array<Record<string, unknown>>;
  totals?: Record<string, unknown>;
  summary?: ComplianceChecksSummary;
  audit?: {
    recorded: boolean;
    error?: string;
  };
  generatedAt: string;
};

export type ComplianceQuery = {
  limit?: number;
  offset?: number;
  search?: string;
  severity?: ComplianceSeverity | 'ALL';
  status?: ComplianceStatus | 'ALL';
  resolved?: string;
  enabled?: string;
  source?: string;
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

export const complianceEnterpriseApi = {
  summary: async (companyId: string): Promise<ComplianceEnterpriseSummaryResponse> => {
    const response = await api.get<ComplianceEnterpriseSummaryResponse>(
      `/compliance/enterprise/summary/${companyId}`,
    );

    return response.data;
  },

  listRules: async (
    companyId: string,
    params: ComplianceQuery = {},
  ): Promise<BusinessRulesListResponse> => {
    const response = await api.get<BusinessRulesListResponse>(
      `/compliance/enterprise/rules/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createRule: async (
    companyId: string,
    payload: CreateBusinessRulePayload,
  ): Promise<ComplianceActionResponse<BusinessRuleEnterpriseRecord>> => {
    const response = await api.post<ComplianceActionResponse<BusinessRuleEnterpriseRecord>>(
      `/compliance/enterprise/rules/${companyId}`,
      payload,
    );

    return response.data;
  },

  updateRule: async (
    companyId: string,
    ruleId: string,
    payload: UpdateBusinessRulePayload,
  ): Promise<ComplianceActionResponse<BusinessRuleEnterpriseRecord>> => {
    const response = await api.patch<ComplianceActionResponse<BusinessRuleEnterpriseRecord>>(
      `/compliance/enterprise/rules/${companyId}/${ruleId}`,
      payload,
    );

    return response.data;
  },

  enableRule: async (
    companyId: string,
    ruleId: string,
  ): Promise<ComplianceActionResponse<BusinessRuleEnterpriseRecord>> => {
    const response = await api.post<ComplianceActionResponse<BusinessRuleEnterpriseRecord>>(
      `/compliance/enterprise/rules/${companyId}/${ruleId}/enable`,
    );

    return response.data;
  },

  disableRule: async (
    companyId: string,
    ruleId: string,
  ): Promise<ComplianceActionResponse<BusinessRuleEnterpriseRecord>> => {
    const response = await api.post<ComplianceActionResponse<BusinessRuleEnterpriseRecord>>(
      `/compliance/enterprise/rules/${companyId}/${ruleId}/disable`,
    );

    return response.data;
  },

  createDefaultRules: async (
    companyId: string,
  ): Promise<ComplianceActionResponse<BusinessRuleEnterpriseRecord>> => {
    const response = await api.post<ComplianceActionResponse<BusinessRuleEnterpriseRecord>>(
      `/compliance/enterprise/rules/${companyId}/defaults`,
    );

    return response.data;
  },

  listChecks: async (
    companyId: string,
    params: ComplianceQuery = {},
  ): Promise<ComplianceChecksListResponse> => {
    const response = await api.get<ComplianceChecksListResponse>(
      `/compliance/enterprise/checks/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createCheck: async (
    companyId: string,
    payload: CreateComplianceCheckPayload,
  ): Promise<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>> => {
    const response = await api.post<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>>(
      `/compliance/enterprise/checks/${companyId}`,
      payload,
    );

    return response.data;
  },

  updateCheck: async (
    companyId: string,
    checkId: string,
    payload: UpdateComplianceCheckPayload,
  ): Promise<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>> => {
    const response = await api.patch<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>>(
      `/compliance/enterprise/checks/${companyId}/${checkId}`,
      payload,
    );

    return response.data;
  },

  markInProgress: async (
    companyId: string,
    checkId: string,
  ): Promise<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>> => {
    const response = await api.post<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>>(
      `/compliance/enterprise/checks/${companyId}/${checkId}/in-progress`,
    );

    return response.data;
  },

  resolveCheck: async (
    companyId: string,
    checkId: string,
  ): Promise<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>> => {
    const response = await api.post<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>>(
      `/compliance/enterprise/checks/${companyId}/${checkId}/resolve`,
    );

    return response.data;
  },

  ignoreCheck: async (
    companyId: string,
    checkId: string,
  ): Promise<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>> => {
    const response = await api.post<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>>(
      `/compliance/enterprise/checks/${companyId}/${checkId}/ignore`,
    );

    return response.data;
  },

  reopenCheck: async (
    companyId: string,
    checkId: string,
  ): Promise<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>> => {
    const response = await api.post<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>>(
      `/compliance/enterprise/checks/${companyId}/${checkId}/reopen`,
    );

    return response.data;
  },

  runEngine: async (
    companyId: string,
    payload: RunComplianceEnginePayload,
  ): Promise<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>> => {
    const response = await api.post<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>>(
      `/compliance/enterprise/run/${companyId}`,
      payload,
    );

    return response.data;
  },

  audit: async (
    companyId: string,
    module: 'business-rules' | 'compliance-checks' | 'compliance-engine',
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

'use strict';

import { api } from '@/services/api';

export type ExecutiveStatus = 'HEALTHY' | 'ATTENTION' | 'CRITICAL' | 'UNAVAILABLE';

export type ExecutiveRisk = {
  slug: string;
  title: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  scoreImpact: number;
  description: string;
  evidence?: Record<string, unknown>;
};

export type CommandCenterModuleMetric = {
  slug: string;
  label: string;
  prismaKey: string;
  available: boolean;
  total: number;
  active?: number;
  pending?: number;
  critical?: number;
  warning?: number;
  failed?: number;
  open?: number;
  resolved?: number;
  unread?: number;
  riskScore: number;
  status: ExecutiveStatus;
  sample?: unknown[];
  error?: string;
};

export type ExecutiveSummary = {
  executiveScore: number;
  executiveStatus: ExecutiveStatus;
  availableModules: number;
  unavailableModules: number;
  healthyModules: number;
  attentionModules: number;
  criticalModules: number;
  totalRecords: number;
  totalCritical: number;
  totalWarning: number;
  totalFailed: number;
  totalUnread: number;
  topRisks: ExecutiveRisk[];

  auditQualityScore?: number | null;
  auditQualityStatus?: ExecutiveStatus | 'UNAVAILABLE';
  auditActiveSignals?: number;
  auditHistoricalNoise?: number;
  auditServerErrors?: number;
  auditClientErrors?: number;
};

export type CommandCenterCompany = {
  id: string;
  name?: string;
  cnpj?: string;
  taxRegime?: string;
  planLevel?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  settings?: unknown;
  [key: string]: unknown;
};

export type CommandCenterActivityRecord = {
  type: string;
  source: string;
  record: Record<string, unknown>;
};

export type CommandCenterHealth = {
  api: string;
  database: string;
  commandCenter: string;
  generatedAt: string;
};

export type CommandCenterAuditFinding = {
  id: string | null;
  severity: string | null;
  title: string | null;
  count: number;
  evidenceSummary?: {
    byModule?: Array<{ key: string; count: number }>;
    byAction?: Array<{ key: string; count: number }>;
    byEndpoint?: Array<{ key: string; count: number }>;
    latestSummaryCount?: number;
  };
};

export type CommandCenterAuditRecommendation = {
  id: string | null;
  priority: string | null;
  title: string | null;
  action: string | null;
};

export type CommandCenterAuditIntelligence = {
  available: boolean;
  quality: {
    qualityScore: number;
    qualityStatus: ExecutiveStatus | 'UNAVAILABLE';
    recordsAnalyzed: number;
    criticalEvents: number;
    warningEvents: number;
    activeSignals: number;
    historicalNoise: number;
    serverErrors: number;
    clientErrors: number;
  } | null;
  findings: CommandCenterAuditFinding[];
  recommendations: CommandCenterAuditRecommendation[];
  route: string;
  apiBase: string;
  cache?: {
    hit: boolean;
    ttlMs: number;
    key: string;
  } | null;
  performance?: {
    computedInMs?: number;
  } | null;
  error?: string | null;
};

export type CommandCenterSummaryResponse = {
  status: string;
  module: string;
  companyId: string;
  company: CommandCenterCompany;
  requestedBy?: {
    userId?: string | null;
    email?: string | null;
    role?: string | null;
  };
  executiveSummary: ExecutiveSummary;
  modules: CommandCenterModuleMetric[];
  risks: ExecutiveRisk[];
  activity: CommandCenterActivityRecord[];
  audit: Record<string, unknown>[];
  auditIntelligence?: CommandCenterAuditIntelligence;
  health: CommandCenterHealth | null;
  generatedAt: string;
};

export type CommandCenterRisksResponse = {
  status: string;
  module: string;
  companyId: string;
  executiveSummary: ExecutiveSummary;
  risks: ExecutiveRisk[];
  auditIntelligence?: CommandCenterAuditIntelligence;
  generatedAt: string;
};

export type CommandCenterModulesResponse = {
  status: string;
  module: string;
  companyId: string;
  executiveSummary: ExecutiveSummary;
  modules: CommandCenterModuleMetric[];
  generatedAt: string;
};

export type CommandCenterActivityResponse = {
  status: string;
  module: string;
  companyId: string;
  activity: CommandCenterActivityRecord[];
  audit: Record<string, unknown>[];
  generatedAt: string;
};

export type CommandCenterQuery = {
  includeSamples?: boolean;
  includeAudit?: boolean;
  includeHealth?: boolean;
  limit?: number;
};

function buildQuery(params?: CommandCenterQuery): string {
  const search = new URLSearchParams();

  if (params?.includeSamples !== undefined) {
    search.set('includeSamples', String(params.includeSamples));
  }

  if (params?.includeAudit !== undefined) {
    search.set('includeAudit', String(params.includeAudit));
  }

  if (params?.includeHealth !== undefined) {
    search.set('includeHealth', String(params.includeHealth));
  }

  if (params?.limit !== undefined) {
    search.set('limit', String(params.limit));
  }

  const value = search.toString();

  return value ? `?${value}` : '';
}

export const commandCenterEnterpriseApi = {
  summary: async (
    companyId: string,
    query: CommandCenterQuery = {},
  ): Promise<CommandCenterSummaryResponse> => {
    const response = await api.get<CommandCenterSummaryResponse>(
      `/operations/command-center/${companyId}${buildQuery(query)}`,
    );

    return response.data;
  },

  risks: async (
    companyId: string,
    query: CommandCenterQuery = {},
  ): Promise<CommandCenterRisksResponse> => {
    const response = await api.get<CommandCenterRisksResponse>(
      `/operations/command-center/${companyId}/risks${buildQuery(query)}`,
    );

    return response.data;
  },

  modules: async (
    companyId: string,
    query: CommandCenterQuery = {},
  ): Promise<CommandCenterModulesResponse> => {
    const response = await api.get<CommandCenterModulesResponse>(
      `/operations/command-center/${companyId}/modules${buildQuery(query)}`,
    );

    return response.data;
  },

  activity: async (
    companyId: string,
    query: CommandCenterQuery = {},
  ): Promise<CommandCenterActivityResponse> => {
    const response = await api.get<CommandCenterActivityResponse>(
      `/operations/command-center/${companyId}/activity${buildQuery(query)}`,
    );

    return response.data;
  },
};

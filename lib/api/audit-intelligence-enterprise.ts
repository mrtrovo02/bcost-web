'use strict';

import { api } from '@/services/api';

export type AuditQualityStatus = 'HEALTHY' | 'ATTENTION' | 'CRITICAL';

export type AuditFindingSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AuditRecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AuditQuality = {
  qualityScore: number;
  qualityStatus: AuditQualityStatus;
  recordsAnalyzed: number;
  criticalEvents: number;
  warningEvents: number;
  activeSignals: number;
  historicalNoise: number;
  serverErrors: number;
  clientErrors: number;
};

export type AuditTotals = {
  records: number;
  statusBuckets: Record<string, number>;
  severityBuckets: Record<string, number>;
  modules: number;
  actions: number;
  endpoints: number;
};

export type AuditBreakdownItem = {
  key: string;
  count: number;
};

export type AuditEvidenceSummary = {
  byModule: AuditBreakdownItem[];
  byAction: AuditBreakdownItem[];
  byEndpoint: AuditBreakdownItem[];
  latestSummary: Array<{
    id: string | null;
    action: string | null;
    module: string | null;
    entity: string | null;
    statusCode: number | null;
    path: string | null;
    method: string | null;
    createdAt: string | null;
  }>;
  totalLatestReturned: number;
};

export type AuditExecutiveFinding = {
  id: string;
  severity: AuditFindingSeverity;
  title: string;
  description: string;
  count: number;
  module: string | null;
  action: string | null;
  evidenceSummary: AuditEvidenceSummary;
};

export type AuditRecommendation = {
  id: string;
  priority: AuditRecommendationPriority;
  title: string;
  description: string;
  action: string;
};

export type AuditSupportingSignals = {
  notifications: {
    total: number;
    critical: number;
    warning: number;
    unread: number;
  };
  automationJobs: {
    total: number;
    failed: number;
    queued: number;
    running: number;
  };
  complianceChecks: {
    total: number;
    critical: number;
    warning: number;
    open: number;
  };
};

export type AuditTopBreakdowns = {
  byModule: AuditBreakdownItem[];
  byAction: AuditBreakdownItem[];
  byEndpoint: AuditBreakdownItem[];
  byDay: AuditBreakdownItem[];
};

export type AuditPayloadProfile = {
  optimizedFor: string;
  rawSamplesIncluded: boolean;
  fullEvidenceIncluded: boolean;
  latestEvidenceMode: string;
};

export type AuditIntelligenceExecutiveResponse = {
  status: string;
  module: string;
  companyId: string;
  quality: AuditQuality;
  totals: AuditTotals;
  findings: AuditExecutiveFinding[];
  recommendations: AuditRecommendation[];
  supportingSignals: AuditSupportingSignals;
  topBreakdowns: AuditTopBreakdowns;
  payloadProfile: AuditPayloadProfile;
  generatedAt: string;
};

export type AuditIntelligenceExecutiveQuery = {
  lookback?: number;
  limit?: number;
  includeRecommendations?: boolean;
};

function buildQuery(params?: AuditIntelligenceExecutiveQuery): string {
  const search = new URLSearchParams();

  if (params?.lookback !== undefined) {
    search.set('lookback', String(params.lookback));
  }

  if (params?.limit !== undefined) {
    search.set('limit', String(params.limit));
  }

  if (params?.includeRecommendations !== undefined) {
    search.set('includeRecommendations', String(params.includeRecommendations));
  }

  const value = search.toString();

  return value ? `?${value}` : '';
}

export const auditIntelligenceEnterpriseApi = {
  executive: async (
    companyId: string,
    query: AuditIntelligenceExecutiveQuery = {},
  ): Promise<AuditIntelligenceExecutiveResponse> => {
    const response = await api.get<AuditIntelligenceExecutiveResponse>(
      `/audit/intelligence/${companyId}/executive${buildQuery(query)}`,
    );

    return response.data;
  },
};

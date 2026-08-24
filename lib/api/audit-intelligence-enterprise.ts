'use strict';

import { api, isDemoSession } from '@/services/api';
import { isDemoEntityId, isOperationalDemoFallbackEnabled } from '@/lib/config/demo-policy';

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

function isDemoCompany(companyId: string): boolean {
  return isDemoEntityId(companyId) || (isDemoSession() && isOperationalDemoFallbackEnabled());
}

function nowIso(): string {
  return new Date().toISOString();
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function breakdown(items: Array<[string, number]>): AuditBreakdownItem[] {
  return items.map(([key, count]) => ({ key, count }));
}

function demoEvidenceSummary(): AuditEvidenceSummary {
  return {
    byModule: breakdown([
      ['compliance', 8],
      ['digital-certificates', 5],
      ['automation-jobs', 4],
    ]),
    byAction: breakdown([
      ['CREATE', 7],
      ['UPDATE', 6],
      ['EXECUTE', 4],
    ]),
    byEndpoint: breakdown([
      ['/api/v1/compliance/checks', 8],
      ['/api/v1/digital-certificates/enterprise', 5],
      ['/api/v1/automation/jobs', 4],
    ]),
    latestSummary: [
      {
        id: 'demo-audit-001',
        action: 'CREATE',
        module: 'compliance',
        entity: 'ComplianceCheck',
        statusCode: 201,
        path: '/api/v1/compliance/checks',
        method: 'POST',
        createdAt: addDays(-1),
      },
      {
        id: 'demo-audit-002',
        action: 'EXECUTE',
        module: 'automation-jobs',
        entity: 'AutomationJob',
        statusCode: 200,
        path: '/api/v1/automation/jobs/retry',
        method: 'POST',
        createdAt: addDays(-2),
      },
    ],
    totalLatestReturned: 2,
  };
}

function createDemoAuditIntelligenceResponse(
  companyId: string,
  query: AuditIntelligenceExecutiveQuery,
): AuditIntelligenceExecutiveResponse {
  const recordsAnalyzed = Math.max(120, query.lookback ?? 300);
  const criticalEvents = 2;
  const warningEvents = 9;
  const activeSignals = criticalEvents + warningEvents;
  const historicalNoise = 4;
  const serverErrors = 1;
  const clientErrors = 3;
  const qualityScore = 100 - criticalEvents * 10 - warningEvents * 2 - serverErrors * 6 - clientErrors * 2;
  const qualityStatus: AuditQualityStatus =
    qualityScore >= 85 ? 'HEALTHY' : qualityScore >= 60 ? 'ATTENTION' : 'CRITICAL';

  const findings: AuditExecutiveFinding[] = [
    {
      id: 'demo-finding-compliance-critical',
      severity: 'CRITICAL',
      title: 'Pendências críticas de compliance fiscal',
      description:
        'Foram identificados checks fiscais críticos em aberto que exigem evidência operacional antes do fechamento da competência.',
      count: criticalEvents,
      module: 'compliance',
      action: 'CREATE',
      evidenceSummary: demoEvidenceSummary(),
    },
    {
      id: 'demo-finding-cert-expiring',
      severity: 'WARNING',
      title: 'Certificados digitais próximos do vencimento',
      description:
        'Certificados e-CNPJ/e-CPF precisam de acompanhamento para não interromper emissão fiscal e automações oficiais.',
      count: 5,
      module: 'digital-certificates',
      action: 'UPDATE',
      evidenceSummary: demoEvidenceSummary(),
    },
    {
      id: 'demo-finding-automation-noise',
      severity: 'INFO',
      title: 'Ruído histórico em automações reprocessadas',
      description:
        'Há reprocessamentos assistidos sem falha atual; mantenha observabilidade, mas sem bloqueio operacional.',
      count: historicalNoise,
      module: 'automation-jobs',
      action: 'EXECUTE',
      evidenceSummary: demoEvidenceSummary(),
    },
  ];

  return {
    status: 'OK_DEMO',
    module: 'audit-intelligence',
    companyId,
    quality: {
      qualityScore,
      qualityStatus,
      recordsAnalyzed,
      criticalEvents,
      warningEvents,
      activeSignals,
      historicalNoise,
      serverErrors,
      clientErrors,
    },
    totals: {
      records: recordsAnalyzed,
      statusBuckets: { OK: recordsAnalyzed - activeSignals, WARNING: warningEvents, CRITICAL: criticalEvents },
      severityBuckets: { INFO: 18, WARNING: warningEvents, CRITICAL: criticalEvents },
      modules: 7,
      actions: 14,
      endpoints: 18,
    },
    findings: findings.slice(0, query.limit ?? findings.length),
    recommendations:
      query.includeRecommendations === false
        ? []
        : [
            {
              id: 'demo-rec-compliance-sla',
              priority: 'CRITICAL',
              title: 'Fechar SLA das pendências críticas',
              description:
                'Priorize checks críticos e anexe evidências antes do fechamento fiscal da competência.',
              action: 'Abrir Compliance Enterprise e resolver os checks críticos.',
            },
            {
              id: 'demo-rec-certificate-renewal',
              priority: 'HIGH',
              title: 'Agendar renovação de certificados',
              description:
                'Certificados próximos ao vencimento devem entrar em agenda operacional com responsável definido.',
              action: 'Abrir Certificados Digitais e revisar vencimentos.',
            },
          ],
    supportingSignals: {
      notifications: { total: 12, critical: 2, warning: 5, unread: 4 },
      automationJobs: { total: 9, failed: 1, queued: 2, running: 1 },
      complianceChecks: { total: 16, critical: 2, warning: 6, open: 7 },
    },
    topBreakdowns: {
      byModule: breakdown([
        ['compliance', 16],
        ['automation-jobs', 9],
        ['digital-certificates', 7],
        ['billing', 5],
      ]),
      byAction: breakdown([
        ['CREATE', 14],
        ['UPDATE', 11],
        ['EXECUTE', 8],
        ['ACKNOWLEDGE', 4],
      ]),
      byEndpoint: breakdown([
        ['/api/v1/compliance/checks', 16],
        ['/api/v1/automation/jobs', 9],
        ['/api/v1/digital-certificates/enterprise', 7],
      ]),
      byDay: breakdown([
        [addDays(-3).slice(0, 10), 8],
        [addDays(-2).slice(0, 10), 12],
        [addDays(-1).slice(0, 10), 16],
        [nowIso().slice(0, 10), 11],
      ]),
    },
    payloadProfile: {
      optimizedFor: 'executive-dashboard',
      rawSamplesIncluded: false,
      fullEvidenceIncluded: false,
      latestEvidenceMode: 'demo-slim',
    },
    generatedAt: nowIso(),
  };
}

export const auditIntelligenceEnterpriseApi = {
  executive: async (
    companyId: string,
    query: AuditIntelligenceExecutiveQuery = {},
  ): Promise<AuditIntelligenceExecutiveResponse> => {
    if (isDemoCompany(companyId)) {
      return createDemoAuditIntelligenceResponse(companyId, query);
    }

    const response = await api.get<AuditIntelligenceExecutiveResponse>(
      `/audit/intelligence/${companyId}/executive${buildQuery(query)}`,
    );

    return response.data;
  },
};

'use strict';

import { api } from '@/services/api';
import { createDemoEnterpriseCatalog } from '@/lib/api/enterprise-demo';

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

function createDemoExecutiveSummary(modules: CommandCenterModuleMetric[]): ExecutiveSummary {
  const healthyModules = modules.filter((item) => item.status === 'HEALTHY').length;
  const attentionModules = modules.filter((item) => item.status === 'ATTENTION').length;
  const criticalModules = modules.filter((item) => item.status === 'CRITICAL').length;
  const totalCritical = modules.reduce((sum, item) => sum + Number(item.critical || 0), 0);
  const totalWarning = modules.reduce((sum, item) => sum + Number(item.warning || 0), 0);
  const totalFailed = modules.reduce((sum, item) => sum + Number(item.failed || 0), 0);
  const totalUnread = modules.reduce((sum, item) => sum + Number(item.unread || 0), 0);
  const totalRecords = modules.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const executiveScore = Math.max(0, 92 - totalCritical * 8 - totalWarning * 3 - totalFailed * 4);
  const executiveStatus =
    executiveScore >= 90 ? 'HEALTHY' : executiveScore >= 70 ? 'ATTENTION' : 'CRITICAL';

  const topRisks: ExecutiveRisk[] = [
    {
      slug: 'operational-fallback',
      title: 'Operação em fallback controlado',
      severity: 'WARNING',
      scoreImpact: -4,
      description:
        'A API real do Command Center não respondeu. A plataforma manteve uma visão operacional demonstrativa para evitar tela quebrada.',
      evidence: { mode: 'OK_WITH_FALLBACK', totalRecords },
    },
  ];

  if (totalCritical > 0 || totalFailed > 0) {
    topRisks.push({
      slug: 'critical-operations',
      title: 'Sinais críticos exigem revisão',
      severity: 'CRITICAL',
      scoreImpact: -12,
      description:
        'Há módulos com registros críticos ou falhas simuladas que representam pontos de atenção executiva.',
      evidence: { totalCritical, totalFailed },
    });
  }

  return {
    executiveScore,
    executiveStatus,
    availableModules: modules.filter((item) => item.available).length,
    unavailableModules: modules.filter((item) => !item.available).length,
    healthyModules,
    attentionModules,
    criticalModules,
    totalRecords,
    totalCritical,
    totalWarning,
    totalFailed,
    totalUnread,
    topRisks,
    auditQualityScore: 86,
    auditQualityStatus: 'HEALTHY',
    auditActiveSignals: totalCritical + totalWarning,
    auditHistoricalNoise: 2,
    auditServerErrors: 0,
    auditClientErrors: 1,
  };
}

function createDemoCommandCenterSummary(companyId: string): CommandCenterSummaryResponse {
  const modules: CommandCenterModuleMetric[] = createDemoEnterpriseCatalog()
    .slice(0, 12)
    .map((item, index) => {
      const status: ExecutiveStatus =
        index % 7 === 0 ? 'CRITICAL' : index % 3 === 0 ? 'ATTENTION' : 'HEALTHY';
      const critical = status === 'CRITICAL' ? 1 : 0;
      const warning = status === 'ATTENTION' ? 2 : 0;
      const failed = index % 8 === 0 ? 1 : 0;

      return {
        slug: item.slug,
        label: item.label,
        prismaKey: item.model,
        available: true,
        total: 12 + index * 3,
        active: 8 + index,
        pending: index % 4,
        critical,
        warning,
        failed,
        open: warning + critical,
        resolved: 5 + index,
        unread: index % 5,
        riskScore: Math.max(35, 94 - critical * 20 - warning * 7 - failed * 10),
        status,
      };
    });
  const executiveSummary = createDemoExecutiveSummary(modules);
  const activity: CommandCenterActivityRecord[] = modules.slice(0, 8).map((module, index) => ({
    type: module.status === 'HEALTHY' ? 'STATUS_CHECK' : 'RISK_SIGNAL',
    source: module.slug,
    record: {
      id: `activity-${index + 1}`,
      title: `${module.label} atualizado em modo operacional`,
      status: module.status,
      createdAt: new Date(Date.now() - index * 3600000).toISOString(),
    },
  }));

  return {
    status: 'OK_WITH_FALLBACK',
    module: 'command-center',
    companyId,
    company: {
      id: companyId,
      name: 'Empresa demonstração',
      planLevel: 'Enterprise',
      active: true,
    },
    executiveSummary,
    modules,
    risks: executiveSummary.topRisks,
    activity,
    audit: activity.map((item) => item.record),
    auditIntelligence: {
      available: true,
      quality: {
        qualityScore: 86,
        qualityStatus: 'HEALTHY',
        recordsAnalyzed: executiveSummary.totalRecords,
        criticalEvents: executiveSummary.totalCritical,
        warningEvents: executiveSummary.totalWarning,
        activeSignals: executiveSummary.auditActiveSignals || 0,
        historicalNoise: executiveSummary.auditHistoricalNoise || 0,
        serverErrors: executiveSummary.auditServerErrors || 0,
        clientErrors: executiveSummary.auditClientErrors || 0,
      },
      findings: [
        {
          id: 'fallback-coverage',
          severity: 'WARNING',
          title: 'Cobertura operacional demonstrativa ativa',
          count: modules.length,
        },
      ],
      recommendations: [
        {
          id: 'connect-real-api',
          priority: 'WARNING',
          title: 'Conectar dados reais do Command Center',
          action:
            'Validar endpoints backend e credenciais para substituir fallback por dados transacionais.',
        },
      ],
      route: '/dashboard/modules/audit-intelligence',
      apiBase: '/api/v1',
      cache: null,
      performance: { computedInMs: 0 },
      error: null,
    },
    health: {
      api: 'FALLBACK',
      database: 'UNAVAILABLE',
      commandCenter: 'OK_WITH_FALLBACK',
      generatedAt: new Date().toISOString(),
    },
    generatedAt: new Date().toISOString(),
  };
}

export const commandCenterEnterpriseApi = {
  summary: async (
    companyId: string,
    query: CommandCenterQuery = {},
  ): Promise<CommandCenterSummaryResponse> => {
    try {
      const response = await api.get<CommandCenterSummaryResponse>(
        `/operations/command-center/${companyId}${buildQuery(query)}`,
      );

      return response.data;
    } catch {
      return createDemoCommandCenterSummary(companyId);
    }
  },

  risks: async (
    companyId: string,
    query: CommandCenterQuery = {},
  ): Promise<CommandCenterRisksResponse> => {
    try {
      const response = await api.get<CommandCenterRisksResponse>(
        `/operations/command-center/${companyId}/risks${buildQuery(query)}`,
      );

      return response.data;
    } catch {
      const summary = createDemoCommandCenterSummary(companyId);
      return {
        status: summary.status,
        module: summary.module,
        companyId,
        executiveSummary: summary.executiveSummary,
        risks: summary.risks,
        auditIntelligence: summary.auditIntelligence,
        generatedAt: summary.generatedAt,
      };
    }
  },

  modules: async (
    companyId: string,
    query: CommandCenterQuery = {},
  ): Promise<CommandCenterModulesResponse> => {
    try {
      const response = await api.get<CommandCenterModulesResponse>(
        `/operations/command-center/${companyId}/modules${buildQuery(query)}`,
      );

      return response.data;
    } catch {
      const summary = createDemoCommandCenterSummary(companyId);
      return {
        status: summary.status,
        module: summary.module,
        companyId,
        executiveSummary: summary.executiveSummary,
        modules: summary.modules,
        generatedAt: summary.generatedAt,
      };
    }
  },

  activity: async (
    companyId: string,
    query: CommandCenterQuery = {},
  ): Promise<CommandCenterActivityResponse> => {
    try {
      const response = await api.get<CommandCenterActivityResponse>(
        `/operations/command-center/${companyId}/activity${buildQuery(query)}`,
      );

      return response.data;
    } catch {
      const summary = createDemoCommandCenterSummary(companyId);
      return {
        status: summary.status,
        module: summary.module,
        companyId,
        activity: summary.activity,
        audit: summary.audit,
        generatedAt: summary.generatedAt,
      };
    }
  },
};

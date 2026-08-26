'use strict';

import { api } from '@/services/api';
import { isDemoEntityId } from '@/lib/config/demo-policy';

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

type DemoComplianceStore = {
  rules: BusinessRuleEnterpriseRecord[];
  checks: ComplianceCheckEnterpriseRecord[];
  audits: AuditLogRecord[];
};

const DEMO_STORE_VERSION = 'v1';

function isDemoCompany(companyId: string): boolean {
  return isDemoEntityId(companyId);
}

function nowIso(): string {
  return new Date().toISOString();
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

function storeKey(companyId: string): string {
  return `bcost:${DEMO_STORE_VERSION}:compliance-enterprise:${companyId}`;
}

function makeRule(
  companyId: string,
  input: CreateBusinessRulePayload & {
    id?: string;
    triggerCount?: number;
    lastTriggeredAt?: string;
  },
): BusinessRuleEnterpriseRecord {
  return {
    id: input.id || `demo-rule-${Date.now()}`,
    companyId,
    name: input.name,
    description: input.description || null,
    condition: input.condition,
    action: input.action,
    enabled: input.enabled ?? true,
    lastTriggeredAt: input.lastTriggeredAt || null,
    triggerCount: input.triggerCount || 0,
    operationalStatus: input.enabled === false ? 'DISABLED' : 'ENABLED',
    createdAt: nowIso(),
  };
}

function makeCheck(
  companyId: string,
  input: CreateComplianceCheckPayload & { id?: string; createdAt?: string },
): ComplianceCheckEnterpriseRecord {
  const status = input.status || 'OPEN';
  const resolved = status === 'RESOLVED' || status === 'IGNORED';

  return {
    id: input.id || `demo-check-${Date.now()}`,
    companyId,
    checkName: input.checkName,
    severity: input.severity || 'WARNING',
    status,
    description: input.description || null,
    resolved,
    resolvedAt: resolved ? nowIso() : null,
    resolvedBy: resolved ? 'demo-user' : null,
    operationalStatus: status,
    createdAt: input.createdAt || nowIso(),
  };
}

function makeDefaultRules(companyId: string): BusinessRuleEnterpriseRecord[] {
  return [
    makeRule(companyId, {
      id: 'demo-rule-cert-expiration',
      name: 'Certificado digital próximo do vencimento',
      description: 'Gera alerta crítico quando certificado A1/A3 vence em até 30 dias.',
      condition: { type: 'certificate', daysToExpireLte: 30 },
      action: { createComplianceCheck: true, severity: 'CRITICAL' },
      enabled: true,
      triggerCount: 2,
      lastTriggeredAt: nowIso(),
    }),
    makeRule(companyId, {
      id: 'demo-rule-tax-overdue',
      name: 'Guia tributária vencida ou sem evidência',
      description: 'Monitora DAS, DARF e GPS pendentes após vencimento.',
      condition: { type: 'tax-obligation', statusIn: ['PENDING', 'OVERDUE'] },
      action: { createComplianceCheck: true, severity: 'WARNING' },
      enabled: true,
      triggerCount: 4,
      lastTriggeredAt: nowIso(),
    }),
    makeRule(companyId, {
      id: 'demo-rule-bank-unreconciled',
      name: 'Transações bancárias sem conciliação',
      description: 'Sinaliza transações abertas acima de R$ 1.000 sem matching fiscal.',
      condition: { type: 'banking', unreconciledAmountGte: 1000 },
      action: { createComplianceCheck: true, severity: 'WARNING' },
      enabled: true,
      triggerCount: 3,
      lastTriggeredAt: nowIso(),
    }),
  ];
}

function makeDemoStore(companyId: string): DemoComplianceStore {
  const rules = makeDefaultRules(companyId);
  const checks = [
    makeCheck(companyId, {
      id: 'demo-check-cert-expiration',
      checkName: 'Certificado digital vence em 21 dias',
      severity: 'CRITICAL',
      status: 'OPEN',
      description: 'Agendar renovação do certificado antes do bloqueio de emissão fiscal.',
    }),
    makeCheck(companyId, {
      id: 'demo-check-tax-evidence',
      checkName: 'DAS sem evidência oficial anexada',
      severity: 'WARNING',
      status: 'IN_PROGRESS',
      description: 'A guia foi provisionada, mas ainda não há recibo/hash de pagamento.',
    }),
    makeCheck(companyId, {
      id: 'demo-check-reconciliation',
      checkName: 'Transação bancária pendente de conciliação',
      severity: 'INFO',
      status: 'RESOLVED',
      description: 'Matching validado pelo fluxo demo de conciliação bancária.',
    }),
  ];

  return {
    rules,
    checks,
    audits: [
      {
        id: 'demo-audit-compliance-ready',
        companyId,
        module: 'compliance-engine',
        action: 'DEMO_COMPLIANCE_READY',
        entity: 'ComplianceCheck',
        entityId: checks[0]?.id,
        payload: { source: 'demo-store', mode: 'DEMO_OPERATIONAL' },
        createdAt: nowIso(),
      },
    ],
  };
}

function readStore(companyId: string): DemoComplianceStore {
  if (!isBrowserRuntime()) return makeDemoStore(companyId);

  try {
    const raw = window.localStorage.getItem(storeKey(companyId));
    if (raw) return JSON.parse(raw) as DemoComplianceStore;
  } catch {
    window.localStorage.removeItem(storeKey(companyId));
  }

  const seeded = makeDemoStore(companyId);
  writeStore(companyId, seeded);
  return seeded;
}

function writeStore(companyId: string, store: DemoComplianceStore): void {
  if (!isBrowserRuntime()) return;
  window.localStorage.setItem(storeKey(companyId), JSON.stringify(store));
}

function appendAudit(
  store: DemoComplianceStore,
  companyId: string,
  module: 'business-rules' | 'compliance-checks' | 'compliance-engine',
  action: string,
  entity: string,
  entityId?: string,
  payload: Record<string, unknown> = {},
): void {
  store.audits.unshift({
    id: `demo-audit-compliance-${Date.now()}`,
    companyId,
    module,
    action,
    entity,
    entityId,
    payload: { source: 'demo-store', mode: 'DEMO_OPERATIONAL', ...payload },
    createdAt: nowIso(),
  });
}

function rulesSummary(rules: BusinessRuleEnterpriseRecord[]): BusinessRulesSummary {
  return {
    count: rules.length,
    enabled: rules.filter((rule) => rule.enabled).length,
    disabled: rules.filter((rule) => !rule.enabled).length,
    totalTriggerCount: rules.reduce((sum, rule) => sum + rule.triggerCount, 0),
  };
}

function checksSummary(checks: ComplianceCheckEnterpriseRecord[]): ComplianceChecksSummary {
  const bySeverity: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const check of checks) {
    bySeverity[check.severity] = (bySeverity[check.severity] || 0) + 1;
    byStatus[check.status] = (byStatus[check.status] || 0) + 1;
  }

  const openCritical = checks.filter(
    (check) => check.status === 'OPEN' && check.severity === 'CRITICAL',
  ).length;
  const openWarning = checks.filter(
    (check) => check.status === 'OPEN' && check.severity === 'WARNING',
  ).length;
  const riskScore = Math.max(0, 100 - openCritical * 25 - openWarning * 10);

  return {
    count: checks.length,
    open: byStatus.OPEN || 0,
    resolved: byStatus.RESOLVED || 0,
    ignored: byStatus.IGNORED || 0,
    inProgress: byStatus.IN_PROGRESS || 0,
    info: bySeverity.INFO || 0,
    warning: bySeverity.WARNING || 0,
    critical: bySeverity.CRITICAL || 0,
    riskScore,
    bySeverity,
    byStatus,
  };
}

function paginate<T>(items: T[], params: ComplianceQuery): T[] {
  const offset = Number(params.offset || 0);
  const limit = Number(params.limit || 100);
  return items.slice(offset, offset + limit);
}

function filterRules(
  rules: BusinessRuleEnterpriseRecord[],
  params: ComplianceQuery,
): BusinessRuleEnterpriseRecord[] {
  const search = String(params.search || '')
    .trim()
    .toLowerCase();
  return rules.filter((rule) => {
    if (params.enabled === 'true' && !rule.enabled) return false;
    if (params.enabled === 'false' && rule.enabled) return false;
    if (!search) return true;
    return `${rule.name} ${rule.description || ''}`.toLowerCase().includes(search);
  });
}

function filterChecks(
  checks: ComplianceCheckEnterpriseRecord[],
  params: ComplianceQuery,
): ComplianceCheckEnterpriseRecord[] {
  const search = String(params.search || '')
    .trim()
    .toLowerCase();
  return checks.filter((check) => {
    if (params.severity && params.severity !== 'ALL' && check.severity !== params.severity)
      return false;
    if (params.status && params.status !== 'ALL' && check.status !== params.status) return false;
    if (!search) return true;
    return `${check.checkName} ${check.description || ''}`.toLowerCase().includes(search);
  });
}

function updateCheckStatus(
  companyId: string,
  checkId: string,
  status: ComplianceStatus,
): ComplianceActionResponse<ComplianceCheckEnterpriseRecord> {
  const store = readStore(companyId);
  const index = store.checks.findIndex((check) => check.id === checkId);
  const current = store.checks[index];

  if (!current) throw new Error(`Check demo não encontrado: ${checkId}`);

  const resolved = status === 'RESOLVED' || status === 'IGNORED';
  const item: ComplianceCheckEnterpriseRecord = {
    ...current,
    status,
    resolved,
    resolvedAt: resolved ? nowIso() : null,
    resolvedBy: resolved ? 'demo-user' : null,
    operationalStatus: status,
    updatedAt: nowIso(),
  };

  store.checks[index] = item;
  appendAudit(
    store,
    companyId,
    'compliance-checks',
    'DEMO_COMPLIANCE_CHECK_STATUS_CHANGED',
    'ComplianceCheck',
    item.id,
    {
      status,
    },
  );
  writeStore(companyId, store);

  return {
    status: 'success',
    message: 'Check atualizado na sessão demo.',
    companyId,
    item,
    audit: { recorded: true },
    generatedAt: nowIso(),
  };
}

export const complianceEnterpriseApi = {
  summary: async (companyId: string): Promise<ComplianceEnterpriseSummaryResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      return {
        status: 'success',
        module: 'compliance-enterprise-summary',
        companyId,
        rules: rulesSummary(store.rules),
        checks: checksSummary(store.checks),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<ComplianceEnterpriseSummaryResponse>(
      `/compliance/enterprise/summary/${companyId}`,
    );

    return response.data;
  },

  listRules: async (
    companyId: string,
    params: ComplianceQuery = {},
  ): Promise<BusinessRulesListResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const filtered = filterRules(store.rules, params);
      const items = paginate(filtered, params);
      return {
        status: 'success',
        module: 'business-rules',
        model: 'BusinessRule',
        companyId,
        items,
        total: filtered.length,
        limit: Number(params.limit || 100),
        offset: Number(params.offset || 0),
        hasMore: Number(params.offset || 0) + items.length < filtered.length,
        summary: rulesSummary(filtered),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<BusinessRulesListResponse>(
      `/compliance/enterprise/rules/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createRule: async (
    companyId: string,
    payload: CreateBusinessRulePayload,
  ): Promise<ComplianceActionResponse<BusinessRuleEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const item = makeRule(companyId, payload);
      store.rules.unshift(item);
      appendAudit(
        store,
        companyId,
        'business-rules',
        'DEMO_BUSINESS_RULE_CREATED',
        'BusinessRule',
        item.id,
      );
      writeStore(companyId, store);
      return {
        status: 'success',
        message: 'Regra criada na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const index = store.rules.findIndex((rule) => rule.id === ruleId);
      const current = store.rules[index];

      if (!current) throw new Error(`Regra demo não encontrada: ${ruleId}`);

      const item: BusinessRuleEnterpriseRecord = {
        ...current,
        ...payload,
        description: payload.description ?? current.description,
        condition: payload.condition || current.condition,
        action: payload.action || current.action,
        enabled: payload.enabled ?? current.enabled,
        operationalStatus: (payload.enabled ?? current.enabled) ? 'ENABLED' : 'DISABLED',
        updatedAt: nowIso(),
      };
      store.rules[index] = item;
      appendAudit(
        store,
        companyId,
        'business-rules',
        'DEMO_BUSINESS_RULE_UPDATED',
        'BusinessRule',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Regra atualizada na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      return complianceEnterpriseApi.updateRule(companyId, ruleId, { enabled: true });
    }

    const response = await api.post<ComplianceActionResponse<BusinessRuleEnterpriseRecord>>(
      `/compliance/enterprise/rules/${companyId}/${ruleId}/enable`,
    );

    return response.data;
  },

  disableRule: async (
    companyId: string,
    ruleId: string,
  ): Promise<ComplianceActionResponse<BusinessRuleEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      return complianceEnterpriseApi.updateRule(companyId, ruleId, { enabled: false });
    }

    const response = await api.post<ComplianceActionResponse<BusinessRuleEnterpriseRecord>>(
      `/compliance/enterprise/rules/${companyId}/${ruleId}/disable`,
    );

    return response.data;
  },

  createDefaultRules: async (
    companyId: string,
  ): Promise<ComplianceActionResponse<BusinessRuleEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const existingNames = new Set(store.rules.map((rule) => rule.name));
      const created: BusinessRuleEnterpriseRecord[] = [];
      const skipped: BusinessRuleEnterpriseRecord[] = [];

      for (const rule of makeDefaultRules(companyId)) {
        if (existingNames.has(rule.name)) {
          skipped.push(rule);
          continue;
        }

        store.rules.push(rule);
        created.push(rule);
      }

      appendAudit(
        store,
        companyId,
        'business-rules',
        'DEMO_DEFAULT_RULES_CREATED',
        'BusinessRule',
        undefined,
        {
          created: created.length,
          skipped: skipped.length,
        },
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Regras padrão validadas na sessão demo.',
        companyId,
        item: store.rules[0],
        created,
        skipped,
        totals: { created: created.length, skipped: skipped.length },
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

    const response = await api.post<ComplianceActionResponse<BusinessRuleEnterpriseRecord>>(
      `/compliance/enterprise/rules/${companyId}/defaults`,
    );

    return response.data;
  },

  listChecks: async (
    companyId: string,
    params: ComplianceQuery = {},
  ): Promise<ComplianceChecksListResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const filtered = filterChecks(store.checks, params);
      const items = paginate(filtered, params);
      return {
        status: 'success',
        module: 'compliance-checks',
        model: 'ComplianceCheck',
        companyId,
        items,
        total: filtered.length,
        limit: Number(params.limit || 100),
        offset: Number(params.offset || 0),
        hasMore: Number(params.offset || 0) + items.length < filtered.length,
        summary: checksSummary(filtered),
        generatedAt: nowIso(),
      };
    }

    const response = await api.get<ComplianceChecksListResponse>(
      `/compliance/enterprise/checks/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createCheck: async (
    companyId: string,
    payload: CreateComplianceCheckPayload,
  ): Promise<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const item = makeCheck(companyId, payload);
      store.checks.unshift(item);
      appendAudit(
        store,
        companyId,
        'compliance-checks',
        'DEMO_COMPLIANCE_CHECK_CREATED',
        'ComplianceCheck',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Check criado na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const index = store.checks.findIndex((check) => check.id === checkId);
      const current = store.checks[index];

      if (!current) throw new Error(`Check demo não encontrado: ${checkId}`);

      const status = payload.status || current.status;
      const resolved = status === 'RESOLVED' || status === 'IGNORED';
      const item: ComplianceCheckEnterpriseRecord = {
        ...current,
        ...payload,
        status,
        resolved,
        resolvedAt: resolved ? nowIso() : null,
        resolvedBy: resolved ? 'demo-user' : null,
        operationalStatus: status,
        updatedAt: nowIso(),
      };
      store.checks[index] = item;
      appendAudit(
        store,
        companyId,
        'compliance-checks',
        'DEMO_COMPLIANCE_CHECK_UPDATED',
        'ComplianceCheck',
        item.id,
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Check atualizado na sessão demo.',
        companyId,
        item,
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) return updateCheckStatus(companyId, checkId, 'IN_PROGRESS');

    const response = await api.post<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>>(
      `/compliance/enterprise/checks/${companyId}/${checkId}/in-progress`,
    );

    return response.data;
  },

  resolveCheck: async (
    companyId: string,
    checkId: string,
  ): Promise<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) return updateCheckStatus(companyId, checkId, 'RESOLVED');

    const response = await api.post<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>>(
      `/compliance/enterprise/checks/${companyId}/${checkId}/resolve`,
    );

    return response.data;
  },

  ignoreCheck: async (
    companyId: string,
    checkId: string,
  ): Promise<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) return updateCheckStatus(companyId, checkId, 'IGNORED');

    const response = await api.post<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>>(
      `/compliance/enterprise/checks/${companyId}/${checkId}/ignore`,
    );

    return response.data;
  },

  reopenCheck: async (
    companyId: string,
    checkId: string,
  ): Promise<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) return updateCheckStatus(companyId, checkId, 'OPEN');

    const response = await api.post<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>>(
      `/compliance/enterprise/checks/${companyId}/${checkId}/reopen`,
    );

    return response.data;
  },

  runEngine: async (
    companyId: string,
    payload: RunComplianceEnginePayload,
  ): Promise<ComplianceActionResponse<ComplianceCheckEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const activeRules = store.rules.filter((rule) => rule.enabled);
      const findings = activeRules.map((rule) => ({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: String(rule.action.severity || 'WARNING'),
        triggeredAt: nowIso(),
      }));
      const created: ComplianceCheckEnterpriseRecord[] = [];

      if (payload.createChecks !== false) {
        for (const finding of findings) {
          const severity = ['INFO', 'WARNING', 'CRITICAL'].includes(finding.severity)
            ? (finding.severity as ComplianceSeverity)
            : 'WARNING';
          const check = makeCheck(companyId, {
            id: `demo-engine-check-${finding.ruleId}`,
            checkName: `Engine: ${finding.ruleName}`,
            severity,
            status: 'OPEN',
            description: `Finding gerado pelo Compliance Engine demo para a regra ${finding.ruleName}.`,
          });

          if (!store.checks.some((item) => item.id === check.id)) {
            store.checks.unshift(check);
            created.push(check);
          }
        }
      }

      store.rules = store.rules.map((rule) =>
        rule.enabled
          ? { ...rule, triggerCount: rule.triggerCount + 1, lastTriggeredAt: nowIso() }
          : rule,
      );

      if (payload.resolveStaleEngineChecks) {
        store.checks = store.checks.map((check) =>
          check.checkName.startsWith('Engine:') && !created.some((item) => item.id === check.id)
            ? {
                ...check,
                status: 'RESOLVED',
                resolved: true,
                resolvedAt: nowIso(),
                resolvedBy: 'demo-engine',
              }
            : check,
        );
      }

      appendAudit(
        store,
        companyId,
        'compliance-engine',
        'DEMO_COMPLIANCE_ENGINE_RUN',
        'ComplianceCheck',
        undefined,
        {
          findings: findings.length,
          created: created.length,
        },
      );
      writeStore(companyId, store);

      return {
        status: 'success',
        message: 'Compliance Engine executado na sessão demo.',
        companyId,
        item: created[0] || store.checks[0],
        created,
        findings,
        totals: {
          findings: findings.length,
          created: created.length,
          skipped: findings.length - created.length,
        },
        summary: checksSummary(store.checks),
        audit: { recorded: true },
        generatedAt: nowIso(),
      };
    }

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
    if (isDemoCompany(companyId)) {
      const store = readStore(companyId);
      const limit = Number(params.limit || 30);
      const offset = Number(params.offset || 0);
      const items = store.audits.filter((audit) => audit.module === module);
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
        limit: 30,
        module,
        ...params,
      })}`,
    );

    return response.data;
  },
};

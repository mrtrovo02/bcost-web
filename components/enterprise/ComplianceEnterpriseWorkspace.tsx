'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  BrainCircuit,
  CheckCircle2,
  CircleDashed,
  FileWarning,
  Loader2,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  XCircle,
} from 'lucide-react';

import {
  AuditLogRecord,
  BusinessRuleEnterpriseRecord,
  BusinessRulesListResponse,
  ComplianceCheckEnterpriseRecord,
  ComplianceChecksListResponse,
  ComplianceEnterpriseSummaryResponse,
  ComplianceSeverity,
  ComplianceStatus,
  complianceEnterpriseApi,
  CreateBusinessRulePayload,
} from '@/lib/api/compliance-enterprise';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';

type WorkspaceMode = 'compliance-checks' | 'business-rules';

type UiMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
};

type RuleFormState = {
  name: string;
  description: string;
  condition: string;
  action: string;
  enabled: boolean;
};

type CheckFormState = {
  checkName: string;
  severity: ComplianceSeverity;
  status: ComplianceStatus;
  description: string;
};

type EngineFormState = {
  createChecks: boolean;
  includeResolved: boolean;
  resolveStaleEngineChecks: boolean;
};

const DEFAULT_RULE_FORM: RuleFormState = {
  name: '',
  description: '',
  condition: JSON.stringify(
    {
      type: 'builtin',
      sourceModule: 'automation-jobs',
      rule: 'failed-jobs',
    },
    null,
    2,
  ),
  action: JSON.stringify(
    {
      createComplianceCheck: true,
      severity: 'WARNING',
    },
    null,
    2,
  ),
  enabled: true,
};

const DEFAULT_CHECK_FORM: CheckFormState = {
  checkName: '',
  severity: 'WARNING',
  status: 'OPEN',
  description: '',
};

const DEFAULT_ENGINE_FORM: EngineFormState = {
  createChecks: true,
  includeResolved: false,
  resolveStaleEngineChecks: false,
};

async function resolveCompanyId(): Promise<string> {
  return resolveEnterpriseCompanyIdWithFallback();
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatJson(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';

  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseJsonField(value: string, fieldName: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${fieldName} precisa ser um objeto JSON.`);
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `${fieldName} inválido: ${error instanceof Error ? error.message : 'JSON malformado.'}`,
    );
  }
}

function moduleName(mode: WorkspaceMode) {
  return mode === 'business-rules' ? 'business-rules' : 'compliance-checks';
}

function statusClass(value?: string | boolean | null) {
  const normalized = String(value || '').toUpperCase();

  if (normalized === 'ENABLED' || normalized === 'TRUE' || normalized === 'RESOLVED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'OPEN' || normalized === 'WARNING') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'CRITICAL') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (normalized === 'IN_PROGRESS' || normalized === 'INFO') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (normalized === 'IGNORED' || normalized === 'DISABLED' || normalized === 'FALSE') {
    return 'border-slate-200 bg-slate-50 text-slate-600';
  }

  return 'border-slate-200 bg-white text-slate-600';
}

function riskTone(score: number) {
  if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-100';
  if (score >= 65) return 'text-amber-700 bg-amber-50 border-amber-100';
  return 'text-red-700 bg-red-50 border-red-100';
}

function Button({
  children,
  onClick,
  disabled,
  variant = 'default',
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'secondary' | 'danger' | 'success' | 'warning';
  type?: 'button' | 'submit';
}) {
  const classes = {
    default: 'bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300',
    secondary:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-300',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${classes[variant]}`}
    >
      {children}
    </button>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'purple';
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-950',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    purple: 'border-purple-100 bg-purple-50 text-purple-700',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm opacity-70">{label}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
        </div>
        <div className="rounded-xl bg-white/70 p-2">{icon}</div>
      </div>
    </div>
  );
}

export default function ComplianceEnterpriseWorkspace({ mode }: { mode: WorkspaceMode }) {
  const [companyId, setCompanyId] = useState('');
  const [summary, setSummary] = useState<ComplianceEnterpriseSummaryResponse | null>(null);
  const [rulesPayload, setRulesPayload] = useState<BusinessRulesListResponse | null>(null);
  const [checksPayload, setChecksPayload] = useState<ComplianceChecksListResponse | null>(null);

  const [selectedRule, setSelectedRule] = useState<BusinessRuleEnterpriseRecord | null>(null);
  const [selectedCheck, setSelectedCheck] = useState<ComplianceCheckEnterpriseRecord | null>(null);

  const [ruleForm, setRuleForm] = useState<RuleFormState>(DEFAULT_RULE_FORM);
  const [checkForm, setCheckForm] = useState<CheckFormState>(DEFAULT_CHECK_FORM);
  const [engineForm, setEngineForm] = useState<EngineFormState>(DEFAULT_ENGINE_FORM);

  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | ComplianceSeverity>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ComplianceStatus>('ALL');
  const [enabledFilter, setEnabledFilter] = useState('ALL');

  const [audits, setAudits] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const rules = rulesPayload?.items || [];
  const checks = checksPayload?.items || [];
  const auditModule = moduleName(mode);
  const isRules = mode === 'business-rules';
  const isChecks = mode === 'compliance-checks';

  const ruleCanSubmit = useMemo(() => {
    return Boolean(ruleForm.name && ruleForm.condition && ruleForm.action);
  }, [ruleForm]);

  const checkCanSubmit = useMemo(() => {
    return Boolean(checkForm.checkName && checkForm.description);
  }, [checkForm]);

  const loadAudits = useCallback(
    async (
      companyIdOverride?: string,
      moduleOverride?: 'business-rules' | 'compliance-checks' | 'compliance-engine',
      entityId?: string,
    ) => {
      const effectiveCompanyId = companyIdOverride || companyId;
      const effectiveModule = moduleOverride || auditModule;

      if (!effectiveCompanyId) {
        setAudits([]);
        return;
      }

      try {
        const response = await complianceEnterpriseApi.audit(effectiveCompanyId, effectiveModule, {
          limit: 30,
        });

        const items = response.items || [];
        const filtered = entityId ? items.filter((item) => item.entityId === entityId) : items;

        setAudits(filtered.length > 0 ? filtered : items.slice(0, 10));
      } catch {
        setAudits([]);
      }
    },
    [auditModule, companyId],
  );

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) setLoading(true);
        setMessage(null);

        const resolvedCompanyId = companyId || (await resolveCompanyId());
        setCompanyId(resolvedCompanyId);

        const [summaryResponse, rulesResponse, checksResponse] = await Promise.all([
          complianceEnterpriseApi.summary(resolvedCompanyId),
          complianceEnterpriseApi.listRules(resolvedCompanyId, {
            limit: 100,
            search: isRules ? search : undefined,
            enabled: isRules ? enabledFilter : undefined,
          }),
          complianceEnterpriseApi.listChecks(resolvedCompanyId, {
            limit: 100,
            search: isChecks ? search : undefined,
            severity: isChecks ? severityFilter : undefined,
            status: isChecks ? statusFilter : undefined,
          }),
        ]);

        setSummary(summaryResponse);
        setRulesPayload(rulesResponse);
        setChecksPayload(checksResponse);

        const nextRule =
          rulesResponse.items.find((item) => item.id === selectedRule?.id) ||
          rulesResponse.items[0] ||
          null;

        const nextCheck =
          checksResponse.items.find((item) => item.id === selectedCheck?.id) ||
          checksResponse.items[0] ||
          null;

        setSelectedRule(nextRule);
        setSelectedCheck(nextCheck);

        if (mode === 'business-rules') {
          await loadAudits(resolvedCompanyId, 'business-rules', nextRule?.id);
        } else {
          await loadAudits(resolvedCompanyId, 'compliance-checks', nextCheck?.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao carregar Compliance Enterprise',
          description:
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar dados de compliance.',
        });
      } finally {
        setLoading(false);
      }
    },
    [
      companyId,
      mode,
      search,
      enabledFilter,
      severityFilter,
      statusFilter,
      isRules,
      isChecks,
      selectedRule?.id,
      selectedCheck?.id,
      loadAudits,
    ],
  );

  useEffect(() => {
    load();
  }, [load]);

  const submitRule = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!companyId || !ruleCanSubmit) return;

      setActionLoading('create-rule');
      setMessage(null);

      try {
        const payload: CreateBusinessRulePayload = {
          name: ruleForm.name.trim(),
          description: ruleForm.description.trim() || undefined,
          condition: parseJsonField(ruleForm.condition, 'condition'),
          action: parseJsonField(ruleForm.action, 'action'),
          enabled: ruleForm.enabled,
        };

        const response = await complianceEnterpriseApi.createRule(companyId, payload);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Regra criada.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Operação concluída, mas a auditoria retornou alerta.',
        });

        setRuleForm(DEFAULT_RULE_FORM);
        await load({ silent: true });

        if (response.item) {
          setSelectedRule(response.item);
          await loadAudits(companyId, 'business-rules', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao criar regra',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, ruleCanSubmit, ruleForm, load, loadAudits],
  );

  const createDefaultRules = useCallback(async () => {
    if (!companyId) return;

    setActionLoading('defaults');
    setMessage(null);

    try {
      const response = await complianceEnterpriseApi.createDefaultRules(companyId);

      setMessage({
        type: response.audit?.recorded ? 'success' : 'warning',
        title: response.message || 'Regras padrão validadas.',
        description: `Criadas: ${response.totals?.created ?? 0} | Já existentes: ${response.totals?.skipped ?? 0}`,
      });

      await load({ silent: true });
      await loadAudits(companyId, 'business-rules');
    } catch (error) {
      setMessage({
        type: 'error',
        title: 'Falha ao criar regras padrão',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    } finally {
      setActionLoading(null);
    }
  }, [companyId, load, loadAudits]);

  const toggleRule = useCallback(
    async (rule: BusinessRuleEnterpriseRecord) => {
      if (!companyId) return;

      setActionLoading(`toggle-rule:${rule.id}`);
      setMessage(null);

      try {
        const response = rule.enabled
          ? await complianceEnterpriseApi.disableRule(companyId, rule.id)
          : await complianceEnterpriseApi.enableRule(companyId, rule.id);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Regra atualizada.',
          description: response.item?.enabled ? 'Regra habilitada.' : 'Regra desabilitada.',
        });

        await load({ silent: true });

        if (response.item) {
          setSelectedRule(response.item);
          await loadAudits(companyId, 'business-rules', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao atualizar regra',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load, loadAudits],
  );

  const submitCheck = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!companyId || !checkCanSubmit) return;

      setActionLoading('create-check');
      setMessage(null);

      try {
        const response = await complianceEnterpriseApi.createCheck(companyId, {
          checkName: checkForm.checkName.trim(),
          severity: checkForm.severity,
          status: checkForm.status,
          description: checkForm.description.trim(),
        });

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Check criado.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Operação concluída, mas a auditoria retornou alerta.',
        });

        setCheckForm(DEFAULT_CHECK_FORM);
        await load({ silent: true });

        if (response.item) {
          setSelectedCheck(response.item);
          await loadAudits(companyId, 'compliance-checks', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao criar check',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, checkCanSubmit, checkForm, load, loadAudits],
  );

  const changeCheckStatus = useCallback(
    async (
      check: ComplianceCheckEnterpriseRecord,
      action: 'in-progress' | 'resolve' | 'ignore' | 'reopen',
    ) => {
      if (!companyId) return;

      setActionLoading(`${action}:${check.id}`);
      setMessage(null);

      try {
        const response =
          action === 'in-progress'
            ? await complianceEnterpriseApi.markInProgress(companyId, check.id)
            : action === 'resolve'
              ? await complianceEnterpriseApi.resolveCheck(companyId, check.id)
              : action === 'ignore'
                ? await complianceEnterpriseApi.ignoreCheck(companyId, check.id)
                : await complianceEnterpriseApi.reopenCheck(companyId, check.id);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Check atualizado.',
          description: `Novo status: ${response.item?.status ?? '—'}`,
        });

        await load({ silent: true });

        if (response.item) {
          setSelectedCheck(response.item);
          await loadAudits(companyId, 'compliance-checks', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao atualizar check',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load, loadAudits],
  );

  const runEngine = useCallback(async () => {
    if (!companyId) return;

    setActionLoading('run-engine');
    setMessage(null);

    try {
      const response = await complianceEnterpriseApi.runEngine(companyId, {
        createChecks: engineForm.createChecks,
        includeResolved: engineForm.includeResolved,
        resolveStaleEngineChecks: engineForm.resolveStaleEngineChecks,
      });

      setMessage({
        type: response.audit?.recorded ? 'success' : 'warning',
        title: response.message || 'Motor executado.',
        description: `Findings: ${response.totals?.findings ?? 0} | Criados: ${response.totals?.created ?? 0} | Ignorados: ${response.totals?.skipped ?? 0}`,
      });

      await load({ silent: true });
      await loadAudits(companyId, 'compliance-engine');
    } catch (error) {
      setMessage({
        type: 'error',
        title: 'Falha ao executar motor de compliance',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    } finally {
      setActionLoading(null);
    }
  }, [companyId, engineForm, load, loadAudits]);

  const selectRule = useCallback(
    async (rule: BusinessRuleEnterpriseRecord) => {
      setSelectedRule(rule);
      await loadAudits(companyId, 'business-rules', rule.id);
    },
    [companyId, loadAudits],
  );

  const selectCheck = useCallback(
    async (check: ComplianceCheckEnterpriseRecord) => {
      setSelectedCheck(check);
      await loadAudits(companyId, 'compliance-checks', check.id);
    },
    [companyId, loadAudits],
  );

  const riskScore = summary?.checks.riskScore ?? 100;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
                <BrainCircuit className="h-4 w-4" />
                Compliance Intelligence Layer
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {isRules ? 'Business Rules' : 'Compliance Checks'}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {isRules
                  ? 'Motor de regras enterprise para disparar evidências, riscos e checks automáticos sobre fiscal, financeiro, contábil, folha, banking e automações.'
                  : 'Painel executivo de riscos, severidades e status operacionais gerados manualmente ou pelo Compliance Engine.'}
              </p>

              <div className="mt-3 text-xs text-slate-500">
                Empresa ativa:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {companyId || 'carregando...'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isRules && (
                <Button
                  onClick={createDefaultRules}
                  disabled={actionLoading === 'defaults'}
                  variant="success"
                >
                  {actionLoading === 'defaults' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SlidersHorizontal className="h-4 w-4" />
                  )}
                  Criar regras padrão
                </Button>
              )}

              <Button
                onClick={runEngine}
                disabled={actionLoading === 'run-engine'}
                variant="warning"
              >
                {actionLoading === 'run-engine' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                Run Compliance Engine
              </Button>

              <Button onClick={() => load()} disabled={loading} variant="secondary">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Atualizar
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-3">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={engineForm.createChecks}
                onChange={(event) =>
                  setEngineForm((current) => ({
                    ...current,
                    createChecks: event.target.checked,
                  }))
                }
              />
              Criar checks automaticamente
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={engineForm.includeResolved}
                onChange={(event) =>
                  setEngineForm((current) => ({
                    ...current,
                    includeResolved: event.target.checked,
                  }))
                }
              />
              Incluir resolvidos no resumo
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={engineForm.resolveStaleEngineChecks}
                onChange={(event) =>
                  setEngineForm((current) => ({
                    ...current,
                    resolveStaleEngineChecks: event.target.checked,
                  }))
                }
              />
              Resolver checks obsoletos
            </label>
          </div>

          {message && (
            <div
              className={`mt-5 rounded-2xl border p-4 text-sm ${
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : message.type === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : message.type === 'error'
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : 'border-blue-200 bg-blue-50 text-blue-800'
              }`}
            >
              <div className="font-semibold">{message.title}</div>
              {message.description && <div className="mt-1 opacity-90">{message.description}</div>}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          <div className={`rounded-2xl border p-5 shadow-sm ${riskTone(riskScore)}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm opacity-70">Risk Score</div>
                <div className="mt-2 text-3xl font-black">{riskScore}</div>
              </div>
              <ShieldCheck className="h-7 w-7" />
            </div>
          </div>

          <KpiCard
            label="Open"
            value={summary?.checks.open ?? 0}
            tone="amber"
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <KpiCard
            label="In Progress"
            value={summary?.checks.inProgress ?? 0}
            tone="blue"
            icon={<CircleDashed className="h-5 w-5" />}
          />
          <KpiCard
            label="Resolved"
            value={summary?.checks.resolved ?? 0}
            tone="emerald"
            icon={<BadgeCheck className="h-5 w-5" />}
          />
          <KpiCard
            label="Critical"
            value={summary?.checks.critical ?? 0}
            tone="red"
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <KpiCard
            label="Rules"
            value={summary?.rules.count ?? 0}
            tone="purple"
            icon={<BrainCircuit className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
          <section className="flex flex-col gap-6">
            {isRules ? (
              <RuleForm
                form={ruleForm}
                setForm={setRuleForm}
                canSubmit={ruleCanSubmit}
                loading={actionLoading === 'create-rule'}
                onSubmit={submitRule}
              />
            ) : (
              <CheckForm
                form={checkForm}
                setForm={setCheckForm}
                canSubmit={checkCanSubmit}
                loading={actionLoading === 'create-check'}
                onSubmit={submitCheck}
              />
            )}

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      {isRules ? 'Regras cadastradas' : 'Checks de compliance'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Gestão operacional com evidência de auditoria.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') load();
                        }}
                        placeholder="Buscar..."
                        className="w-52 rounded-2xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </div>

                    {isRules ? (
                      <select
                        value={enabledFilter}
                        onChange={(event) => setEnabledFilter(event.target.value)}
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      >
                        <option value="ALL">Todas</option>
                        <option value="true">Habilitadas</option>
                        <option value="false">Desabilitadas</option>
                      </select>
                    ) : (
                      <>
                        <select
                          value={severityFilter}
                          onChange={(event) =>
                            setSeverityFilter(event.target.value as 'ALL' | ComplianceSeverity)
                          }
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                        >
                          <option value="ALL">Todas severidades</option>
                          <option value="INFO">INFO</option>
                          <option value="WARNING">WARNING</option>
                          <option value="CRITICAL">CRITICAL</option>
                        </select>

                        <select
                          value={statusFilter}
                          onChange={(event) =>
                            setStatusFilter(event.target.value as 'ALL' | ComplianceStatus)
                          }
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                        >
                          <option value="ALL">Todos status</option>
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="IGNORED">IGNORED</option>
                        </select>
                      </>
                    )}

                    <Button variant="secondary" onClick={() => load()}>
                      Aplicar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Carregando...
                  </div>
                ) : isRules ? (
                  rules.length === 0 ? (
                    <EmptyState mode={mode} />
                  ) : (
                    rules.map((rule) => (
                      <RuleRow
                        key={rule.id}
                        rule={rule}
                        selected={selectedRule?.id === rule.id}
                        actionLoading={actionLoading}
                        onSelect={selectRule}
                        onToggle={toggleRule}
                      />
                    ))
                  )
                ) : checks.length === 0 ? (
                  <EmptyState mode={mode} />
                ) : (
                  checks.map((check) => (
                    <CheckRow
                      key={check.id}
                      check={check}
                      selected={selectedCheck?.id === check.id}
                      actionLoading={actionLoading}
                      onSelect={selectCheck}
                      onStatus={changeCheckStatus}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Detalhe técnico</h2>
              <p className="mt-1 text-sm text-slate-500">
                Evidência operacional para suporte, auditoria e governança.
              </p>

              {isRules ? (
                selectedRule ? (
                  <DetailJson value={selectedRule} />
                ) : (
                  <DetailEmpty />
                )
              ) : selectedCheck ? (
                <DetailJson value={selectedCheck} />
              ) : (
                <DetailEmpty />
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Auditoria relacionada</h2>
              <p className="mt-1 text-sm text-slate-500">Últimos eventos auditáveis do módulo.</p>

              <div className="mt-5 space-y-3">
                {audits.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    Nenhum evento de auditoria carregado.
                  </div>
                ) : (
                  audits.map((audit) => (
                    <div
                      key={audit.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                          {audit.module}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                          {audit.action}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        {formatDate(audit.createdAt)}
                      </div>

                      <pre className="mt-3 max-h-44 overflow-auto rounded-xl bg-slate-900 p-3 text-xs leading-5 text-slate-100">
                        {formatJson(audit.payload)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function RuleForm({
  form,
  setForm,
  canSubmit,
  loading,
  onSubmit,
}: {
  form: RuleFormState;
  setForm: React.Dispatch<React.SetStateAction<RuleFormState>>;
  canSubmit: boolean;
  loading: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Criar regra custom</h2>
      <p className="mt-1 text-sm text-slate-500">
        Regra compatível com o schema BusinessRule atual.
      </p>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Field
            label="Nome"
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="Regra de automação crítica"
            span={2}
          />

          <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  enabled: event.target.checked,
                }))
              }
            />
            Regra habilitada
          </label>
        </div>

        <Field
          label="Descrição"
          value={form.description}
          onChange={(value) => setForm((current) => ({ ...current, description: value }))}
          placeholder="Descrição executiva da regra"
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <JsonTextArea
            label="Condition JSON"
            value={form.condition}
            onChange={(value) => setForm((current) => ({ ...current, condition: value }))}
          />

          <JsonTextArea
            label="Action JSON"
            value={form.action}
            onChange={(value) => setForm((current) => ({ ...current, action: value }))}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="success" disabled={!canSubmit || loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Criar regra
          </Button>
        </div>
      </form>
    </div>
  );
}

function CheckForm({
  form,
  setForm,
  canSubmit,
  loading,
  onSubmit,
}: {
  form: CheckFormState;
  setForm: React.Dispatch<React.SetStateAction<CheckFormState>>;
  canSubmit: boolean;
  loading: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Criar check manual</h2>
      <p className="mt-1 text-sm text-slate-500">
        Registro manual de risco, evidência ou controle operacional.
      </p>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <Field
            label="Check"
            value={form.checkName}
            onChange={(value) => setForm((current) => ({ ...current, checkName: value }))}
            placeholder="Nota fiscal pendente"
            span={2}
          />

          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-700">Severidade</span>
            <select
              value={form.severity}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  severity: event.target.value as ComplianceSeverity,
                }))
              }
              className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
            >
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-700">Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as ComplianceStatus,
                }))
              }
              className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="IGNORED">IGNORED</option>
            </select>
          </label>
        </div>

        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-700">Descrição</span>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={4}
            className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
            placeholder="Descreva o risco, evidência ou pendência operacional..."
          />
        </label>

        <div className="flex justify-end">
          <Button type="submit" variant="success" disabled={!canSubmit || loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Criar check
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  span,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  span?: number;
}) {
  return (
    <label className={`grid gap-2 text-sm ${span === 2 ? 'lg:col-span-2' : ''}`}>
      <span className="font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
      />
    </label>
  );
}

function JsonTextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={10}
        className="font-mono rounded-2xl border border-slate-200 px-3 py-2 text-xs leading-5 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
      />
    </label>
  );
}

function EmptyState({ mode }: { mode: WorkspaceMode }) {
  return (
    <div className="p-10 text-center">
      <FileWarning className="mx-auto h-10 w-10 text-slate-300" />
      <div className="mt-3 text-sm font-semibold text-slate-700">Nenhum registro encontrado.</div>
      <div className="mt-1 text-sm text-slate-500">
        {mode === 'business-rules'
          ? 'Crie uma regra ou aplique as regras padrão.'
          : 'Crie um check ou execute o Compliance Engine.'}
      </div>
    </div>
  );
}

function DetailEmpty() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
      Selecione um registro para ver os detalhes.
    </div>
  );
}

function DetailJson({ value }: { value: unknown }) {
  return (
    <div className="mt-5">
      <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
        {formatJson(value)}
      </pre>
    </div>
  );
}

function RuleRow({
  rule,
  selected,
  actionLoading,
  onSelect,
  onToggle,
}: {
  rule: BusinessRuleEnterpriseRecord;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (rule: BusinessRuleEnterpriseRecord) => void;
  onToggle: (rule: BusinessRuleEnterpriseRecord) => void;
}) {
  const busy = actionLoading === `toggle-rule:${rule.id}`;

  return (
    <article className={`p-5 transition ${selected ? 'bg-purple-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <button type="button" onClick={() => onSelect(rule)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(rule.operationalStatus || String(rule.enabled))}`}
            >
              {rule.operationalStatus || (rule.enabled ? 'ENABLED' : 'DISABLED')}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
              triggers: {rule.triggerCount || 0}
            </span>
          </div>

          <h3 className="mt-3 truncate text-base font-bold text-slate-950">{rule.name}</h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <span>Criada em: {formatDate(rule.createdAt)}</span>
            <span>Último trigger: {formatDate(rule.lastTriggeredAt)}</span>
            <span>{rule.description || 'Sem descrição'}</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={rule.enabled ? 'secondary' : 'success'}
            disabled={busy}
            onClick={() => onToggle(rule)}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : rule.enabled ? (
              <ToggleLeft className="h-4 w-4" />
            ) : (
              <ToggleRight className="h-4 w-4" />
            )}
            {rule.enabled ? 'Desabilitar' : 'Habilitar'}
          </Button>
        </div>
      </div>
    </article>
  );
}

function CheckRow({
  check,
  selected,
  actionLoading,
  onSelect,
  onStatus,
}: {
  check: ComplianceCheckEnterpriseRecord;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (check: ComplianceCheckEnterpriseRecord) => void;
  onStatus: (
    check: ComplianceCheckEnterpriseRecord,
    action: 'in-progress' | 'resolve' | 'ignore' | 'reopen',
  ) => void;
}) {
  const busyPrefix = (action: string) => actionLoading === `${action}:${check.id}`;

  return (
    <article className={`p-5 transition ${selected ? 'bg-purple-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <button type="button" onClick={() => onSelect(check)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(check.severity)}`}
            >
              {check.severity}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(check.status)}`}
            >
              {check.status}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(String(check.resolved))}`}
            >
              {check.resolved ? 'RESOLVED_FLAG' : 'UNRESOLVED'}
            </span>
          </div>

          <h3 className="mt-3 truncate text-base font-bold text-slate-950">{check.checkName}</h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <span>Criado em: {formatDate(check.createdAt)}</span>
            <span>Resolvido em: {formatDate(check.resolvedAt)}</span>
            <span>{check.description || 'Sem descrição'}</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={busyPrefix('in-progress')}
            onClick={() => onStatus(check, 'in-progress')}
          >
            {busyPrefix('in-progress') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CircleDashed className="h-4 w-4" />
            )}
            Em análise
          </Button>

          <Button
            variant="success"
            disabled={busyPrefix('resolve')}
            onClick={() => onStatus(check, 'resolve')}
          >
            {busyPrefix('resolve') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Resolver
          </Button>

          <Button
            variant="secondary"
            disabled={busyPrefix('ignore')}
            onClick={() => onStatus(check, 'ignore')}
          >
            {busyPrefix('ignore') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Ignorar
          </Button>

          <Button
            variant="warning"
            disabled={busyPrefix('reopen')}
            onClick={() => onStatus(check, 'reopen')}
          >
            {busyPrefix('reopen') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Reabrir
          </Button>
        </div>
      </div>
    </article>
  );
}

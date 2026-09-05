'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  CircleAlert,
  Gauge,
  Layers3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
  Webhook,
  Zap,
} from 'lucide-react';

import {
  getModuleCommercialActionLabel,
  getSchemaModuleBySlug,
  isModuleOperationallyAccessible,
  type BcostModuleStatus,
  type BcostSchemaModule,
} from '@/lib/product/schema-modules';
import {
  CommandCenterActivityRecord,
  CommandCenterAuditFinding,
  CommandCenterAuditRecommendation,
  CommandCenterModuleMetric,
  CommandCenterSummaryResponse,
  ExecutiveRisk,
  ExecutiveStatus,
  commandCenterEnterpriseApi,
} from '@/lib/api/command-center-enterprise';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';

type UiMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
};

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

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusTone(status?: ExecutiveStatus | string) {
  const normalized = String(status || '').toUpperCase();

  if (normalized === 'HEALTHY' || normalized === 'UP' || normalized === 'CONNECTED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'ATTENTION' || normalized === 'WARNING') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'CRITICAL' || normalized === 'UNAVAILABLE' || normalized === 'DOWN') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function scoreTone(score: number) {
  if (score >= 90) return 'from-emerald-600 to-teal-500';
  if (score >= 70) return 'from-amber-500 to-orange-500';
  return 'from-red-600 to-rose-500';
}

function scoreBorder(score: number) {
  if (score >= 90) return 'border-emerald-100 bg-emerald-50 text-emerald-800';
  if (score >= 70) return 'border-amber-100 bg-amber-50 text-amber-800';
  return 'border-red-100 bg-red-50 text-red-800';
}

function moduleRoute(slug: string) {
  const directRoutes: Record<string, string> = {
    notifications: '/dashboard/modules/notifications',
    webhooks: '/dashboard/modules/webhooks',
    'compliance-checks': '/dashboard/modules/compliance-checks',
    'business-rules': '/dashboard/modules/business-rules',
    'digital-certificates': '/dashboard/modules/digital-certificates',
    'tax-obligations': '/dashboard/modules/tax-obligations',
    'fiscal-obligations': '/dashboard/modules/fiscal-obligations',
    'account-plan': '/dashboard/modules/account-plan',
    'accounting-entries': '/dashboard/modules/accounting-entries',
    'automation-jobs': '/dashboard/modules/automation-jobs',
    'operational-workflows': '/dashboard/modules/operational-workflows',
    'audit-intelligence': '/dashboard/modules/audit-intelligence',
    'company-formation': '/dashboard/modules/company-formation',
  };

  return directRoutes[slug] || `/dashboard/modules/${slug}`;
}

type ModuleNavigation = {
  enabled: boolean;
  href: string;
  label: string;
  reason?: string;
};

function moduleNavigation(slug: string): ModuleNavigation {
  const schemaModule: BcostSchemaModule | undefined = getSchemaModuleBySlug(slug);
  const status: BcostModuleStatus | undefined = schemaModule?.status;

  if (
    status &&
    !isModuleOperationallyAccessible(
      status,
      schemaModule?.marketReadinessOverride,
    )
  ) {
    return {
      enabled: false,
      href: moduleRoute(slug),
      label: getModuleCommercialActionLabel(
        status,
        schemaModule?.marketReadinessOverride,
      ),
      reason: 'Roadmap bloqueado: módulo sem navegação operacional neste ambiente.',
    };
  }

  return {
    enabled: true,
    href: schemaModule?.route ?? moduleRoute(slug),
    label: status
      ? getModuleCommercialActionLabel(
          status,
          schemaModule?.marketReadinessOverride,
        )
      : 'Abrir módulo',
  };
}

function moduleIcon(slug: string) {
  if (slug.includes('notification')) return <Bell className="h-5 w-5" />;
  if (slug.includes('webhook')) return <Webhook className="h-5 w-5" />;
  if (slug.includes('audit')) return <TerminalSquare className="h-5 w-5" />;
  if (slug.includes('compliance')) return <ShieldAlert className="h-5 w-5" />;
  if (slug.includes('automation')) return <Zap className="h-5 w-5" />;
  if (slug.includes('certificate')) return <ShieldCheck className="h-5 w-5" />;

  return <Layers3 className="h-5 w-5" />;
}

function extractRecordTitle(activity: CommandCenterActivityRecord) {
  const record = activity.record || {};

  return (
    String(record.action || '') ||
    String(record.title || '') ||
    String(record.status || '') ||
    String(record.id || '') ||
    activity.type
  );
}

function extractRecordDate(activity: CommandCenterActivityRecord) {
  const record = activity.record || {};

  return String(record.createdAt || record.updatedAt || '');
}

function Button({
  children,
  onClick,
  disabled,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
}) {
  const variants = {
    default: 'bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300',
    secondary:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${variants[variant]}`}
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

function ScoreRing({ score, status }: { score: number; status: ExecutiveStatus }) {
  const safeScore = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (safeScore / 100) * circumference;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg className="h-40 w-40 -rotate-90" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-white/20"
        />
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-white"
        />
      </svg>

      <div className="absolute text-center text-white">
        <div className="text-4xl font-black">{safeScore}</div>
        <div className="mt-1 text-xs font-bold uppercase tracking-wide opacity-80">{status}</div>
      </div>
    </div>
  );
}

export default function CommandCenterEnterpriseWorkspace() {
  const [companyId, setCompanyId] = useState('');
  const [payload, setPayload] = useState<CommandCenterSummaryResponse | null>(null);
  const [selectedModule, setSelectedModule] = useState<CommandCenterModuleMetric | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<ExecutiveRisk | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<CommandCenterActivityRecord | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<'ALL' | ExecutiveStatus>('ALL');
  const [search, setSearch] = useState('');
  const [includeAudit, setIncludeAudit] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setMessage(null);

      const resolvedCompanyId = companyId || (await resolveEnterpriseCompanyIdWithFallback());
      setCompanyId(resolvedCompanyId);

      const response = await commandCenterEnterpriseApi.summary(resolvedCompanyId, {
        includeAudit,
        includeHealth: true,
        includeSamples: false,
        limit: 15,
      });

      setPayload(response);

      setSelectedModule((current) => {
        if (current) {
          return (
            response.modules.find((item) => item.slug === current.slug) ||
            response.modules[0] ||
            null
          );
        }

        return response.modules[0] || null;
      });

      setSelectedRisk((current) => {
        if (current) {
          return (
            response.risks.find((item) => item.slug === current.slug) || response.risks[0] || null
          );
        }

        return response.risks[0] || null;
      });

      setSelectedActivity((current) => {
        if (current) {
          return current;
        }

        return response.activity[0] || null;
      });
    } catch (error) {
      setMessage({
        type: 'error',
        title: 'Falha ao carregar Command Center Enterprise',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, includeAudit]);

  useEffect(() => {
    load();
  }, [load]);

  const modules = useMemo(() => {
    const all = payload?.modules || [];

    return all.filter((item) => {
      const matchStatus = statusFilter === 'ALL' ? true : item.status === statusFilter;

      const searchValue = `${item.slug} ${item.label} ${item.prismaKey}`.toLowerCase();
      const matchSearch = search.trim() ? searchValue.includes(search.toLowerCase()) : true;

      return matchStatus && matchSearch;
    });
  }, [payload?.modules, statusFilter, search]);

  const summary = payload?.executiveSummary;
  const score = summary?.executiveScore ?? 0;
  const status = summary?.executiveStatus ?? 'UNAVAILABLE';
  const audit = payload?.auditIntelligence;
  const auditQuality = audit?.quality;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div
          className={`overflow-hidden rounded-3xl bg-gradient-to-br ${scoreTone(
            score,
          )} p-1 shadow-sm`}
        >
          <div className="rounded-[1.35rem] bg-slate-950/20 p-6 backdrop-blur">
            <div className="grid gap-6 lg:grid-cols-[1fr_180px] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  <Gauge className="h-4 w-4" />
                  Executive Operations Center
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                  Command Center Enterprise
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-white/80">
                  Painel executivo consolidando riscos, módulos, auditoria, alertas, automações e
                  saúde operacional do bCost em uma visão única para governança SaaS
                  fiscal/financeira.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/80">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                    <Building2 className="h-4 w-4" />
                    {payload?.company?.name || 'Empresa ativa'}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                    <Sparkles className="h-4 w-4" />
                    Plano {payload?.company?.planLevel || '—'}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                    <ShieldCheck className="h-4 w-4" />
                    Powered by Audit Intelligence
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-mono text-xs">
                    {companyId || 'carregando...'}
                  </span>
                </div>
              </div>

              <div className="flex justify-center lg:justify-end">
                <ScoreRing score={score} status={status} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={load} disabled={loading} variant="secondary">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Atualizar
              </Button>

              <Link
                href="/dashboard/modules/audit-intelligence"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Abrir Audit Intelligence
                <ArrowRight className="h-4 w-4" />
              </Link>

              <label className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white">
                <input
                  type="checkbox"
                  checked={includeAudit}
                  onChange={(event) => setIncludeAudit(event.target.checked)}
                />
                Incluir Audit Timeline
              </label>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-2xl border p-4 text-sm ${
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

        <div className="grid gap-4 md:grid-cols-6">
          <KpiCard
            label="Healthy"
            value={summary?.healthyModules ?? 0}
            tone="emerald"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <KpiCard
            label="Attention"
            value={summary?.attentionModules ?? 0}
            tone="amber"
            icon={<CircleAlert className="h-5 w-5" />}
          />
          <KpiCard
            label="Critical"
            value={summary?.criticalModules ?? 0}
            tone="red"
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <KpiCard
            label="Modules"
            value={summary?.availableModules ?? 0}
            tone="blue"
            icon={<Layers3 className="h-5 w-5" />}
          />
          <KpiCard
            label="Audit Score"
            value={summary?.auditQualityScore ?? '—'}
            tone="purple"
            icon={<Gauge className="h-5 w-5" />}
          />
          <KpiCard
            label="Active Signals"
            value={summary?.auditActiveSignals ?? 0}
            tone="red"
            icon={<Activity className="h-5 w-5" />}
          />
          <KpiCard
            label="Historical Noise"
            value={summary?.auditHistoricalNoise ?? 0}
            tone="amber"
            icon={<CircleAlert className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
          <section className="flex flex-col gap-6">
            <AuditIntelligenceCommandCenterPanel
              auditIntelligence={payload?.auditIntelligence}
              auditRisk={(payload?.risks || []).find((risk) => risk.slug === 'audit-intelligence')}
            />

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Top Risks</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Riscos executivos priorizados por impacto no score.
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(status)}`}
                >
                  {status}
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {(payload?.risks || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700">
                    Nenhum risco executivo relevante no momento.
                  </div>
                ) : (
                  (payload?.risks || []).map((risk) => (
                    <RiskCard
                      key={`${risk.slug}-${risk.title}`}
                      risk={risk}
                      selected={selectedRisk?.slug === risk.slug}
                      onSelect={setSelectedRisk}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-purple-700">
                    <ShieldCheck className="h-4 w-4" />
                    Audit Intelligence Signal
                  </div>

                  <h2 className="mt-4 text-xl font-black text-slate-950">
                    Qualidade operacional integrada ao Command Center
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    O score executivo agora considera sinais ativos, ruído histórico, server errors,
                    client errors e recomendações vindas do Audit Intelligence.
                  </p>
                </div>

                <Link
                  href="/dashboard/modules/audit-intelligence"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Ver detalhes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <KpiCard
                  label="Quality Score"
                  value={auditQuality?.qualityScore ?? '—'}
                  tone={
                    (auditQuality?.qualityScore ?? 0) >= 85
                      ? 'emerald'
                      : (auditQuality?.qualityScore ?? 0) >= 60
                        ? 'amber'
                        : 'red'
                  }
                  icon={<Gauge className="h-5 w-5" />}
                />

                <KpiCard
                  label="Server Errors"
                  value={auditQuality?.serverErrors ?? 0}
                  tone="red"
                  icon={<ShieldAlert className="h-5 w-5" />}
                />

                <KpiCard
                  label="Client Errors"
                  value={auditQuality?.clientErrors ?? 0}
                  tone="amber"
                  icon={<AlertTriangle className="h-5 w-5" />}
                />

                <KpiCard
                  label="Audit Cache"
                  value={audit?.cache?.hit ? 'HIT' : 'MISS'}
                  tone={audit?.cache?.hit ? 'emerald' : 'blue'}
                  icon={<Zap className="h-5 w-5" />}
                />
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <h3 className="font-bold text-slate-950">Findings resumidos</h3>

                  <div className="mt-4 grid gap-3">
                    {(audit?.findings || []).length === 0 ? (
                      <EmptyBox text="Nenhum finding retornado." />
                    ) : (
                      audit?.findings.map((finding, index) => (
                        <AuditFindingMiniCard
                          key={finding.id || finding.title || `finding-${index}`}
                          finding={finding}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <h3 className="font-bold text-slate-950">Recomendações executivas</h3>

                  <div className="mt-4 grid gap-3">
                    {(audit?.recommendations || []).length === 0 ? (
                      <EmptyBox text="Nenhuma recomendação retornada." />
                    ) : (
                      audit?.recommendations.map((recommendation, index) => (
                        <AuditRecommendationMiniCard
                          key={
                            recommendation.id || recommendation.title || `recommendation-${index}`
                          }
                          recommendation={recommendation}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Enterprise Modules Matrix</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Visão schema-first de disponibilidade, volume e risco por módulo.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar módulo..."
                      className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                    />

                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(event.target.value as 'ALL' | ExecutiveStatus)
                      }
                      className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="ALL">Todos status</option>
                      <option value="HEALTHY">HEALTHY</option>
                      <option value="ATTENTION">ATTENTION</option>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="UNAVAILABLE">UNAVAILABLE</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Carregando Command Center...
                  </div>
                ) : modules.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    Nenhum módulo encontrado para os filtros atuais.
                  </div>
                ) : (
                  modules.map((metric) => (
                    <ModuleRow
                      key={metric.slug}
                      metric={metric}
                      selected={selectedModule?.slug === metric.slug}
                      onSelect={setSelectedModule}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Recent Activity</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Atividade consolidada de auditoria, notificações, automações e compliance.
                  </p>
                </div>

                <Activity className="h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-5 space-y-3">
                {(payload?.activity || []).slice(0, 12).map((activity, index) => (
                  <button
                    key={`${activity.type}-${activity.source}-${index}`}
                    type="button"
                    onClick={() => setSelectedActivity(activity)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedActivity === activity
                        ? 'border-purple-200 bg-purple-50'
                        : 'border-slate-100 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                        {activity.type}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                        {activity.source}
                      </span>
                    </div>

                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {extractRecordTitle(activity)}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {formatDate(extractRecordDate(activity))}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Selected Module</h2>
              <p className="mt-1 text-sm text-slate-500">
                Indicadores técnicos do módulo selecionado.
              </p>

              {selectedModule ? (
                <div className="mt-5 space-y-4">
                  <div
                    className={`rounded-2xl border p-4 ${scoreBorder(selectedModule.riskScore)}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm opacity-70">{selectedModule.label}</div>
                        <div className="mt-1 text-3xl font-black">{selectedModule.riskScore}</div>
                      </div>
                      {moduleIcon(selectedModule.slug)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MiniMetric label="Total" value={selectedModule.total} />
                    <MiniMetric label="Critical" value={selectedModule.critical || 0} />
                    <MiniMetric label="Warning" value={selectedModule.warning || 0} />
                    <MiniMetric label="Failed" value={selectedModule.failed || 0} />
                    <MiniMetric label="Unread" value={selectedModule.unread || 0} />
                    <MiniMetric label="Open" value={selectedModule.open || 0} />
                  </div>

                  {(() => {
                    const navigation = moduleNavigation(selectedModule.slug);

                    return navigation.enabled ? (
                      <Link
                        href={navigation.href}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        {navigation.label}
                      </Link>
                    ) : (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <div className="font-bold">{navigation.label}</div>
                        <div className="mt-1">{navigation.reason}</div>
                      </div>
                    );
                  })()}

                  {selectedModule.slug === 'audit-intelligence' && (
                    <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-800">
                      <div className="font-bold">Audit Intelligence integrado</div>
                      <div className="mt-1">
                        Quality Score: {summary?.auditQualityScore ?? '—'} · Status:{' '}
                        {summary?.auditQualityStatus ?? 'UNAVAILABLE'}
                      </div>
                    </div>
                  )}

                  <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                    {formatJson(selectedModule)}
                  </pre>
                </div>
              ) : (
                <EmptyBox text="Nenhum módulo selecionado." />
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Selected Risk</h2>
              <p className="mt-1 text-sm text-slate-500">
                Evidência executiva do risco selecionado.
              </p>

              {selectedRisk ? (
                <div className="mt-5 space-y-4">
                  <div className={`rounded-2xl border p-4 ${statusTone(selectedRisk.severity)}`}>
                    <div className="text-sm font-bold">{selectedRisk.title}</div>
                    <div className="mt-2 text-xs opacity-80">
                      Impacto: {selectedRisk.scoreImpact}
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-slate-600">{selectedRisk.description}</p>

                  <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                    {formatJson(selectedRisk.evidence)}
                  </pre>
                </div>
              ) : (
                <EmptyBox text="Nenhum risco selecionado." />
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">System Health</h2>

              <div className="mt-5 grid gap-3">
                <HealthRow label="API" value={payload?.health?.api || '—'} />
                <HealthRow label="Database" value={payload?.health?.database || '—'} />
                <HealthRow label="Command Center" value={payload?.health?.commandCenter || '—'} />
                <HealthRow label="Generated At" value={formatDate(payload?.health?.generatedAt)} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Selected Activity</h2>

              <pre className="mt-5 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {formatJson(selectedActivity)}
              </pre>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function AuditFindingMiniCard({ finding }: { finding: CommandCenterAuditFinding }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(finding.severity || undefined)}`}
        >
          {finding.severity || 'INFO'}
        </span>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
          {finding.count} eventos
        </span>
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-950">
        {finding.title || finding.id || 'Finding'}
      </h3>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniMetric label="Modules" value={finding.evidenceSummary?.byModule?.length ?? 0} />
        <MiniMetric label="Actions" value={finding.evidenceSummary?.byAction?.length ?? 0} />
        <MiniMetric label="Latest" value={finding.evidenceSummary?.latestSummaryCount ?? 0} />
      </div>
    </div>
  );
}

function AuditRecommendationMiniCard({
  recommendation,
}: {
  recommendation: CommandCenterAuditRecommendation;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div
        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(recommendation.priority || undefined)}`}
      >
        {recommendation.priority || 'INFO'}
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-950">
        {recommendation.title || recommendation.id || 'Recommendation'}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {recommendation.action || 'Sem ação recomendada.'}
      </p>
    </div>
  );
}

function AuditIntelligenceCommandCenterPanel({
  auditIntelligence,
  auditRisk,
}: {
  auditIntelligence: CommandCenterSummaryResponse['auditIntelligence'];
  auditRisk?: ExecutiveRisk;
}) {
  const quality = auditIntelligence?.quality;
  const available = Boolean(auditIntelligence?.available && quality);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-purple-700">
            <ShieldCheck className="h-4 w-4" />
            Powered by Audit Intelligence
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-950">
            Audit Intelligence integrado ao Command Center
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            O score executivo agora considera qualidade de auditoria, sinais ativos, ruído
            histórico, server errors e client errors, consumindo o payload slim validado no backend.
          </p>
        </div>

        <Link
          href="/dashboard/modules/audit-intelligence"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Abrir Audit Intelligence
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {!available ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Audit Intelligence indisponível no payload atual.
          {auditIntelligence?.error ? ` ${auditIntelligence.error}` : ''}
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-5">
            <KpiCard
              label="Quality Score"
              value={quality?.qualityScore ?? '—'}
              tone={
                (quality?.qualityScore ?? 0) >= 85
                  ? 'emerald'
                  : (quality?.qualityScore ?? 0) >= 60
                    ? 'amber'
                    : 'red'
              }
              icon={<Gauge className="h-5 w-5" />}
            />
            <KpiCard
              label="Active Signals"
              value={quality?.activeSignals ?? 0}
              tone="red"
              icon={<Activity className="h-5 w-5" />}
            />
            <KpiCard
              label="Historical Noise"
              value={quality?.historicalNoise ?? 0}
              tone="amber"
              icon={<CircleAlert className="h-5 w-5" />}
            />
            <KpiCard
              label="Server Errors"
              value={quality?.serverErrors ?? 0}
              tone="red"
              icon={<ShieldAlert className="h-5 w-5" />}
            />
            <KpiCard
              label="Client Errors"
              value={quality?.clientErrors ?? 0}
              tone="amber"
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-950">Findings resumidos</h3>
              <div className="mt-4 grid gap-3">
                {(auditIntelligence?.findings || []).length === 0 ? (
                  <EmptyBox text="Nenhum finding retornado pelo Audit Intelligence." />
                ) : (
                  auditIntelligence?.findings.map((finding) => (
                    <AuditFindingMiniCard
                      key={finding.id || finding.title || String(finding.count)}
                      finding={finding}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="font-bold text-slate-950">Recomendações executivas</h3>
              <div className="mt-4 grid gap-3">
                {(auditIntelligence?.recommendations || []).length === 0 ? (
                  <EmptyBox text="Nenhuma recomendação retornada pelo Audit Intelligence." />
                ) : (
                  auditIntelligence?.recommendations.map((recommendation) => (
                    <AuditRecommendationMiniCard
                      key={
                        recommendation.id ||
                        recommendation.title ||
                        recommendation.action ||
                        'recommendation'
                      }
                      recommendation={recommendation}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {auditRisk && (
            <div className={`mt-5 rounded-2xl border p-4 ${statusTone(auditRisk.severity)}`}>
              <div className="text-sm font-bold">{auditRisk.title}</div>
              <p className="mt-2 text-xs leading-5 opacity-80">{auditRisk.description}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function RiskCard({
  risk,
  selected,
  onSelect,
}: {
  risk: ExecutiveRisk;
  selected: boolean;
  onSelect: (risk: ExecutiveRisk) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(risk)}
      className={`rounded-2xl border p-4 text-left transition ${
        selected ? 'border-purple-200 bg-purple-50' : 'border-slate-100 bg-slate-50 hover:bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-xl p-2 ${statusTone(risk.severity)}`}>
          {risk.severity === 'CRITICAL' ? (
            <ShieldAlert className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(risk.severity)}`}
            >
              {risk.severity}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
              Impacto {risk.scoreImpact}
            </span>
          </div>

          <h3 className="mt-3 text-sm font-bold text-slate-950">{risk.title}</h3>

          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{risk.description}</p>
        </div>
      </div>
    </button>
  );
}

function ModuleRow({
  metric,
  selected,
  onSelect,
}: {
  metric: CommandCenterModuleMetric;
  selected: boolean;
  onSelect: (metric: CommandCenterModuleMetric) => void;
}) {
  return (
    <article className={`p-5 transition ${selected ? 'bg-purple-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <button type="button" onClick={() => onSelect(metric)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl border p-3 ${statusTone(metric.status)}`}>
              {moduleIcon(metric.slug)}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-950">{metric.label}</h3>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(metric.status)}`}
                >
                  {metric.status}
                </span>
              </div>

              <div className="mt-1 font-mono text-xs text-slate-500">
                {metric.slug} · {metric.prismaKey}
              </div>
            </div>
          </div>
        </button>

        <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-6 xl:w-[560px]">
          <MiniMetric label="Score" value={metric.riskScore} />
          <MiniMetric label="Total" value={metric.total} />
          <MiniMetric label="Crit." value={metric.critical || 0} />
          <MiniMetric label="Warn." value={metric.warning || 0} />
          <MiniMetric label="Fail" value={metric.failed || 0} />
          <MiniMetric label="Unread" value={metric.unread || 0} />
        </div>
      </div>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(value)}`}>
        {value}
      </span>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

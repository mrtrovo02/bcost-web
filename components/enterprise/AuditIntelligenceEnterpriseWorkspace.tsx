'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  CircleAlert,
  Database,
  Gauge,
  Layers3,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Zap,
} from 'lucide-react';

import {
  AuditBreakdownItem,
  AuditExecutiveFinding,
  AuditIntelligenceExecutiveResponse,
  AuditQualityStatus,
  AuditRecommendation,
  auditIntelligenceEnterpriseApi,
} from '@/lib/api/audit-intelligence-enterprise';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';

type UiMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
};

type FindingFilter = 'ALL' | 'INFO' | 'WARNING' | 'CRITICAL';

function formatJson(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusTone(status?: string) {
  const normalized = String(status || '').toUpperCase();

  if (normalized === 'HEALTHY' || normalized === 'OK' || normalized === 'INFO') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (
    normalized === 'ATTENTION' ||
    normalized === 'WARNING' ||
    normalized === 'HIGH' ||
    normalized === 'MEDIUM'
  ) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'CRITICAL' || normalized === 'ERROR') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function scoreTone(score: number) {
  if (score >= 85) return 'from-emerald-600 to-teal-500';
  if (score >= 60) return 'from-amber-500 to-orange-500';
  return 'from-red-600 to-rose-500';
}

function scoreBorder(score: number) {
  if (score >= 85) return 'border-emerald-100 bg-emerald-50 text-emerald-800';
  if (score >= 60) return 'border-amber-100 bg-amber-50 text-amber-800';
  return 'border-red-100 bg-red-50 text-red-800';
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

function ScoreRing({ score, status }: { score: number; status: AuditQualityStatus }) {
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

function BreakdownList({
  title,
  items,
  icon,
}: {
  title: string;
  items: AuditBreakdownItem[];
  icon: React.ReactNode;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">Top ocorrências do período.</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 text-slate-500">{icon}</div>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
            Nenhum dado encontrado.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-slate-700" title={item.key}>
                  {item.key}
                </span>
                <span className="font-black text-slate-950">{item.count}</span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-2 rounded-full bg-slate-900"
                  style={{ width: `${Math.max(6, (item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function FindingCard({
  finding,
  selected,
  onSelect,
}: {
  finding: AuditExecutiveFinding;
  selected: boolean;
  onSelect: (finding: AuditExecutiveFinding) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(finding)}
      className={`rounded-2xl border p-4 text-left transition ${
        selected ? 'border-purple-200 bg-purple-50' : 'border-slate-100 bg-slate-50 hover:bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-xl border p-2 ${statusTone(finding.severity)}`}>
          {finding.severity === 'CRITICAL' ? (
            <ShieldAlert className="h-5 w-5" />
          ) : finding.severity === 'WARNING' ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(finding.severity)}`}
            >
              {finding.severity}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
              {finding.count} eventos
            </span>
          </div>

          <h3 className="mt-3 text-sm font-bold text-slate-950">{finding.title}</h3>

          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
            {finding.description}
          </p>
        </div>
      </div>
    </button>
  );
}

function RecommendationCard({
  recommendation,
  selected,
  onSelect,
}: {
  recommendation: AuditRecommendation;
  selected: boolean;
  onSelect: (recommendation: AuditRecommendation) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(recommendation)}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected ? 'border-purple-200 bg-purple-50' : 'border-slate-100 bg-slate-50 hover:bg-white'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(recommendation.priority)}`}
        >
          {recommendation.priority}
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
          {recommendation.id}
        </span>
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-950">{recommendation.title}</h3>

      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
        {recommendation.description}
      </p>
    </button>
  );
}

export default function AuditIntelligenceEnterpriseWorkspace() {
  const [companyId, setCompanyId] = useState('');
  const [payload, setPayload] = useState<AuditIntelligenceExecutiveResponse | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<AuditExecutiveFinding | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<AuditRecommendation | null>(
    null,
  );
  const [findingFilter, setFindingFilter] = useState<FindingFilter>('ALL');
  const [search, setSearch] = useState('');
  const [lookback, setLookback] = useState(300);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setMessage(null);

      const resolvedCompanyId = companyId || (await resolveEnterpriseCompanyIdWithFallback());
      setCompanyId(resolvedCompanyId);

      const response = await auditIntelligenceEnterpriseApi.executive(resolvedCompanyId, {
        lookback,
        limit: 10,
        includeRecommendations: true,
      });

      setPayload(response);

      setSelectedFinding((current) => {
        if (current) {
          return (
            response.findings.find((item) => item.id === current.id) || response.findings[0] || null
          );
        }

        return response.findings[0] || null;
      });

      setSelectedRecommendation((current) => {
        if (current) {
          return (
            response.recommendations.find((item) => item.id === current.id) ||
            response.recommendations[0] ||
            null
          );
        }

        return response.recommendations[0] || null;
      });
    } catch (error) {
      setMessage({
        type: 'error',
        title: 'Falha ao carregar Audit Intelligence Enterprise',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, lookback]);

  useEffect(() => {
    load();
  }, [load]);

  const findings = useMemo(() => {
    const all = payload?.findings || [];

    return all.filter((item) => {
      const matchSeverity = findingFilter === 'ALL' ? true : item.severity === findingFilter;

      const searchValue = `${item.id} ${item.title} ${item.description}`.toLowerCase();
      const matchSearch = search.trim() ? searchValue.includes(search.toLowerCase()) : true;

      return matchSeverity && matchSearch;
    });
  }, [payload?.findings, findingFilter, search]);

  const quality = payload?.quality;
  const score = quality?.qualityScore ?? 0;
  const status = quality?.qualityStatus ?? 'CRITICAL';

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
                  <ShieldCheck className="h-4 w-4" />
                  Audit Intelligence Enterprise
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                  Audit Intelligence
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-white/80">
                  Camada executiva de qualidade operacional, auditoria e observabilidade. Consolida
                  falhas, ruído histórico, sinais ativos, recomendações e top breakdowns para
                  governança SaaS.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/80">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                    <Sparkles className="h-4 w-4" />
                    Payload {payload?.payloadProfile?.latestEvidenceMode || '—'}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                    <Database className="h-4 w-4" />
                    {quality?.recordsAnalyzed ?? 0} registros analisados
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

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button onClick={load} disabled={loading} variant="secondary">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Atualizar
              </Button>

              <select
                value={lookback}
                onChange={(event) => setLookback(Number(event.target.value))}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none"
              >
                <option className="text-slate-900" value={100}>
                  Lookback 100
                </option>
                <option className="text-slate-900" value={300}>
                  Lookback 300
                </option>
                <option className="text-slate-900" value={500}>
                  Lookback 500
                </option>
                <option className="text-slate-900" value={1000}>
                  Lookback 1000
                </option>
              </select>
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
          <KpiCard
            label="Modules"
            value={payload?.totals.modules ?? 0}
            tone="blue"
            icon={<Layers3 className="h-5 w-5" />}
          />
          <KpiCard
            label="Endpoints"
            value={payload?.totals.endpoints ?? 0}
            tone="purple"
            icon={<TerminalSquare className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
          <section className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Executive Findings</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Achados executivos com evidência resumida para dashboard.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar finding..."
                        className="rounded-2xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </div>

                    <select
                      value={findingFilter}
                      onChange={(event) => setFindingFilter(event.target.value as FindingFilter)}
                      className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="ALL">Todos</option>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="WARNING">WARNING</option>
                      <option value="INFO">INFO</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 lg:grid-cols-2">
                {loading ? (
                  <div className="col-span-full flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Carregando Audit Intelligence...
                  </div>
                ) : findings.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    Nenhum finding encontrado para os filtros atuais.
                  </div>
                ) : (
                  findings.map((finding) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      selected={selectedFinding?.id === finding.id}
                      onSelect={setSelectedFinding}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <BreakdownList
                title="Top Modules"
                items={payload?.topBreakdowns.byModule || []}
                icon={<Layers3 className="h-5 w-5" />}
              />

              <BreakdownList
                title="Top Actions"
                items={payload?.topBreakdowns.byAction || []}
                icon={<Zap className="h-5 w-5" />}
              />

              <BreakdownList
                title="Top Endpoints"
                items={payload?.topBreakdowns.byEndpoint || []}
                icon={<TerminalSquare className="h-5 w-5" />}
              />

              <BreakdownList
                title="Top Days"
                items={payload?.topBreakdowns.byDay || []}
                icon={<BarChart3 className="h-5 w-5" />}
              />
            </section>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Quality Snapshot</h2>

              <div className={`mt-5 rounded-2xl border p-5 ${scoreBorder(score)}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm opacity-70">Quality Score</div>
                    <div className="mt-2 text-4xl font-black">{score}</div>
                  </div>
                  <Gauge className="h-7 w-7" />
                </div>

                <div
                  className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusTone(status)}`}
                >
                  {status}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniMetric label="Records" value={quality?.recordsAnalyzed ?? 0} />
                <MiniMetric label="Critical" value={quality?.criticalEvents ?? 0} />
                <MiniMetric label="Warning" value={quality?.warningEvents ?? 0} />
                <MiniMetric label="Noise" value={quality?.historicalNoise ?? 0} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Supporting Signals</h2>

              <div className="mt-5 grid gap-3">
                <SignalBlock
                  title="Notifications"
                  icon={<Bell className="h-5 w-5" />}
                  rows={[
                    ['Total', payload?.supportingSignals.notifications.total ?? 0],
                    ['Critical', payload?.supportingSignals.notifications.critical ?? 0],
                    ['Warning', payload?.supportingSignals.notifications.warning ?? 0],
                    ['Unread', payload?.supportingSignals.notifications.unread ?? 0],
                  ]}
                />

                <SignalBlock
                  title="Automation Jobs"
                  icon={<Zap className="h-5 w-5" />}
                  rows={[
                    ['Total', payload?.supportingSignals.automationJobs.total ?? 0],
                    ['Failed', payload?.supportingSignals.automationJobs.failed ?? 0],
                    ['Queued', payload?.supportingSignals.automationJobs.queued ?? 0],
                    ['Running', payload?.supportingSignals.automationJobs.running ?? 0],
                  ]}
                />

                <SignalBlock
                  title="Compliance Checks"
                  icon={<ShieldCheck className="h-5 w-5" />}
                  rows={[
                    ['Total', payload?.supportingSignals.complianceChecks.total ?? 0],
                    ['Critical', payload?.supportingSignals.complianceChecks.critical ?? 0],
                    ['Warning', payload?.supportingSignals.complianceChecks.warning ?? 0],
                    ['Open', payload?.supportingSignals.complianceChecks.open ?? 0],
                  ]}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Recommendations</h2>

              <div className="mt-5 space-y-3">
                {(payload?.recommendations || []).map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    selected={selectedRecommendation?.id === recommendation.id}
                    onSelect={setSelectedRecommendation}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Selected Evidence</h2>

              <pre className="mt-5 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {formatJson({
                  finding: selectedFinding,
                  recommendation: selectedRecommendation,
                  payloadProfile: payload?.payloadProfile,
                  generatedAt: payload?.generatedAt,
                })}
              </pre>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SignalBlock({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Array<[string, string | number]>;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2 font-bold text-slate-950">
        <span className="rounded-xl bg-white p-2 text-slate-500">{icon}</span>
        {title}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {rows.map(([label, value]) => (
          <MiniMetric key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import {
  automationJobsApi,
  AutomationJobRecord,
  AutomationJobsListResponse,
  AuditLogRecord,
} from '@/lib/api/automation-jobs';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';

type WidgetState = {
  loading: boolean;
  error: string | null;
  companyId: string;
  jobs: AutomationJobRecord[];
  payload: AutomationJobsListResponse | null;
  latestRetryAudit: AuditLogRecord | null;
};

const INITIAL_STATE: WidgetState = {
  loading: true,
  error: null,
  companyId: '',
  jobs: [],
  payload: null,
  latestRetryAudit: null,
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

function normalizeStatus(status?: string | null) {
  return String(status || 'UNKNOWN').toUpperCase();
}

function statusClass(status?: string | null) {
  const value = normalizeStatus(status);

  if (value === 'COMPLETED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (value === 'FAILED') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (value === 'RUNNING') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (value === 'QUEUED' || value === 'PENDING') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function statusLabel(status?: string | null) {
  const value = normalizeStatus(status);

  const labels: Record<string, string> = {
    COMPLETED: 'Concluído',
    FAILED: 'Falhou',
    RUNNING: 'Executando',
    QUEUED: 'Na fila',
    PENDING: 'Pendente',
    CANCELLED: 'Cancelado',
    CANCELED: 'Cancelado',
  };

  return labels[value] || value;
}

function getJobEngine(job?: AutomationJobRecord | null): string | null {
  const result = job?.result;

  if (!result || typeof result !== 'object') {
    return null;
  }

  const payload = result as Record<string, unknown>;

  return typeof payload.engine === 'string' ? payload.engine : null;
}

function getJobResultStatus(job?: AutomationJobRecord | null): string | null {
  const result = job?.result;

  if (!result || typeof result !== 'object') {
    return null;
  }

  const payload = result as Record<string, unknown>;

  if (typeof payload.status === 'string') {
    return payload.status;
  }

  if (
    payload.result &&
    typeof payload.result === 'object' &&
    typeof (payload.result as Record<string, unknown>).status === 'string'
  ) {
    return (payload.result as Record<string, unknown>).status as string;
  }

  return null;
}

function getJobTotals(job?: AutomationJobRecord | null): Record<string, unknown> | null {
  const result = job?.result;

  if (!result || typeof result !== 'object') {
    return null;
  }

  const payload = result as Record<string, unknown>;

  if (
    payload.result &&
    typeof payload.result === 'object' &&
    (payload.result as Record<string, unknown>).totals &&
    typeof (payload.result as Record<string, unknown>).totals === 'object'
  ) {
    return (payload.result as Record<string, unknown>).totals as Record<string, unknown>;
  }

  if (payload.totals && typeof payload.totals === 'object') {
    return payload.totals as Record<string, unknown>;
  }

  return null;
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: 'slate' | 'red' | 'emerald' | 'blue' | 'amber';
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-950',
    red: 'border-red-100 bg-red-50 text-red-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium opacity-70">{label}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
        </div>
        <div className="rounded-xl bg-white/70 p-2">{icon}</div>
      </div>
    </div>
  );
}

export default function AutomationJobsExecutiveWidget() {
  const [state, setState] = useState<WidgetState>(INITIAL_STATE);

  const load = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const companyId = await resolveEnterpriseCompanyIdWithFallback();

      const [jobsResponse, auditResponse] = await Promise.all([
        automationJobsApi.list(companyId, {
          limit: 50,
          type: 'ALL',
        }),
        automationJobsApi.audit(companyId, {
          limit: 5,
          module: 'automation',
          action: 'AUTOMATION_JOB_RETRY_EXECUTED',
        }),
      ]);

      setState({
        loading: false,
        error: null,
        companyId,
        jobs: jobsResponse.items || [],
        payload: jobsResponse,
        latestRetryAudit: auditResponse.items?.[0] || null,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o resumo de automações.';

      setState((current) => ({
        ...current,
        loading: false,
        error: message,
      }));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const counters = useMemo(() => {
    const result = {
      total: state.jobs.length,
      failed: 0,
      completed: 0,
      running: 0,
      pending: 0,
      cancelled: 0,
    };

    for (const job of state.jobs) {
      const status = normalizeStatus(job.status);

      if (status === 'FAILED') result.failed += 1;
      else if (status === 'COMPLETED') result.completed += 1;
      else if (status === 'RUNNING') result.running += 1;
      else if (status === 'PENDING' || status === 'QUEUED') result.pending += 1;
      else if (status === 'CANCELLED' || status === 'CANCELED') {
        result.cancelled += 1;
      }
    }

    return result;
  }, [state.jobs]);

  const latestJob = useMemo(() => {
    return (
      [...state.jobs].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();

        return dateB - dateA;
      })[0] || null
    );
  }, [state.jobs]);

  const latestFailed = useMemo(() => {
    return state.jobs.find((job) => normalizeStatus(job.status) === 'FAILED') || null;
  }, [state.jobs]);

  const latestCompleted = useMemo(() => {
    return state.jobs.find((job) => normalizeStatus(job.status) === 'COMPLETED') || null;
  }, [state.jobs]);

  const latestTotals = getJobTotals(latestCompleted || latestJob);
  const latestEngine = getJobEngine(latestCompleted || latestJob);
  const latestResultStatus = getJobResultStatus(latestCompleted || latestJob);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            <ShieldCheck className="h-4 w-4" />
            Automation Operations
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Operação de automações enterprise
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Monitoramento executivo de jobs, falhas, retries, auditoria e execução real de processos
            críticos como Revenue Billing.
          </p>

          {state.companyId && (
            <div className="mt-2 text-xs text-slate-500">
              Empresa:{' '}
              <span className="font-mono font-semibold text-slate-700">{state.companyId}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={state.loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {state.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar
          </button>

          <Link
            href="/dashboard/modules/automation-jobs"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Abrir central
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {state.error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold">Falha ao carregar automações</div>
          <div className="mt-1">{state.error}</div>
        </div>
      )}

      {state.loading && !state.error ? (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 p-8 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando resumo operacional...
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            <KpiCard
              label="Total"
              value={counters.total}
              tone="slate"
              icon={<Activity className="h-5 w-5" />}
            />
            <KpiCard
              label="Falhas"
              value={counters.failed}
              tone="red"
              icon={<XCircle className="h-5 w-5" />}
            />
            <KpiCard
              label="Concluídos"
              value={counters.completed}
              tone="emerald"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <KpiCard
              label="Executando"
              value={counters.running}
              tone="blue"
              icon={<Loader2 className="h-5 w-5" />}
            />
            <KpiCard
              label="Fila/Pendente"
              value={counters.pending}
              tone="amber"
              icon={<Clock className="h-5 w-5" />}
            />
          </div>

          {counters.failed > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
                <div>
                  <div className="font-semibold">
                    Existem {counters.failed} job(s) com falha operacional.
                  </div>
                  <div className="mt-1">
                    Acesse a central para reprocessar, reconhecer ou cancelar com auditoria.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Último job
              </div>

              {latestJob ? (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                        latestJob.status,
                      )}`}
                    >
                      {statusLabel(latestJob.status)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {latestJob.type || 'UNKNOWN'}
                    </span>
                  </div>

                  <div className="mt-3 truncate text-sm font-bold text-slate-950">
                    {latestJob.name || latestJob.id}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Atualizado em {formatDate(latestJob.updatedAt || latestJob.createdAt)}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-500">Nenhum job encontrado.</div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Último retry auditado
              </div>

              {state.latestRetryAudit ? (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                    <RotateCcw className="h-4 w-4" />
                    {state.latestRetryAudit.action}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {formatDate(state.latestRetryAudit.createdAt)}
                  </div>

                  <div className="mt-2 truncate text-xs text-slate-500">
                    Job: {state.latestRetryAudit.entityId || '—'}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-500">Nenhum retry auditado encontrado.</div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Resultado recente
              </div>

              <div className="mt-3 space-y-2">
                <div className="text-sm">
                  <span className="text-slate-500">Engine: </span>
                  <span className="font-semibold text-slate-950">{latestEngine || '—'}</span>
                </div>

                <div className="text-sm">
                  <span className="text-slate-500">Status: </span>
                  <span className="font-semibold text-slate-950">{latestResultStatus || '—'}</span>
                </div>

                {latestTotals && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {['processed', 'created', 'skipped'].map((key) => (
                      <div key={key} className="rounded-xl border border-slate-200 bg-white p-2">
                        <div className="text-[10px] uppercase text-slate-400">{key}</div>
                        <div className="text-sm font-bold text-slate-950">
                          {String(latestTotals[key] ?? 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {latestFailed && (
            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-red-500">
                Falha mais recente
              </div>
              <div className="mt-2 text-sm font-bold text-red-800">
                {latestFailed.name || latestFailed.id}
              </div>
              <div className="mt-1 text-xs text-red-700">
                {latestFailed.error || 'A falha está registrada no result/payload do job.'}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import {
  automationJobsApi,
  AutomationJobActionResponse,
  AutomationJobRecord,
  AutomationJobsListResponse,
  AuditLogRecord,
} from '@/lib/api/automation-jobs';
import { api } from '@/services/api';

type AuthMeResponse = {
  id: string;
  email: string;
  companyId?: string;
  role?: string;
  [key: string]: unknown;
};

type UiMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
};

const DEFAULT_LIMIT = 20;

function isBrowser() {
  return typeof window !== 'undefined';
}

function readStoredCompanyId(): string | null {
  if (!isBrowser()) return null;

  const keys = ['bcost_active_company', 'bcost_company_id', 'companyId', 'activeCompanyId'];

  for (const key of keys) {
    const value = localStorage.getItem(key);

    if (value && value !== 'null' && value !== 'undefined' && value !== 'ID_DA_EMPRESA') {
      return value;
    }
  }

  try {
    const rawUser =
      localStorage.getItem('bcost_user') ||
      localStorage.getItem('user') ||
      localStorage.getItem('auth_user');

    if (rawUser) {
      const parsed = JSON.parse(rawUser) as Record<string, unknown>;
      const companyId = parsed.companyId || parsed.activeCompanyId || parsed.company_id;

      if (typeof companyId === 'string' && companyId) {
        return companyId;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function resolveCompanyId(): Promise<string> {
  const stored = readStoredCompanyId();

  if (stored) {
    return stored;
  }

  const response = await api.get<AuthMeResponse>('/auth/me');
  const companyId = response.data.companyId;

  if (!companyId) {
    throw new Error('Empresa ativa não encontrada para consultar automações.');
  }

  if (isBrowser()) {
    localStorage.setItem('bcost_active_company', companyId);
  }

  return companyId;
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatJson(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '—';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusLabel(status?: string | null) {
  const value = String(status || 'UNKNOWN').toUpperCase();

  const labels: Record<string, string> = {
    RUNNING: 'Em execução',
    COMPLETED: 'Concluído',
    FAILED: 'Falhou',
    QUEUED: 'Na fila',
    PENDING: 'Pendente',
    CANCELLED: 'Cancelado',
    CANCELED: 'Cancelado',
  };

  return labels[value] || value;
}

function statusClass(status?: string | null) {
  const value = String(status || 'UNKNOWN').toUpperCase();

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

  if (value === 'CANCELLED' || value === 'CANCELED') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function statusIcon(status?: string | null) {
  const value = String(status || 'UNKNOWN').toUpperCase();

  if (value === 'COMPLETED') {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (value === 'FAILED') {
    return <XCircle className="h-4 w-4" />;
  }

  if (value === 'RUNNING') {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  if (value === 'QUEUED' || value === 'PENDING') {
    return <Clock className="h-4 w-4" />;
  }

  if (value === 'CANCELLED' || value === 'CANCELED') {
    return <PauseCircle className="h-4 w-4" />;
  }

  return <Activity className="h-4 w-4" />;
}

function extractResultStatus(job?: AutomationJobRecord | null) {
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

function extractEngine(job?: AutomationJobRecord | null) {
  const result = job?.result;

  if (!result || typeof result !== 'object') {
    return null;
  }

  const payload = result as Record<string, unknown>;
  const engine = payload.engine;

  return typeof engine === 'string' ? engine : null;
}

function extractTotals(job?: AutomationJobRecord | null) {
  const result = job?.result;

  if (!result || typeof result !== 'object') {
    return null;
  }

  const payload = result as Record<string, unknown>;

  if (
    payload.result &&
    typeof payload.result === 'object' &&
    (payload.result as Record<string, unknown>).totals
  ) {
    return (payload.result as Record<string, unknown>).totals as Record<string, unknown>;
  }

  if (payload.totals && typeof payload.totals === 'object') {
    return payload.totals as Record<string, unknown>;
  }

  return null;
}

function Button({
  children,
  onClick,
  disabled,
  variant = 'default',
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'secondary' | 'success';
  title?: string;
}) {
  const classes = {
    default: 'bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
    secondary:
      'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${classes[variant]}`}
    >
      {children}
    </button>
  );
}

export default function AutomationJobsPage() {
  const [companyId, setCompanyId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('REVENUE_BILLING');
  const [search, setSearch] = useState<string>('');
  const [payload, setPayload] = useState<AutomationJobsListResponse | null>(null);
  const [selectedJob, setSelectedJob] = useState<AutomationJobRecord | null>(null);
  const [audits, setAudits] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const jobs = useMemo(() => payload?.items || [], [payload?.items]);

  const counters = useMemo(() => {
    const result = {
      total: jobs.length,
      completed: 0,
      failed: 0,
      running: 0,
      pending: 0,
    };

    for (const job of jobs) {
      const status = String(job.status || '').toUpperCase();

      if (status === 'COMPLETED') result.completed += 1;
      else if (status === 'FAILED') result.failed += 1;
      else if (status === 'RUNNING') result.running += 1;
      else if (status === 'PENDING' || status === 'QUEUED') {
        result.pending += 1;
      }
    }

    return result;
  }, [jobs]);

  const loadAudits = useCallback(
    async (id: string) => {
      if (!id) return;

      try {
        const response = await automationJobsApi.audit(companyId, {
          limit: 10,
          module: 'automation',
          entityId: id,
        });

        setAudits(response.items || []);
      } catch {
        setAudits([]);
      }
    },
    [companyId],
  );

  const loadJobs = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) {
          setLoading(true);
        }

        const resolvedCompanyId = companyId || (await resolveCompanyId());
        setCompanyId(resolvedCompanyId);

        const response = await automationJobsApi.list(resolvedCompanyId, {
          limit: DEFAULT_LIMIT,
          status: statusFilter,
          type: typeFilter,
          search,
        });

        setPayload(response);

        if (response.items?.length) {
          const currentStillExists = response.items.find((item) => item.id === selectedJob?.id);

          const nextSelected = currentStillExists || response.items[0];
          setSelectedJob(nextSelected);
          await loadAudits(nextSelected.id);
        } else {
          setSelectedJob(null);
          setAudits([]);
        }
      } catch (error) {
        const description =
          error instanceof Error ? error.message : 'Não foi possível carregar automações.';

        setMessage({
          type: 'error',
          title: 'Falha ao carregar automações',
          description,
        });
      } finally {
        setLoading(false);
      }
    },
    [companyId, statusFilter, typeFilter, search, selectedJob?.id, loadAudits],
  );

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);
  const refresh = useCallback(() => {
    loadJobs();
  }, [loadJobs]);

  const runAction = useCallback(
    async (job: AutomationJobRecord, action: 'retry' | 'cancel' | 'acknowledge') => {
      if (!job.id) return;

      setActionLoading(`${action}:${job.id}`);
      setMessage(null);

      try {
        let response: AutomationJobActionResponse;

        if (action === 'retry') {
          response = await automationJobsApi.retry(job.id);
        } else if (action === 'cancel') {
          response = await automationJobsApi.cancel(job.id);
        } else {
          response = await automationJobsApi.acknowledge(job.id);
        }

        setMessage({
          type: response.status === 'OK' ? 'success' : 'warning',
          title: response.message || 'Ação executada.',
          description: `Job ${response.jobId} · audit=${response.audit?.recorded ? 'ok' : 'warning'}`,
        });

        await loadJobs({ silent: true });

        if (response.job?.id) {
          setSelectedJob(response.job);
          await loadAudits(response.job.id);
        }
      } catch (error) {
        const description =
          error instanceof Error ? error.message : 'Não foi possível executar a ação.';

        setMessage({
          type: 'error',
          title: 'Falha na ação',
          description,
        });
      } finally {
        setActionLoading(null);
      }
    },
    [loadJobs, loadAudits],
  );

  const selectJob = useCallback(
    async (job: AutomationJobRecord) => {
      setSelectedJob(job);
      await loadAudits(job.id);
    },
    [loadAudits],
  );

  const selectedTotals = extractTotals(selectedJob);
  const selectedEngine = extractEngine(selectedJob);
  const selectedResultStatus = extractResultStatus(selectedJob);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                <ShieldCheck className="h-4 w-4" />
                Enterprise Operations
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">Automation Jobs</h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Operação, retry executável, cancelamento, reconhecimento e auditoria dos jobs
                críticos do bCost. Esta tela transforma falhas operacionais em ações rastreáveis de
                produção.
              </p>

              <div className="mt-3 text-xs text-slate-500">
                Empresa ativa:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {companyId || 'carregando...'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={refresh} disabled={loading} variant="secondary">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Atualizar
              </Button>
            </div>
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

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Total carregado</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{counters.total}</div>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Falhas</div>
            <div className="mt-2 text-3xl font-bold text-red-600">{counters.failed}</div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Concluídos</div>
            <div className="mt-2 text-3xl font-bold text-emerald-600">{counters.completed}</div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Em execução/fila</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              {counters.running + counters.pending}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    loadJobs();
                  }
                }}
                placeholder="Buscar por nome, tipo ou erro..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
            >
              <option value="ALL">Todos os status</option>
              <option value="FAILED">Falhou</option>
              <option value="COMPLETED">Concluído</option>
              <option value="RUNNING">Em execução</option>
              <option value="PENDING">Pendente</option>
              <option value="QUEUED">Na fila</option>
            </select>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
            >
              <option value="ALL">Todos os tipos</option>
              <option value="REVENUE_BILLING">Revenue Billing</option>
              <option value="FISCAL_AUDIT">Fiscal Audit</option>
              <option value="TAX_CLOSURE">Tax Closure</option>
            </select>

            <Button onClick={() => loadJobs()} disabled={loading}>
              Aplicar filtros
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-bold text-slate-950">Jobs operacionais</h2>
              <p className="mt-1 text-sm text-slate-500">
                Clique em um job para ver payload, resultado e trilha de auditoria.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="flex items-center justify-center gap-3 p-10 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando automações...
                </div>
              ) : jobs.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  Nenhum job encontrado com os filtros atuais.
                </div>
              ) : (
                jobs.map((job) => {
                  const busy = actionLoading?.endsWith(`:${job.id}`);
                  const selected = selectedJob?.id === job.id;

                  return (
                    <article
                      key={job.id}
                      className={`p-5 transition ${selected ? 'bg-blue-50/50' : 'bg-white'}`}
                    >
                      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
                        <button
                          type="button"
                          onClick={() => selectJob(job)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                job.status,
                              )}`}
                            >
                              {statusIcon(job.status)}
                              {statusLabel(job.status)}
                            </span>

                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {job.type || 'UNKNOWN'}
                            </span>

                            {extractEngine(job) && (
                              <span className="rounded-full border border-purple-100 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                                {extractEngine(job)}
                              </span>
                            )}
                          </div>

                          <h3 className="mt-3 truncate text-base font-bold text-slate-950">
                            {job.name || job.id}
                          </h3>

                          <div className="mt-1 text-xs text-slate-500">{job.id}</div>

                          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                            <span>Criado: {formatDate(job.createdAt)}</span>
                            <span>Início: {formatDate(job.startedAt)}</span>
                            <span>Fim: {formatDate(job.completedAt)}</span>
                          </div>

                          {job.error && (
                            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                              {job.error}
                            </div>
                          )}
                        </button>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="success"
                            disabled={busy}
                            onClick={() => runAction(job, 'retry')}
                            title="Reexecuta o job quando houver executor suportado."
                          >
                            {actionLoading === `retry:${job.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            Reprocessar
                          </Button>

                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() => runAction(job, 'acknowledge')}
                          >
                            {actionLoading === `acknowledge:${job.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Reconhecer
                          </Button>

                          <Button
                            variant="danger"
                            disabled={busy}
                            onClick={() => runAction(job, 'cancel')}
                          >
                            {actionLoading === `cancel:${job.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Detalhe do job</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Resultado operacional e evidências técnicas.
                  </p>
                </div>

                {selectedJob && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                      selectedJob.status,
                    )}`}
                  >
                    {statusIcon(selectedJob.status)}
                    {statusLabel(selectedJob.status)}
                  </span>
                )}
              </div>

              {!selectedJob ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Selecione um job para ver os detalhes.
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Nome
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedJob.name || selectedJob.id}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">Engine</div>
                      <div className="mt-1 break-words text-sm font-semibold text-slate-900">
                        {selectedEngine || '—'}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">Status do resultado</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedResultStatus || '—'}
                      </div>
                    </div>
                  </div>

                  {selectedTotals && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {Object.entries(selectedTotals).map(([key, value]) => (
                        <div key={key} className="rounded-2xl border border-slate-100 bg-white p-4">
                          <div className="text-xs text-slate-500">{key}</div>
                          <div className="mt-1 text-lg font-bold text-slate-950">
                            {String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <PlayCircle className="h-4 w-4" />
                      Resultado
                    </div>
                    <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                      {formatJson(selectedJob.result)}
                    </pre>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <AlertTriangle className="h-4 w-4" />
                      Payload / erro
                    </div>
                    <pre className="max-h-64 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                      {formatJson({
                        payload: selectedJob.payload,
                        error: selectedJob.error,
                      })}
                    </pre>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Auditoria relacionada</h2>
              <p className="mt-1 text-sm text-slate-500">
                Últimos registros de auditoria para o job selecionado.
              </p>

              <div className="mt-5 space-y-3">
                {audits.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    Nenhuma auditoria relacionada carregada.
                  </div>
                ) : (
                  audits.map((audit) => (
                    <div
                      key={audit.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {audit.module}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {audit.action}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        {formatDate(audit.createdAt)}
                      </div>

                      <pre className="mt-3 max-h-40 overflow-auto rounded-xl bg-slate-900 p-3 text-xs leading-5 text-slate-100">
                        {formatJson(audit.payload || audit.metadata)}
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

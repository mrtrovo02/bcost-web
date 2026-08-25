'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  enterpriseUniversalApi,
  EnterpriseCatalogItem,
  EnterpriseModuleRecord,
  EnterpriseModuleResponse,
  getEnterpriseModuleLabel,
  getEnterpriseModuleModel,
  resolveEnterpriseCompanyId,
} from '@/lib/api/enterprise-universal';
import { automationJobsApi } from '@/lib/api/automation-jobs';
import { isDemoEntityId } from '@/lib/config/demo-policy';
import { getToken, isDemoSession } from '@/services/api';

type EnterpriseModuleClientProps = {
  slug: string;
};

type AutomationJobRecord = EnterpriseModuleRecord & {
  id?: string;
  name?: string;
  type?: string;
  status?: string;
  error?: string | null;
  payload?: unknown;
  result?: unknown;
  progress?: number;
  attempts?: number;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  companyId?: string;
};

type RoadmapModuleSummary = {
  roadmap?: boolean;
  area?: string;
  priority?: string;
  endpoint?: string;
  canonicalOwner?: string;
  automationBoundary?: string;
  operationalGuardrails?: string[];
  nextStep?: string;
};

type ModuleGovernanceDetails = {
  persistence?: EnterpriseCatalogItem['persistence'];
  endpoint?: string;
  canonicalOwner?: string;
  automationBoundary?: EnterpriseCatalogItem['automationBoundary'] | string;
  operationalGuardrails: string[];
};

function hasRealAuthToken(): boolean {
  const token = getToken();
  return Boolean(token && token !== 'demo-token-local');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toLocaleString('pt-BR') : '-';
  }

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(value));
      } catch {
        return value;
      }
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '-';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatDate(value: unknown): string {
  if (!value || typeof value !== 'string') return '-';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function pickColumns(items: EnterpriseModuleRecord[]): string[] {
  const preferred = [
    'id',
    'name',
    'email',
    'cnpj',
    'document',
    'title',
    'description',
    'action',
    'module',
    'entity',
    'status',
    'type',
    'role',
    'amount',
    'totalAmount',
    'revenue',
    'expenses',
    'netProfit',
    'createdAt',
    'updatedAt',
    'dueDate',
    'issuedAt',
    'occurredAt',
  ];

  const discovered = new Set<string>();

  for (const item of items.slice(0, 10)) {
    for (const key of Object.keys(item)) {
      const value = item[key];

      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null ||
        value === undefined
      ) {
        discovered.add(key);
      }
    }
  }

  const ordered = preferred.filter((key) => discovered.has(key));
  const extras = [...discovered].filter((key) => !ordered.includes(key));

  return [...ordered, ...extras].slice(0, 8);
}

function statusBadgeClass(status: string | undefined) {
  const normalized = String(status || 'UNKNOWN').toUpperCase();

  if (normalized === 'COMPLETED' || normalized === 'SUCCESS' || normalized === 'DONE') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'FAILED' || normalized === 'ERROR') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (normalized === 'RUNNING' || normalized === 'PROCESSING') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (normalized === 'QUEUED' || normalized === 'PENDING') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function isFallbackData(data: EnterpriseModuleResponse | null) {
  if (!data) return false;
  if (String(data.status).includes('FALLBACK') || String(data.status).includes('DEMO')) {
    return true;
  }

  const summary = data.summary as Record<string, unknown> | undefined;
  return Boolean(summary?.fallback);
}

function isRoadmapData(data: EnterpriseModuleResponse | null) {
  if (!data) return false;
  if (String(data.status).includes('ROADMAP')) return true;

  const summary = data.summary as Record<string, unknown> | undefined;
  return Boolean(summary?.roadmap);
}

function getRoadmapSummary(data: EnterpriseModuleResponse | null): RoadmapModuleSummary | null {
  if (!isRoadmapData(data) || !isObject(data?.summary)) {
    return null;
  }

  const summary = data.summary;
  const guardrails = Array.isArray(summary.operationalGuardrails)
    ? summary.operationalGuardrails.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    roadmap: summary.roadmap === true,
    area: typeof summary.area === 'string' ? summary.area : undefined,
    priority: typeof summary.priority === 'string' ? summary.priority : undefined,
    endpoint: typeof summary.endpoint === 'string' ? summary.endpoint : undefined,
    canonicalOwner: typeof summary.canonicalOwner === 'string' ? summary.canonicalOwner : undefined,
    automationBoundary:
      typeof summary.automationBoundary === 'string' ? summary.automationBoundary : undefined,
    operationalGuardrails: guardrails,
    nextStep: typeof summary.nextStep === 'string' ? summary.nextStep : undefined,
  };
}

function getModuleGovernanceDetails(
  data: EnterpriseModuleResponse | null,
  catalogItem: EnterpriseCatalogItem | null,
): ModuleGovernanceDetails | null {
  const roadmap = getRoadmapSummary(data);
  const guardrails = Array.isArray(catalogItem?.operationalGuardrails)
    ? catalogItem.operationalGuardrails
    : [];

  if (roadmap) {
    const roadmapGuardrails = roadmap.operationalGuardrails ?? [];

    return {
      persistence: catalogItem?.persistence ?? 'ROADMAP',
      endpoint: roadmap.endpoint ?? catalogItem?.endpoint,
      canonicalOwner: roadmap.canonicalOwner ?? catalogItem?.canonicalOwner,
      automationBoundary: roadmap.automationBoundary ?? catalogItem?.automationBoundary,
      operationalGuardrails: roadmapGuardrails.length ? roadmapGuardrails : guardrails,
    };
  }

  if (!catalogItem) {
    return null;
  }

  return {
    persistence: catalogItem.persistence,
    endpoint: catalogItem.endpoint,
    canonicalOwner: catalogItem.canonicalOwner,
    automationBoundary: catalogItem.automationBoundary,
    operationalGuardrails: guardrails,
  };
}

function GovernanceNotice({
  details,
  fallbackEndpoint,
}: {
  details: ModuleGovernanceDetails | null;
  fallbackEndpoint: string;
}) {
  if (!details) return null;

  return (
    <section className="mb-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-900 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-black">Governança do contrato enterprise</div>
          <p className="mt-1 leading-6">
            Owner:{' '}
            <span className="font-black">{details.canonicalOwner ?? 'enterprise-modules'}</span> ·
            Boundary:{' '}
            <span className="font-black">{details.automationBoundary ?? 'SOFTWARE_ONLY'}</span> ·
            Persistência: <span className="font-black">{details.persistence ?? 'PRISMA'}</span>
          </p>
        </div>
        <div className="break-all rounded-2xl border border-emerald-200 bg-white px-3 py-2 font-mono text-xs font-semibold text-emerald-800">
          {details.endpoint ?? fallbackEndpoint}
        </div>
      </div>

      {details.operationalGuardrails.length ? (
        <div className="mt-4 grid gap-2">
          {details.operationalGuardrails.slice(0, 2).map((guardrail) => (
            <div
              key={guardrail}
              className="rounded-2xl border border-emerald-100 bg-white/70 p-3 text-xs font-semibold leading-5 text-emerald-900"
            >
              {guardrail}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FallbackNotice({ data }: { data: EnterpriseModuleResponse | null }) {
  if (isRoadmapData(data)) {
    return (
      <section className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900 shadow-sm">
        <div className="font-black">Módulo em roadmap técnico</div>
        <p className="mt-1 leading-6">
          Este domínio já está navegável e padronizado, mas ainda precisa de persistência, endpoints
          CRUD, auditoria e regras de permissão antes de operar com dados reais.
        </p>
      </section>
    );
  }

  if (!isFallbackData(data)) return null;

  return (
    <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
      <div className="font-black">Modo operacional demonstrativo</div>
      <p className="mt-1 leading-6">
        A API real deste módulo não respondeu com dados válidos nesta sessão. A tela continua
        funcional com dados controlados para validar fluxo, campos, KPIs e experiência de uso.
      </p>
    </section>
  );
}

function RoadmapModuleView({
  data,
  onRefresh,
}: {
  data: EnterpriseModuleResponse;
  onRefresh: () => void;
}) {
  const roadmap = getRoadmapSummary(data);

  return (
    <section className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">
            Roadmap técnico controlado
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {data.label} está mapeado, mas ainda não opera com persistência própria
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Este módulo permanece navegável para apresentação executiva e validação de arquitetura,
            sem simular execução real quando o backend ainda exige integração, dossiê ou operação
            humana.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
        >
          Atualizar contrato
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <RoadmapCard label="Área" value={roadmap?.area ?? '-'} />
        <RoadmapCard label="Prioridade" value={roadmap?.priority ?? '-'} />
        <RoadmapCard label="Owner canônico" value={roadmap?.canonicalOwner ?? '-'} />
        <RoadmapCard label="Boundary" value={roadmap?.automationBoundary ?? '-'} />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Endpoint canônico
        </p>
        <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-800">
          {roadmap?.endpoint ?? '/enterprise/modules/:slug/:companyId'}
        </p>
      </div>

      {roadmap?.nextStep ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-black">Próximo passo de engenharia</p>
          <p className="mt-1 leading-6">{roadmap.nextStep}</p>
        </div>
      ) : null}

      {roadmap?.operationalGuardrails?.length ? (
        <div className="mt-5 grid gap-3">
          {roadmap.operationalGuardrails.map((guardrail) => (
            <div
              key={guardrail}
              className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-900"
            >
              {guardrail}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RoadmapCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-sm font-black text-slate-900" title={value}>
        {value}
      </p>
    </div>
  );
}

function summarizeCards(data: EnterpriseModuleResponse | null) {
  if (!data) return [];

  const summary = isObject(data.summary) ? data.summary : {};
  const totals = isObject(summary.totals) ? summary.totals : {};
  const status = isObject(summary.status) ? summary.status : {};

  const cards: Array<{
    label: string;
    value: string;
    hint: string;
  }> = [
    {
      label: 'Total',
      value: String(data.total || 0),
      hint: 'Registros encontrados',
    },
    {
      label: 'Status',
      value: data.status,
      hint: 'Saúde do endpoint',
    },
    {
      label: 'Página',
      value: `${data.offset + 1}`,
      hint: `Limite ${data.limit}`,
    },
  ];

  const firstStatus = Object.entries(status)[0];

  if (firstStatus) {
    cards.push({
      label: `Status ${firstStatus[0]}`,
      value: String(firstStatus[1]),
      hint: 'Distribuição principal',
    });
  }

  const firstTotal = Object.entries(totals)[0];

  if (firstTotal) {
    cards.push({
      label: firstTotal[0],
      value:
        typeof firstTotal[1] === 'number'
          ? firstTotal[1].toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })
          : String(firstTotal[1]),
      hint: 'Total financeiro',
    });
  }

  return cards.slice(0, 4);
}

function getAutomationStats(items: AutomationJobRecord[]) {
  const stats = {
    total: items.length,
    failed: 0,
    completed: 0,
    running: 0,
    queued: 0,
    other: 0,
  };

  for (const item of items) {
    const status = String(item.status || 'UNKNOWN').toUpperCase();

    if (status === 'FAILED' || status === 'ERROR') {
      stats.failed += 1;
    } else if (status === 'COMPLETED' || status === 'SUCCESS' || status === 'DONE') {
      stats.completed += 1;
    } else if (status === 'RUNNING' || status === 'PROCESSING') {
      stats.running += 1;
    } else if (status === 'QUEUED' || status === 'PENDING') {
      stats.queued += 1;
    } else {
      stats.other += 1;
    }
  }

  return stats;
}

function AutomationJobsView({
  data,
  loading,
  refreshing,
  error,
  search,
  companyId,
  onSearchChange,
  onRefresh,
  onSubmitSearch,
}: {
  data: EnterpriseModuleResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  search: string;
  companyId: string | null;
  onSearchChange: (value: string) => void;
  onRefresh: () => void | Promise<void>;
  onSubmitSearch: () => void;
}) {
  const jobs = useMemo(() => (data?.items || []) as AutomationJobRecord[], [data?.items]);

  const stats = useMemo(() => getAutomationStats(jobs), [jobs]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    description?: string;
  } | null>(null);

  const selectedJob = useMemo(() => {
    if (!jobs.length) return null;
    if (selectedJobId) {
      return jobs.find((job) => String(job.id) === selectedJobId) || jobs[0];
    }
    return jobs[0];
  }, [jobs, selectedJobId]);

  const retrySelectedJob = useCallback(async () => {
    if (!selectedJob?.id) return;

    const jobId = String(selectedJob.id);
    const actionCompanyId = companyId || String(selectedJob.companyId || '');

    if (!actionCompanyId) {
      setActionMessage({
        type: 'error',
        title: 'Empresa ativa não resolvida',
        description: 'Atualize o módulo para restaurar o contexto multi-tenant antes do retry.',
      });
      return;
    }

    setActionLoading(`retry:${jobId}`);
    setActionMessage(null);

    try {
      const response = await automationJobsApi.retry(actionCompanyId, jobId);
      setActionMessage({
        type: response.status === 'OK' ? 'success' : 'warning',
        title: response.message || 'Job reenfileirado para reprocessamento.',
        description: `Job ${response.jobId || jobId}`,
      });
      await onRefresh();
    } catch (error) {
      setActionMessage({
        type: 'error',
        title: 'Falha ao reprocessar job',
        description:
          error instanceof Error ? error.message : 'Não foi possível acionar o endpoint de retry.',
      });
    } finally {
      setActionLoading(null);
    }
  }, [companyId, onRefresh, selectedJob]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/dashboard/enterprise"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              ← Voltar para Enterprise Schema Coverage
            </Link>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                bCost Enterprise Operations
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Automation Jobs
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Central operacional de automações, reprocessamentos, falhas, payloads e execução de
                jobs críticos do bCost.
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading || refreshing}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? 'Atualizando...' : 'Atualizar jobs'}
          </button>
        </div>

        {stats.failed > 0 ? (
          <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
                  Atenção operacional
                </p>
                <h2 className="mt-2 text-xl font-black text-red-950">
                  Existem {stats.failed} automações com falha
                </h2>
                <p className="mt-1 text-sm text-red-700">
                  Revise o erro, payload e tipo do job antes do lançamento em produção. Esse é um
                  indicador importante para produto enterprise.
                </p>
              </div>
              <div className="rounded-2xl bg-white px-5 py-3 text-center shadow-sm">
                <p className="text-3xl font-black text-red-700">{stats.failed}</p>
                <p className="text-xs font-bold uppercase text-red-500">Failed</p>
              </div>
            </div>
          </section>
        ) : null}

        <FallbackNotice data={data} />

        <section className="mb-6 grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Total</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{data?.total ?? stats.total}</p>
            <p className="mt-1 text-xs text-slate-500">Jobs localizados</p>
          </div>

          <div className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">Failed</p>
            <p className="mt-3 text-3xl font-black text-red-700">{stats.failed}</p>
            <p className="mt-1 text-xs text-slate-500">Precisam atenção</p>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">
              Completed
            </p>
            <p className="mt-3 text-3xl font-black text-emerald-700">{stats.completed}</p>
            <p className="mt-1 text-xs text-slate-500">Executados com sucesso</p>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500">Running</p>
            <p className="mt-3 text-3xl font-black text-blue-700">{stats.running}</p>
            <p className="mt-1 text-xs text-slate-500">Em execução</p>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">Queued</p>
            <p className="mt-3 text-3xl font-black text-amber-700">{stats.queued}</p>
            <p className="mt-1 text-xs text-slate-500">Na fila</p>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Monitoramento de automações</h2>
              <p className="text-sm text-slate-500">
                Endpoint:{' '}
                <span className="font-mono text-xs">
                  /enterprise/modules/automation-jobs/{companyId || ':companyId'}
                </span>
              </p>
            </div>

            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmitSearch();
              }}
            >
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar por nome, tipo ou erro..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-indigo-500 transition focus:ring-2 md:w-80"
              />
              <button
                type="submit"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Filtrar
              </button>
            </form>
          </div>
        </section>

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Carregando automações...</p>
          </section>
        ) : error ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
            <h2 className="text-lg font-black text-red-900">
              Não foi possível carregar Automation Jobs
            </h2>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-5 rounded-2xl bg-red-700 px-5 py-3 text-sm font-bold text-white"
            >
              Tentar novamente
            </button>
          </section>
        ) : !jobs.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Nenhuma automação encontrada
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              O módulo está saudável, mas ainda sem jobs
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
              Quando rotinas fiscais, bancárias, contábeis ou integrações executarem processos
              assíncronos, eles aparecerão aqui.
            </p>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-black text-slate-950">Jobs recentes</h2>
                <p className="text-sm text-slate-500">
                  Clique em um job para ver detalhes técnicos.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {jobs.map((job, index) => {
                  const id = String(job.id || index);
                  const selected = String(selectedJob?.id || '') === id;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedJobId(id)}
                      className={`block w-full px-5 py-4 text-left transition hover:bg-slate-50 ${
                        selected ? 'bg-indigo-50/70' : 'bg-white'
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusBadgeClass(
                                job.status,
                              )}`}
                            >
                              {job.status || 'UNKNOWN'}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                              {job.type || 'JOB'}
                            </span>
                          </div>

                          <h3 className="mt-3 truncate text-sm font-black text-slate-950">
                            {job.name || job.id || 'Automation Job'}
                          </h3>

                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {job.error || 'Sem erro registrado para este job.'}
                          </p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-xs font-bold uppercase text-slate-400">Criado em</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {formatDate(job.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              {selectedJob ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        Detalhes do job
                      </p>
                      <h2 className="mt-2 break-all text-xl font-black text-slate-950">
                        {selectedJob.name || selectedJob.id || 'Automation Job'}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusBadgeClass(
                        selectedJob.status,
                      )}`}
                    >
                      {selectedJob.status || 'UNKNOWN'}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <DetailRow label="ID" value={selectedJob.id} />
                    <DetailRow label="Tipo" value={selectedJob.type} />
                    <DetailRow label="Tentativas" value={selectedJob.attempts} />
                    <DetailRow label="Progresso" value={selectedJob.progress} />
                    <DetailRow label="Criado" value={formatDate(selectedJob.createdAt)} />
                    <DetailRow label="Início" value={formatDate(selectedJob.startedAt)} />
                    <DetailRow label="Fim" value={formatDate(selectedJob.finishedAt)} />
                  </div>

                  {selectedJob.error ? (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
                        Erro
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-red-800">
                        {selectedJob.error}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      Payload
                    </p>
                    <pre className="mt-3 max-h-60 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                      {formatJson(selectedJob.payload)}
                    </pre>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      Resultado
                    </p>
                    <pre className="mt-3 max-h-60 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                      {formatJson(selectedJob.result)}
                    </pre>
                  </div>

                  <div className="mt-5 grid gap-2">
                    {actionMessage ? (
                      <div
                        className={`rounded-2xl border p-4 text-sm ${
                          actionMessage.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : actionMessage.type === 'warning'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-red-200 bg-red-50 text-red-800'
                        }`}
                      >
                        <p className="font-bold">{actionMessage.title}</p>
                        {actionMessage.description ? (
                          <p className="mt-1 text-xs opacity-80">{actionMessage.description}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={!selectedJob.id || actionLoading === `retry:${selectedJob.id}`}
                      onClick={retrySelectedJob}
                      className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                      title={
                        selectedJob.id
                          ? 'Reenfileira o job selecionado pelo endpoint oficial de retry.'
                          : 'Job sem identificador persistido.'
                      }
                    >
                      {actionLoading === `retry:${selectedJob.id}`
                        ? 'Reprocessando...'
                        : 'Reprocessar job'}
                    </button>
                    <p className="text-xs text-slate-500">
                      A ação registra auditoria no backend e atualiza esta visão após a resposta.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">Selecione um job para ver detalhes.</p>
              )}
            </aside>
          </section>
        )}

        {data ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <details>
              <summary className="cursor-pointer text-sm font-bold text-slate-700">
                Ver payload técnico completo
              </summary>
              <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-slate-800">{formatValue(value)}</p>
    </div>
  );
}

function UniversalModuleView({
  slug,
  data,
  catalogItem,
  loading,
  refreshing,
  error,
  search,
  companyId,
  onSearchChange,
  onRefresh,
  onSubmitSearch,
}: {
  slug: string;
  data: EnterpriseModuleResponse | null;
  catalogItem: EnterpriseCatalogItem | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  search: string;
  companyId: string | null;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onSubmitSearch: () => void;
}) {
  const moduleLabel = data?.label || getEnterpriseModuleLabel(slug);
  const moduleModel = data?.model || getEnterpriseModuleModel(slug);
  const cards = useMemo(() => summarizeCards(data), [data]);
  const columns = useMemo(() => pickColumns(data?.items || []), [data?.items]);
  const governance = useMemo(
    () => getModuleGovernanceDetails(data, catalogItem),
    [catalogItem, data],
  );
  const universalEndpoint = `/enterprise/modules/${slug}/${companyId || ':companyId'}`;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/dashboard/enterprise"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              ← Voltar para Enterprise Schema Coverage
            </Link>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                bCost Enterprise Module
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                {moduleLabel}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Model: <span className="font-semibold">{moduleModel}</span> · Slug:{' '}
                <span className="font-semibold">{slug}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading || refreshing}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                {card.label}
              </p>
              <p className="mt-3 truncate text-2xl font-black text-slate-950">{card.value}</p>
              <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
            </div>
          ))}
        </section>

        <FallbackNotice data={data} />
        <GovernanceNotice details={governance} fallbackEndpoint={universalEndpoint} />

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Dados do módulo</h2>
              <p className="text-sm text-slate-500">
                Endpoint universal: <span className="font-mono text-xs">{universalEndpoint}</span>
              </p>
            </div>

            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmitSearch();
              }}
            >
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-indigo-500 transition focus:ring-2 md:w-72"
              />
              <button
                type="submit"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Filtrar
              </button>
            </form>
          </div>
        </section>

        {loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Carregando dados enterprise...</p>
          </section>
        ) : error ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
            <h2 className="text-lg font-black text-red-900">
              Não foi possível carregar este módulo
            </h2>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-5 rounded-2xl bg-red-700 px-5 py-3 text-sm font-bold text-white"
            >
              Tentar novamente
            </button>
          </section>
        ) : data && isRoadmapData(data) ? (
          <RoadmapModuleView data={data} onRefresh={onRefresh} />
        ) : !data?.items?.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Empty State
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950">Nenhum registro encontrado</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
              O endpoint está funcionando e retornou uma resposta válida, mas ainda não existem
              registros cadastrados para este módulo nesta empresa.
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column}
                        className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((item, index) => (
                    <tr key={String(item.id || index)} className="hover:bg-slate-50">
                      {columns.map((column) => (
                        <td
                          key={column}
                          className="max-w-[320px] truncate px-5 py-4 text-sm text-slate-700"
                          title={formatValue(item[column])}
                        >
                          {formatValue(item[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <details>
              <summary className="cursor-pointer text-sm font-bold text-slate-700">
                Ver payload técnico
              </summary>
              <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default function EnterpriseModuleClient({ slug }: EnterpriseModuleClientProps) {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const companyIdRef = useRef<string | null>(null);
  const [data, setData] = useState<EnterpriseModuleResponse | null>(null);
  const [catalogItem, setCatalogItem] = useState<EnterpriseCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      try {
        if (mode === 'initial') {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError(null);

        const currentCompanyId = companyIdRef.current;
        const shouldResolveCompany =
          !currentCompanyId || (isDemoEntityId(currentCompanyId) && hasRealAuthToken());
        const catalogPromise = enterpriseUniversalApi
          .catalog()
          .then((catalog) => catalog.find((item) => item.slug === slug) ?? null)
          .catch(() => null);
        const companyPromise = shouldResolveCompany
          ? resolveEnterpriseCompanyId()
          : Promise.resolve(currentCompanyId);
        const [nextCatalogItem, resolvedCompanyId] = await Promise.all([
          catalogPromise,
          companyPromise,
        ]);

        setCatalogItem(nextCatalogItem);

        if (!resolvedCompanyId) {
          setData(null);
          setError(
            'Nenhuma empresa ativa foi encontrada. Selecione uma empresa para carregar este módulo.',
          );
          return;
        }

        companyIdRef.current = resolvedCompanyId;
        setCompanyId(resolvedCompanyId);

        const response = await enterpriseUniversalApi.getModule(slug, resolvedCompanyId, {
          limit: 100,
          offset: 0,
          ...(search.trim() ? { search: search.trim() } : {}),
        });

        setData(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar módulo enterprise.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, slug],
  );

  useEffect(() => {
    const handleCompanyContextUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ companyId?: string }>).detail;
      const nextCompanyId = detail?.companyId;

      const canUseDemoCompany = Boolean(
        nextCompanyId && isDemoEntityId(nextCompanyId) && isDemoSession(),
      );
      const acceptedCompanyId =
        nextCompanyId && (!isDemoEntityId(nextCompanyId) || canUseDemoCompany)
          ? nextCompanyId
          : null;

      companyIdRef.current = acceptedCompanyId;
      setCompanyId(acceptedCompanyId);
      setData(null);
      setCatalogItem(null);
      setError(null);
    };

    window.addEventListener('bcost:company-context-updated', handleCompanyContextUpdated);

    return () => {
      window.removeEventListener('bcost:company-context-updated', handleCompanyContextUpdated);
    };
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const refresh = useCallback(() => {
    void load('refresh');
  }, [load]);

  const submitSearch = useCallback(() => {
    void load('refresh');
  }, [load]);

  if (slug === 'automation-jobs') {
    return (
      <AutomationJobsView
        data={data}
        loading={loading}
        refreshing={refreshing}
        error={error}
        search={search}
        companyId={companyId}
        onSearchChange={setSearch}
        onRefresh={refresh}
        onSubmitSearch={submitSearch}
      />
    );
  }

  return (
    <UniversalModuleView
      slug={slug}
      data={data}
      catalogItem={catalogItem}
      loading={loading}
      refreshing={refreshing}
      error={error}
      search={search}
      companyId={companyId}
      onSearchChange={setSearch}
      onRefresh={refresh}
      onSubmitSearch={submitSearch}
    />
  );
}

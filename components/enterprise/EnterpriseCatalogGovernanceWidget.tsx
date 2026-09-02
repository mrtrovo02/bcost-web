'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  enterpriseUniversalApi,
  type EnterpriseCatalogItem,
} from '@/lib/api/enterprise-universal';
import {
  getModuleMarketReadinessLabel,
  type BcostMarketReadiness,
  type BcostModuleStatus,
} from '@/lib/product/schema-modules';

type CatalogState = {
  loading: boolean;
  error: string | null;
  items: EnterpriseCatalogItem[];
};

const INITIAL_STATE: CatalogState = {
  loading: true,
  error: null,
  items: [],
};

const BOUNDARY_LABEL: Record<string, string> = {
  SOFTWARE_ONLY: 'Software',
  ASSISTED_AUTOMATION: 'Assistido',
  CRC_VALIDATED: 'CRC',
  HUMAN_LED: 'Humano',
};

function resolveReadiness(item: EnterpriseCatalogItem): BcostMarketReadiness {
  if (item.marketReadiness) return item.marketReadiness;
  return item.persistence === 'PRISMA' ? 'SELLABLE' : 'ROADMAP_LOCKED';
}

function readinessLabel(value: BcostMarketReadiness) {
  const statusByReadiness: Record<BcostMarketReadiness, BcostModuleStatus> = {
    SELLABLE: 'ACTIVE',
    ASSISTED_BETA: 'INTEGRATING',
    ROADMAP_LOCKED: 'PLANNED',
  };

  return getModuleMarketReadinessLabel(statusByReadiness[value]);
}

function readinessClass(value: BcostMarketReadiness) {
  if (value === 'SELLABLE') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (value === 'ASSISTED_BETA') return 'border-indigo-100 bg-indigo-50 text-indigo-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function persistenceClass(value?: EnterpriseCatalogItem['persistence']) {
  if (value === 'PRISMA') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  return 'border-blue-100 bg-blue-50 text-blue-700';
}

function boundaryClass(value?: EnterpriseCatalogItem['automationBoundary']) {
  if (value === 'CRC_VALIDATED') return 'border-red-100 bg-red-50 text-red-700';
  if (value === 'HUMAN_LED') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (value === 'ASSISTED_AUTOMATION') return 'border-indigo-100 bg-indigo-50 text-indigo-700';
  return 'border-emerald-100 bg-emerald-50 text-emerald-700';
}

function countBy<T extends string>(items: EnterpriseCatalogItem[], getKey: (item: EnterpriseCatalogItem) => T | undefined) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item) ?? 'UNKNOWN';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function sortCriticalRoadmap(items: EnterpriseCatalogItem[]) {
  const priorityWeight: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  return [...items]
    .filter((item) => item.persistence === 'ROADMAP')
    .sort(
      (a, b) =>
        (priorityWeight[a.priority ?? 'LOW'] ?? 9) -
          (priorityWeight[b.priority ?? 'LOW'] ?? 9) ||
        a.label.localeCompare(b.label),
    )
    .slice(0, 6);
}

export default function EnterpriseCatalogGovernanceWidget() {
  const [state, setState] = useState<CatalogState>(INITIAL_STATE);

  const load = useCallback(async (forceRefresh = false) => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const items = await enterpriseUniversalApi.catalog({ forceRefresh });
      setState({ loading: false, error: null, items });
    } catch (error) {
      setState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar o catálogo enterprise.',
        items: [],
      });
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(task);
  }, [load]);

  const stats = useMemo(() => {
    const persistence = countBy(state.items, (item) => item.persistence);
    const boundaries = countBy(state.items, (item) => item.automationBoundary);
    const readiness = countBy(state.items, (item) => resolveReadiness(item));
    const roadmap = state.items.filter((item) => item.persistence === 'ROADMAP');

    return {
      total: state.items.length,
      persisted: persistence.PRISMA ?? 0,
      roadmap: persistence.ROADMAP ?? 0,
      sellable: readiness.SELLABLE ?? 0,
      assistedBeta: readiness.ASSISTED_BETA ?? 0,
      roadmapLocked: readiness.ROADMAP_LOCKED ?? 0,
      crcValidated: boundaries.CRC_VALIDATED ?? 0,
      humanLed: boundaries.HUMAN_LED ?? 0,
      assisted: boundaries.ASSISTED_AUTOMATION ?? 0,
      softwareOnly: boundaries.SOFTWARE_ONLY ?? 0,
      criticalRoadmap: roadmap.filter((item) => item.priority === 'CRITICAL').length,
    };
  }, [state.items]);

  const criticalRoadmap = useMemo(() => sortCriticalRoadmap(state.items), [state.items]);

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Governança de catálogo
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
            Contrato enterprise publicado pela API
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Leitura operacional de persistência, owners canônicos, endpoints e limites de execução
            dos módulos expostos em produção.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={state.loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar catálogo
        </button>
      </div>

      {state.loading ? (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-6 text-sm font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando contrato enterprise...
        </div>
      ) : state.error ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4" />
            Catálogo indisponível
          </div>
          <p className="mt-1">{state.error}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            <MetricCard label="Total" value={stats.total} />
            <MetricCard label="Vendáveis" value={stats.sellable} tone="emerald" />
            <MetricCard label="Beta" value={stats.assistedBeta} tone="indigo" />
            <MetricCard label="Bloqueados" value={stats.roadmapLocked} tone="slate" />
            <MetricCard label="CRC" value={stats.crcValidated} tone="red" />
            <MetricCard label="Humano" value={stats.humanLed} tone="amber" />
            <MetricCard label="Assistido" value={stats.assisted} tone="indigo" />
            <MetricCard label="P0 Roadmap" value={stats.criticalRoadmap} tone="red" />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {criticalRoadmap.map((item) => (
              <Link
                href={`/dashboard/modules/${item.slug}`}
                key={item.slug}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-5 transition hover:border-blue-100 hover:bg-white hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${persistenceClass(
                      item.persistence,
                    )}`}
                  >
                    {item.persistence ?? 'CATALOG'}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${readinessClass(
                      resolveReadiness(item),
                    )}`}
                  >
                    {readinessLabel(resolveReadiness(item))}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${boundaryClass(
                      item.automationBoundary,
                    )}`}
                  >
                    {BOUNDARY_LABEL[item.automationBoundary ?? ''] ?? item.automationBoundary ?? 'Boundary'}
                  </span>
                  <span className="rounded-full border border-red-100 bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-700">
                    {item.priority ?? 'P'}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-black text-slate-950">{item.label}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {item.canonicalOwner ?? 'owner pendente'}
                </p>
                <p className="mt-3 break-all font-mono text-xs font-semibold text-slate-500">
                  {item.endpoint ?? '/enterprise/modules/:slug/:companyId'}
                </p>
              </Link>
            ))}
          </div>

          {criticalRoadmap.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
              Nenhum módulo roadmap crítico foi retornado pelo catálogo atual.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'emerald' | 'blue' | 'red' | 'amber' | 'indigo';
}) {
  const toneClass: Record<typeof tone, string> = {
    slate: 'border-slate-100 bg-slate-50 text-slate-950',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700',
  };

  return (
    <div className={`rounded-2xl border p-4 text-center ${toneClass[tone]}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-widest">{label}</div>
    </div>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, RefreshCw, Route } from 'lucide-react';
import {
  enterpriseUniversalApi,
  type EnterpriseCommercialLane,
} from '@/lib/api/enterprise-universal';

type CommercialLanesState = {
  loading: boolean;
  error: string | null;
  lanes: EnterpriseCommercialLane[];
};

const INITIAL_STATE: CommercialLanesState = {
  loading: true,
  error: null,
  lanes: [],
};

function laneClass(id: EnterpriseCommercialLane['id']) {
  if (id === 'direct-sale') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (id === 'assisted-validation') return 'border-indigo-100 bg-indigo-50 text-indigo-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function countCriticalModules(lane: EnterpriseCommercialLane) {
  return lane.modules.filter((module) => module.priority === 'CRITICAL').length;
}

export default function EnterpriseCommercialLanesWidget() {
  const [state, setState] = useState<CommercialLanesState>(INITIAL_STATE);

  async function load(forceRefresh = false) {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const lanes = await enterpriseUniversalApi.commercialLanes({ forceRefresh });
      setState({ loading: false, error: null, lanes });
    } catch (error) {
      setState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar as trilhas comerciais.',
        lanes: [],
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const totalModules = useMemo(
    () => state.lanes.reduce((total, lane) => total + lane.modules.length, 0),
    [state.lanes],
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Go-to-market
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tighter text-slate-900">
            Trilhas comerciais e operacionais
          </h2>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <p className="max-w-2xl text-sm font-bold leading-6 text-slate-400">
            Separação prática entre produto vendável, operação assistida e roadmap para reduzir
            risco jurídico, fiscal e comercial.
          </p>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={state.loading}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar
          </button>
        </div>
      </div>

      {state.loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando trilhas comerciais...
        </div>
      ) : state.error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4" />
            Trilhas comerciais indisponíveis
          </div>
          <p className="mt-1">{state.error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {state.lanes.map((lane) => (
            <div
              key={lane.id}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-black tracking-tight text-slate-900">
                  {lane.title}
                </h3>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${laneClass(
                    lane.id,
                  )}`}
                >
                  {lane.modules.length} módulos
                </span>
              </div>

              <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
                {lane.description}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-2xl font-black text-slate-950">{lane.modules.length}</p>
                  <p className="text-xs font-bold text-slate-400">Cobertura</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-2xl font-black text-red-600">
                    {countCriticalModules(lane)}
                  </p>
                  <p className="text-xs font-bold text-slate-400">Críticos</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Gate operacional
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                  {lane.operationalGate}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {lane.modules.slice(0, 4).map((module) => (
                  <Link
                    href={`/dashboard/modules/${module.slug}`}
                    key={module.slug}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                  >
                    {module.label}
                  </Link>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2 font-black text-blue-700">
                  <Route className="h-4 w-4" />
                  {lane.primaryAction}
                </span>
                <span className="font-bold text-slate-400">
                  {totalModules ? Math.round((lane.modules.length / totalModules) * 100) : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

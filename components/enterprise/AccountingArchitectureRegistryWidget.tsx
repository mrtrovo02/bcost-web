'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, GitMerge, Loader2, Network, ShieldAlert } from 'lucide-react';
import {
  accountingPlatformApi,
  AccountingArchitectureRegistryItem,
  AccountingArchitectureRegistryResponse,
} from '@/lib/api/accounting-platform';

const statusLabel: Record<AccountingArchitectureRegistryItem['status'], string> = {
  CANONICAL: 'Canônico',
  SHARED_CAPABILITY: 'Compartilhado',
  NEEDS_CONSOLIDATION: 'Consolidar',
  DEPRECATED_ALIAS: 'Alias legado',
};

const riskClass: Record<AccountingArchitectureRegistryItem['duplicateRisk'], string> = {
  LOW: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  MEDIUM: 'border-amber-100 bg-amber-50 text-amber-700',
  HIGH: 'border-red-100 bg-red-50 text-red-700',
};

const statusClass: Record<AccountingArchitectureRegistryItem['status'], string> = {
  CANONICAL: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  SHARED_CAPABILITY: 'border-blue-100 bg-blue-50 text-blue-700',
  NEEDS_CONSOLIDATION: 'border-red-100 bg-red-50 text-red-700',
  DEPRECATED_ALIAS: 'border-slate-200 bg-slate-100 text-slate-600',
};

export default function AccountingArchitectureRegistryWidget() {
  const [registry, setRegistry] = useState<AccountingArchitectureRegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRegistry() {
    try {
      setLoading(true);
      setError(null);
      const response = await accountingPlatformApi.architectureRegistry();
      setRegistry(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar registry.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRegistry();
  }, []);

  const priorityItems = useMemo(() => {
    return (registry?.items ?? [])
      .filter((item) => item.duplicateRisk !== 'LOW' || item.status === 'NEEDS_CONSOLIDATION')
      .sort((a, b) => {
        const riskWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return riskWeight[b.duplicateRisk] - riskWeight[a.duplicateRisk];
      });
  }, [registry]);

  return (
    <section className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
            Architecture Registry
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tighter text-slate-900">
            Mapa canônico de capacidades
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">
            Registro operacional para evitar APIs duplicadas, módulos sobrepostos e rotas órfãs
            enquanto a plataforma evolui para contabilidade digital end-to-end.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadRegistry()}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-blue-700"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
          Atualizar
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {registry && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <Metric label="Capacidades" value={registry.summary.total} />
            <Metric label="Canônicas" value={registry.summary.canonical} tone="emerald" />
            <Metric label="Compartilhadas" value={registry.summary.shared} tone="blue" />
            <Metric label="Consolidar" value={registry.summary.needsConsolidation} tone="red" />
            <Metric label="Risco alto" value={registry.summary.highRisk} tone="red" />
            <Metric label="Risco médio" value={registry.summary.mediumRisk} tone="amber" />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {priorityItems.map((item) => (
              <article key={item.capabilityId} className="rounded-3xl border border-slate-100 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass[item.status]}`}
                  >
                    {statusLabel[item.status]}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${riskClass[item.duplicateRisk]}`}
                  >
                    Risco {item.duplicateRisk}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-black tracking-tight text-slate-900">
                  {item.name}
                </h3>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  {item.canonicalOwner} · {item.canonicalApiBase}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-600">{item.consolidationRule}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.frontendRoutes.map((route) => (
                    <span
                      key={route}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"
                    >
                      {route}
                    </span>
                  ))}
                </div>

                {item.legacyAliases.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                      Aliases legados
                    </p>
                    <div className="mt-3 space-y-2">
                      {item.legacyAliases.slice(0, 3).map((alias) => (
                        <div
                          key={`${alias.method}:${alias.path}`}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600"
                        >
                          <span className="text-amber-700">{alias.method}</span> {alias.path}
                          <span className="mx-2 text-slate-300">→</span>
                          <span className="text-blue-700">{alias.migrationTarget}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <GitMerge className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-black text-slate-900">Fila de consolidação</h3>
            </div>

            <div className="mt-4 space-y-3">
              {registry.recommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black text-red-700">
                      {recommendation.priority}
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      {recommendation.owner}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                    {recommendation.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {loading && !registry && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 p-5 text-sm font-bold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Carregando registry de arquitetura...
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'emerald' | 'blue' | 'amber' | 'red';
}) {
  const iconClass = {
    slate: 'text-slate-500',
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  }[tone];
  const Icon = tone === 'red' ? ShieldAlert : tone === 'emerald' ? CheckCircle2 : AlertTriangle;

  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
      <Icon className={`h-5 w-5 ${iconClass}`} />
      <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

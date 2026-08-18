'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Network, ShieldCheck } from 'lucide-react';
import {
  AccountingPlatformCoverageItem,
  AccountingPlatformCoverageResponse,
  accountingPlatformApi,
} from '@/lib/api/accounting-platform';

const BLOCK_LABEL: Record<AccountingPlatformCoverageItem['block'], string> = {
  ONBOARDING_LEGALIZATION: 'Setup e legalização',
  RECURRING_ACCOUNTING_TAX: 'Core contábil e fiscal',
  FINTECH_VALUE_ADDED: 'Valor agregado e fintech',
  SERVICE_ARCHITECTURE: 'Plataforma vs. operação',
};

function maturityClass(maturity: AccountingPlatformCoverageItem['maturity']) {
  if (maturity === 'ACTIVE') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (maturity === 'INTEGRATING') return 'border-blue-100 bg-blue-50 text-blue-700';
  if (maturity === 'REQUIRES_PARTNER') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (maturity === 'REQUIRES_HUMAN_OPERATION') return 'border-red-100 bg-red-50 text-red-700';
  return 'border-slate-100 bg-slate-50 text-slate-600';
}

function gapClass(severity: string) {
  if (severity === 'BLOCKER') return 'border-red-100 bg-red-50 text-red-700';
  if (severity === 'WARNING') return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-blue-100 bg-blue-50 text-blue-700';
}

export default function AccountingPlatformCoverageWidget() {
  const [coverage, setCoverage] = useState<AccountingPlatformCoverageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await accountingPlatformApi.coverage();
        if (mounted) setCoverage(response);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar a matriz Accounting as a Service.',
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const grouped = useMemo(() => {
    return (coverage?.items ?? []).reduce<
      Record<AccountingPlatformCoverageItem['block'], AccountingPlatformCoverageItem[]>
    >(
      (acc, item) => {
        acc[item.block].push(item);
        return acc;
      },
      {
        ONBOARDING_LEGALIZATION: [],
        RECURRING_ACCOUNTING_TAX: [],
        FINTECH_VALUE_ADDED: [],
        SERVICE_ARCHITECTURE: [],
      },
    );
  }, [coverage?.items]);

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-blue-700">
            <Network className="h-4 w-4" />
            Accounting as a Service
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
            Matriz de cobertura end-to-end
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Mapeamento dos blocos estratégicos para módulos bCost, serviços, integrações,
            capacidades obrigatórias, evidências oficiais e limite entre software e operação humana.
          </p>
        </div>

        {coverage && (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xl font-black text-slate-950">{coverage.summary.total}</div>
              <div className="font-bold text-slate-500">itens</div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
              <div className="text-xl font-black text-blue-700">{coverage.summary.integrating}</div>
              <div className="font-bold text-blue-600">integração</div>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
              <div className="text-xl font-black text-red-700">{coverage.summary.blockers}</div>
              <div className="font-bold text-red-600">bloqueios</div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando matriz de cobertura...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4" />
            Matriz indisponível neste deploy
          </div>
          <p className="mt-1">{error}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5">
          {Object.entries(grouped).map(([block, items]) => (
            <div key={block} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-black text-slate-950">
                {BLOCK_LABEL[block as AccountingPlatformCoverageItem['block']]}
              </h3>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {items.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${maturityClass(
                          item.maturity,
                        )}`}
                      >
                        {item.maturity}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                        {item.automationBoundary}
                      </span>
                    </div>

                    <h4 className="mt-3 text-base font-black text-slate-950">{item.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.objective}</p>

                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
                        <ShieldCheck className="h-4 w-4" />
                        Engenharia de execução
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        {item.engineeringExecution}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.requiredCapabilities.slice(0, 5).map((capability) => (
                        <span
                          key={capability}
                          className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700"
                        >
                          {capability}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      {item.officialEvidence.length} evidência(s) oficial(is) previstas
                    </div>

                    {item.readinessGaps && item.readinessGaps.length > 0 && (
                      <div className="mt-4 grid gap-2">
                        {item.readinessGaps.slice(0, 3).map((gap) => (
                          <div
                            key={gap.code}
                            className={`rounded-xl border p-3 text-xs leading-5 ${gapClass(
                              gap.severity,
                            )}`}
                          >
                            <div className="font-black">{gap.code}</div>
                            <div className="mt-1">{gap.message}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {item.nextActions && item.nextActions.length > 0 && (
                      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Próximas ações
                        </div>
                        <div className="mt-2 grid gap-1 text-xs leading-5 text-slate-600">
                          {item.nextActions.slice(0, 2).map((action) => (
                            <div key={action}>{action}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

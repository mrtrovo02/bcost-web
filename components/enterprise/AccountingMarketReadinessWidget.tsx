'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Gauge, Loader2, ShieldCheck } from 'lucide-react';
import {
  AccountingMarketReadinessResponse,
  AccountingMarketReadinessStatus,
  AccountingPlatformPriorityTier,
  accountingPlatformApi,
} from '@/lib/api/accounting-platform';

const POSITION_LABEL: Record<AccountingMarketReadinessResponse['marketPosition'], string> = {
  NOT_SELLABLE_AS_FULL_ACCOUNTING: 'Não vender como contabilidade completa',
  ASSISTED_ACCOUNTING_PILOT: 'Piloto contábil assistido',
  MARKET_READY_WITH_GUARDRAILS: 'Mercado com guardrails',
  SCALE_READY: 'Pronto para escala',
};

function statusClass(status: AccountingMarketReadinessStatus) {
  if (status === 'PRODUCTION_READY') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === 'ASSISTED_READY') return 'border-blue-100 bg-blue-50 text-blue-700';
  if (status === 'INTEGRATION_REQUIRED') return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-red-100 bg-red-50 text-red-700';
}

function priorityClass(priority: AccountingPlatformPriorityTier) {
  if (priority === 'P0') return 'border-red-100 bg-red-50 text-red-700';
  if (priority === 'P1') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (priority === 'P2') return 'border-blue-100 bg-blue-50 text-blue-700';
  return 'border-slate-100 bg-slate-50 text-slate-600';
}

export default function AccountingMarketReadinessWidget() {
  const [readiness, setReadiness] = useState<AccountingMarketReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await accountingPlatformApi.marketReadiness();
        if (mounted) setReadiness(response);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar a prontidão de mercado.',
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

  const criticalTracks = useMemo(
    () =>
      [...(readiness?.tracks ?? [])]
        .filter((track) => track.priority === 'P0')
        .sort((a, b) => a.title.localeCompare(b.title)),
    [readiness?.tracks],
  );

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-violet-700">
            <Gauge className="h-4 w-4" />
            Market readiness
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
            Prontidão para competir como player contábil
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Priorização executiva para transformar módulos em serviços vendáveis: CRC, legalização,
            impostos, obrigações oficiais, emissão fiscal, folha, fintech, segurança e atendimento.
          </p>
        </div>

        {readiness && (
          <div className="grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-2xl font-black text-slate-950">{readiness.score}%</div>
              <div className="font-bold text-slate-500">score</div>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
              <div className="text-2xl font-black text-red-700">{readiness.summary.p0}</div>
              <div className="font-bold text-red-600">P0</div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
              <div className="text-2xl font-black text-amber-700">
                {readiness.summary.integrationRequired}
              </div>
              <div className="font-bold text-amber-600">integração</div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
              <div className="text-2xl font-black text-blue-700">
                {readiness.summary.assistedReady}
              </div>
              <div className="font-bold text-blue-600">assistido</div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando matriz de prontidão...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4" />
            Matriz indisponível
          </div>
          <p className="mt-1">{error}</p>
        </div>
      ) : readiness ? (
        <div className="mt-6 grid gap-5">
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-violet-500">
                  Posição comercial recomendada
                </div>
                <div className="mt-1 text-lg font-black text-violet-800">
                  {POSITION_LABEL[readiness.marketPosition]}
                </div>
              </div>
              <div className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-violet-700">
                {readiness.summary.blocked} bloqueio(s)
              </div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            {criticalTracks.map((track) => (
              <article key={track.code} className={`rounded-2xl border p-4 ${statusClass(track.status)}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${priorityClass(track.priority)}`}>
                    {track.priority}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black">
                    {track.owner}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-black">{track.title}</h3>
                <p className="mt-2 text-xs font-semibold leading-5">{track.gap}</p>
                <div className="mt-3 text-[10px] font-black uppercase tracking-widest">
                  {track.status} · {track.automationBoundary}
                </div>
              </article>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Próxima fila de engenharia
              </div>
              <div className="mt-4 grid gap-3">
                {readiness.nextBuildQueue.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${priorityClass(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                        {item.owner}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                      {item.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-sm font-black text-slate-950">Guardrails executivos</div>
              <div className="mt-4 grid gap-3">
                {readiness.executiveGuardrails.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

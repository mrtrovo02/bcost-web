'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import {
  AccountingOffering,
  AccountingOfferingsResponse,
  accountingPlatformApi,
} from '@/lib/api/accounting-platform';

const STATUS_LABEL: Record<AccountingOffering['marketStatus'], string> = {
  MARKET_READY: 'Pronto para mercado',
  ASSISTED_SELLABLE: 'Vendável assistido',
  WAITLIST_ONLY: 'Piloto ou espera',
  INTERNAL_ROADMAP: 'Roadmap interno',
};

function statusClass(status: AccountingOffering['marketStatus']) {
  if (status === 'MARKET_READY') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === 'ASSISTED_SELLABLE') return 'border-blue-100 bg-blue-50 text-blue-700';
  if (status === 'WAITLIST_ONLY') return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-red-100 bg-red-50 text-red-700';
}

function activationClass(status: AccountingOffering['activationRequirements'][number]['status']) {
  if (status === 'READY') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === 'REQUIRES_SETUP') return 'border-blue-100 bg-blue-50 text-blue-700';
  return 'border-red-100 bg-red-50 text-red-700';
}

export default function AccountingOfferingsWidget() {
  const [offerings, setOfferings] = useState<AccountingOfferingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await accountingPlatformApi.offerings();
        if (mounted) setOfferings(response);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar a prateleira comercial bCost.',
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

  const sortedOfferings = useMemo(
    () =>
      [...(offerings?.offerings ?? [])].sort(
        (a, b) => b.launchReadinessScore - a.launchReadinessScore || a.name.localeCompare(b.name),
      ),
    [offerings?.offerings],
  );

  return (
    <section className="rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-700">
            <BriefcaseBusiness className="h-4 w-4" />
            Prateleira comercial
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
            Ofertas bCost com travas de mercado
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Cada oferta combina módulos, serviços incluídos, exclusões, capacidades operacionais e
            guardrails para vender apenas o que pode ser entregue com evidência, CRC, integração ou
            operação assistida.
          </p>
        </div>

        {offerings && (
          <div className="grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="text-xl font-black text-emerald-700">
                {offerings.summary.marketReady}
              </div>
              <div className="font-bold text-emerald-600">prontas</div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
              <div className="text-xl font-black text-blue-700">
                {offerings.summary.assistedSellable}
              </div>
              <div className="font-bold text-blue-600">assistidas</div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
              <div className="text-xl font-black text-amber-700">
                {offerings.summary.waitlistOnly}
              </div>
              <div className="font-bold text-amber-600">pilotos</div>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
              <div className="text-xl font-black text-red-700">
                {offerings.summary.internalRoadmap}
              </div>
              <div className="font-bold text-red-600">roadmap</div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando ofertas...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4" />
            Ofertas indisponíveis neste deploy
          </div>
          <p className="mt-1">{error}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {sortedOfferings.map((offering) => (
            <article key={offering.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass(
                    offering.marketStatus,
                  )}`}
                >
                  {STATUS_LABEL[offering.marketStatus]}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  {offering.launchReadinessScore}% readiness
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
                {offering.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{offering.headline}</p>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Decisão comercial
                </div>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                  {offering.commercialDecision}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {offering.targetCustomers.map((customer) => (
                  <span
                    key={customer}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600"
                  >
                    {customer}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-emerald-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Inclui
                  </div>
                  <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600">
                    {offering.includedServices.slice(0, 4).map((service) => (
                      <div key={service}>{service}</div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-100 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-700">
                    <ShieldCheck className="h-4 w-4" />
                    Guardrails
                  </div>
                  <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600">
                    {offering.marketGuardrails.slice(0, 2).map((guardrail) => (
                      <div key={guardrail}>{guardrail}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <div className="text-lg font-black text-emerald-700">
                    {offering.activationSummary.ready}
                  </div>
                  <div className="font-bold text-emerald-600">prontos</div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <div className="text-lg font-black text-blue-700">
                    {offering.activationSummary.requiresSetup}
                  </div>
                  <div className="font-bold text-blue-600">setup</div>
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                  <div className="text-lg font-black text-red-700">
                    {offering.activationSummary.blocked}
                  </div>
                  <div className="font-bold text-red-600">bloqueios</div>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {offering.activationRequirements.slice(0, 4).map((requirement) => (
                  <div
                    key={requirement.code}
                    className={`rounded-xl border p-3 text-xs ${activationClass(requirement.status)}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-black">{requirement.label}</span>
                      <span className="font-black uppercase tracking-widest">{requirement.owner}</span>
                    </div>
                    <div className="mt-1 leading-5">
                      {requirement.evidenceRequired.slice(0, 2).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {offering.requiredCapabilities.slice(0, 6).map((capability) => (
                  <span
                    key={capability}
                    className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700"
                  >
                    {capability}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

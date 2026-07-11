'use client';

import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Scale } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import {
  calculateTaxReformScenarios,
  TaxReformScenario,
} from '@/lib/tax-reform/scenario-engine';
import {
  CBS_IBS_TRANSITION,
  TAX_REFORM_OFFICIAL_SOURCES,
} from '@/lib/tax-reform/official-data';

interface TaxReformScenarioStackProps {
  annualRevenue: number;
  currentTax: number;
}

const STATUS_STYLES: Record<TaxReformScenario['status'], string> = {
  stable: 'border-slate-200 bg-white text-slate-700',
  attention: 'border-amber-200 bg-amber-50 text-amber-800',
  critical: 'border-rose-200 bg-rose-50 text-rose-800',
  opportunity: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

function ScenarioCard({ scenario }: { scenario: TaxReformScenario }) {
  return (
    <div className={`rounded-2xl border p-5 ${STATUS_STYLES[scenario.status]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">
            {scenario.period}
          </p>
          <h3 className="mt-2 text-sm font-black uppercase tracking-wide">{scenario.title}</h3>
        </div>
        <Scale size={18} className="opacity-60" />
      </div>
      <p className="mt-4 text-2xl font-black">{formatCurrency(scenario.taxAmount)}</p>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-black">
        <span>Alíquota efetiva</span>
        <span>{formatPercentage(scenario.effectiveRate)}</span>
      </div>
      <p className="mt-4 text-xs leading-6 opacity-80">{scenario.note}</p>
    </div>
  );
}

export default function TaxReformScenarioStack({
  annualRevenue,
  currentTax,
}: TaxReformScenarioStackProps) {
  const result = calculateTaxReformScenarios({ annualRevenue, currentTax });
  const hasExposure = result.referenceGap > 0;

  return (
    <section className="glass-panel p-8 md:p-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-blue-600">
            Stack fiscal por grandeza
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
            Simples, CBS/IBS e reestruturação em uma régua executiva
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            A comparação usa a carga atual do bCost como base, o destaque CBS/IBS de 2026 e
            uma referência gerencial de IVA para medir exposição de caixa antes da transição plena.
          </p>
        </div>

        <div className={`rounded-2xl border px-5 py-4 ${hasExposure ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          <div className="flex items-center gap-2">
            {hasExposure ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <p className="text-[10px] font-black uppercase tracking-[0.24em]">Gap projetado</p>
          </div>
          <p className="mt-2 text-xl font-black">{formatCurrency(result.referenceGap)}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-4">
        {result.scenarios.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-blue-900">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} />
            <p className="text-xs font-black uppercase tracking-[0.24em]">Próxima ação full stack</p>
          </div>
          <p className="mt-3 text-sm font-bold leading-7">{result.recommendedAction}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-blue-700/80">
            <span className="rounded-full bg-white/70 px-3 py-1">CBS/IBS {formatPercentage(result.assumptions.cbsIbsTestRate * 100)}</span>
            <span className="rounded-full bg-white/70 px-3 py-1">IVA ref. {formatPercentage(result.assumptions.referenceVatRate * 100)}</span>
            <span className="rounded-full bg-white/70 px-3 py-1">Créditos {formatPercentage(result.assumptions.creditRecoveryRate * 100)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-900">
          <p className="text-[10px] font-black uppercase tracking-[0.24em]">Economia reestruturada</p>
          <p className="mt-3 text-2xl font-black">{formatCurrency(result.restructuredSaving)}</p>
          <a
            href={TAX_REFORM_OFFICIAL_SOURCES.constitutionalAmendment132}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-700"
          >
            Base EC 132/2023 <ArrowRight size={14} />
          </a>
        </div>
      </div>

      <p className="mt-5 text-[11px] leading-6 text-slate-500">
        {CBS_IBS_TRANSITION.officialBasis} As projeções são gerenciais e devem ser
        conciliadas com contador responsável, CNAE, regime, créditos e documentos fiscais reais.
      </p>
    </section>
  );
}

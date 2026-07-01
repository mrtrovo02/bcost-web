'use client';

import { AlertCircle, ArrowUpRight, Lightbulb, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface DecisionIntelligencePanelProps {
  riskLevel: string;
  opportunityValue: number;
  nextAction: string;
}

export default function DecisionIntelligencePanel({
  riskLevel,
  opportunityValue,
  nextAction,
}: DecisionIntelligencePanelProps) {
  return (
    <section className="glass-panel p-8 md:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-blue-600">
            Inteligência de decisão
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
            Risco, oportunidade e ação em um só lugar
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            O painel transforma dados fiscais em orientação prática para o time executivo e financeiro,
            destacando o que merece atenção imediata e o que gera ganho real.
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700">
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nível de atenção</p>
          <p className="mt-2 text-lg font-black">{riskLevel}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-2 text-emerald-700">
            <Lightbulb size={18} />
            <p className="text-sm font-black uppercase tracking-[0.25em]">Oportunidade tributária</p>
          </div>
          <p className="mt-4 text-3xl font-black text-emerald-700">{formatCurrency(opportunityValue)}</p>
          <p className="mt-3 text-sm text-emerald-700/80">
            Pode ser capturada com uma ação de revisão e organização documental.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle size={18} />
            <p className="text-sm font-black uppercase tracking-[0.25em]">Risco de conformidade</p>
          </div>
          <p className="mt-4 text-xl font-black text-amber-700">Requer atenção imediata</p>
          <p className="mt-3 text-sm text-amber-700/80">
            Melhorias em documentação e validação reduzem exposição e protegem a operação.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-3 text-white">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Próximo passo
            </p>
            <p className="text-base font-black text-slate-900">{nextAction}</p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-700">
          Abrir recomendação
          <ArrowUpRight size={16} />
        </button>
      </div>
    </section>
  );
}

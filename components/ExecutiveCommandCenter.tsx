'use client';

import { AlertTriangle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface ExecutiveCommandCenterProps {
  companyName: string;
  netSavings: number;
  taxSavingsRate: number;
  anexo: string;
  activeAlerts: number;
}

export default function ExecutiveCommandCenter({
  companyName,
  netSavings,
  taxSavingsRate,
  anexo,
  activeAlerts,
}: ExecutiveCommandCenterProps) {
  return (
    <section className="glass-panel overflow-hidden p-8 md:p-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em] text-blue-700">
            <Sparkles size={14} />
            Centro de comando
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Visão executiva para {companyName}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              O sistema destaca onde a empresa ganha mais, quais riscos urgentes merecem atenção e
              quais ações podem elevar a eficiência tributária no próximo ciclo.
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700">
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Performance atual</p>
          <p className="mt-2 text-xl font-black">+{formatPercentage(taxSavingsRate)}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.5rem] bg-slate-900 p-6 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Economia líquida acumulada
          </p>
          <p className="mt-4 text-4xl font-black">{formatCurrency(netSavings)}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Estratégia {anexo}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {activeAlerts} alertas ativos
            </span>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-2 text-slate-900">
            <ShieldCheck size={18} className="text-blue-600" />
            <p className="text-sm font-black uppercase tracking-[0.25em]">Ações recomendadas</p>
          </div>
          <ul className="mt-5 space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <ArrowRight size={16} className="mt-0.5 text-blue-600" />
              Revisar documentação do Anexo {anexo} para garantir conformidade.
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight size={16} className="mt-0.5 text-blue-600" />
              Priorizar os itens com maior impacto de economia neste ciclo.
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight size={16} className="mt-0.5 text-blue-600" />
              Automatizar a validação de riscos e pendências de forma contínua.
            </li>
          </ul>

          <div className="mt-6 flex items-center gap-2 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
            <AlertTriangle size={16} />
            <span className="text-sm font-semibold">{activeAlerts} alertas exigem atenção imediata</span>
          </div>
        </div>
      </div>
    </section>
  );
}

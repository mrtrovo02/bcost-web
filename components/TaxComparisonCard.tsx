'use client';

import {
  Landmark,
  Banknote,
  ShieldCheck,
  ArrowRight,
  Zap,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface TaxComparisonCardProps {
  data?: {
    comparison?: {
      comBcost: number;
      semBcost: number;
      netSavings: number;
    };
  };
  loading?: boolean;
}

export default function TaxComparisonCard({ data, loading }: TaxComparisonCardProps) {
  // 1. Skeleton UI Industrial (Dark Theme Preview)
  if (loading || !data?.comparison) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-52 bg-slate-900/5 animate-pulse rounded-[2.5rem] border border-slate-100 p-8 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
              <div className="w-20 h-4 bg-slate-200 rounded-full" />
            </div>
            <div className="space-y-3">
              <div className="w-full h-10 bg-slate-200 rounded-xl" />
              <div className="w-2/3 h-4 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { comBcost, semBcost, netSavings } = data.comparison;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(val);

  const savingsPercentage = semBcost > 0 ? ((netSavings / semBcost) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* CARD 01: CENÁRIO TRADICIONAL */}
      <div className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:border-amber-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.03] rounded-bl-full -mr-12 -mt-12 group-hover:bg-amber-500/[0.07] transition-all" />

        <div className="flex items-start justify-between mb-8 relative z-10">
          <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors duration-500">
            <Landmark size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Status Quo
          </span>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-1 group/info">
            <p className="text-sm font-bold text-slate-400 italic">Simples Nacional</p>
            {/* Tooltip Nativa com CSS */}
            <div className="relative">
              <Info size={12} className="text-slate-300 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/info:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl z-50 text-center leading-tight">
                Estimativa pela faixa inicial do Anexo V, sem benefício de Fator R.
              </div>
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">
            {formatCurrency(semBcost)}
          </p>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-50 flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-500" />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Anexo V: faixa inicial 15.50%
          </span>
        </div>
      </div>

      {/* CARD 02: CENÁRIO bCOST */}
      <div className="group bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-900/20 relative overflow-hidden transition-all hover:-translate-y-2 duration-500">
        <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:rotate-12 transition-transform duration-700">
          <ShieldCheck size={160} className="text-white fill-white" />
        </div>

        <div className="flex items-start justify-between mb-8 relative z-10">
          <div className="p-3 bg-white/20 text-white rounded-2xl backdrop-blur-md border border-white/20">
            <Zap size={24} className="fill-white" />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">
              Inteligência bCost
            </span>
            <div className="bg-white/20 px-2 py-0.5 rounded mt-1">
              <span className="text-[9px] font-black text-white uppercase tracking-tighter">
                Active Audit
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm font-bold text-blue-100 mb-1 italic">Imposto Otimizado</p>
          <p className="text-4xl font-black text-white tracking-tighter drop-shadow-md">
            {formatCurrency(comBcost)}
          </p>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-blue-200" />
            <span className="text-[10px] text-white font-black uppercase tracking-widest">
              Fator R Aplicado
            </span>
          </div>
          <span className="text-[10px] text-blue-100 font-bold">faixa inicial 6.0%</span>
        </div>
      </div>

      {/* CARD 03: RESULTADO */}
      <div className="group bg-[#020617] p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl relative overflow-hidden transition-all hover:bg-black">
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-[80px]" />

        <div className="flex items-start justify-between mb-8 relative z-10">
          <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/30">
            <Banknote size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
            Cashback Fiscal
          </span>
        </div>

        <div className="relative z-10">
          <p className="text-sm font-bold text-emerald-400/60 mb-1 italic">
            Lucro Líquido Preservado
          </p>
          <p className="text-4xl font-black text-white tracking-tighter">
            {formatCurrency(netSavings)}
          </p>
        </div>

        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <ArrowRight size={12} className="text-emerald-500" />
            <span className="text-[11px] font-black text-emerald-500 uppercase">
              {savingsPercentage}% Menos Carga
            </span>
          </div>
          <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
            Analytics v2.0
          </span>
        </div>
      </div>
    </div>
  );
}

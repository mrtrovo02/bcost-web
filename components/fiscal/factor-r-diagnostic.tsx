'use client';
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { MonthlyPerformance } from '@/lib/types/fiscal';

type FactorRDataPoint = MonthlyPerformance & {
  optimized?: boolean;
  action?: string;
  potentialSaving?: number | string;
};

export function FactorRDiagnostic({ data }: { data: MonthlyPerformance[] }) {
  const latest = (data[data.length - 1] ?? {}) as FactorRDataPoint;
  const optimized = Boolean(latest.optimized);
  const action =
    latest.action || 'Verifique a evolução fiscal para identificar oportunidades adicionais.';
  const potentialSaving = latest.potentialSaving ?? 0;

  return (
    <div className="p-6 rounded-[2rem] bg-[#0f172a] text-white shadow-2xl border border-slate-800 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Zap size={60} className="text-blue-400" />
      </div>
      <div className="flex items-center gap-2 mb-6">
        {optimized ? (
          <CheckCircle className="text-emerald-400" size={20} />
        ) : (
          <AlertTriangle className="text-amber-400 animate-pulse" size={20} />
        )}
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Análise Estratégica
        </span>
      </div>
      <h2 className="text-3xl font-black mb-2 tracking-tighter">
        {optimized ? 'ANEXO III' : 'ANEXO V'}
      </h2>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        {optimized
          ? 'Otimização via Fator R detectada.'
          : 'Sugerimos reenquadramento imediato para redução de carga.'}
      </p>
      {!optimized && (
        <div className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-2xl backdrop-blur-sm">
          <p className="text-sm text-blue-200 mb-3 font-bold">{action}</p>
          <div className="h-px bg-slate-800 my-4" />
          <p className="text-xl font-black text-emerald-400 uppercase tracking-tighter">
            Economia: R$ {potentialSaving}
          </p>
        </div>
      )}
    </div>
  );
}

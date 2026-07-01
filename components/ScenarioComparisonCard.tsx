'use client';

import { BarChart3, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface ScenarioComparisonCardProps {
  baseScenario: number;
  optimizedScenario: number;
}

export default function ScenarioComparisonCard({
  baseScenario,
  optimizedScenario,
}: ScenarioComparisonCardProps) {
  const delta = optimizedScenario - baseScenario;

  return (
    <section className="glass-panel p-8 md:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-blue-600">
            Cenários comparativos
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
            Veja o impacto de cada decisão tributária
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Comparar cenários ajuda a demonstrar valor de forma objetiva para o time executivo e para os clientes.
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Ganho estimado</p>
          <p className="mt-2 text-lg font-black">{formatCurrency(delta)}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-2 text-slate-700">
            <BarChart3 size={18} />
            <p className="text-sm font-black uppercase tracking-[0.25em]">Cenário base</p>
          </div>
          <p className="mt-4 text-3xl font-black text-slate-900">{formatCurrency(baseScenario)}</p>
          <p className="mt-3 text-sm text-slate-600">Impacto atual sem otimização adicional.</p>
        </div>

        <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-center gap-2 text-blue-700">
            <TrendingUp size={18} />
            <p className="text-sm font-black uppercase tracking-[0.25em]">Cenário otimizado</p>
          </div>
          <p className="mt-4 text-3xl font-black text-blue-700">{formatCurrency(optimizedScenario)}</p>
          <p className="mt-3 text-sm text-blue-700/80">Resultado com priorização inteligente e documentação alinhada.</p>
        </div>
      </div>
    </section>
  );
}

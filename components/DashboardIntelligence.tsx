'use client';

import { useMemo } from 'react';
import {
  AlertCircle,
  DollarSign,
  Percent,
  Zap,
  ShieldCheck, // Corrigido: Agora importado corretamente
  Activity,
} from 'lucide-react';
import { useCompany } from '@/app/context/CompanyContext';

/**
 * DashboardIntelligence: O cérebro analítico do bCost.
 * Focado em KPIs fiscais e saúde financeira da unidade selecionada.
 */
export default function DashboardIntelligence() {
  const { selectedCompany } = useCompany();

  /**
   * 1. Motor de Dados Analíticos (Mock de Performance)
   * Foco em metricas que o cliente entende rapido.
   */
  const stats = useMemo(
    () => [
      {
        label: 'Faturamento Mensal',
        value: 'R$ 142.500,00',
        trend: '+12.5%',
        isPositive: true,
        icon: DollarSign,
        color: 'text-emerald-500',
      },
      {
        label: 'Carga Tributária (Efetiva)',
        value: '14.2%',
        trend: '-0.8%',
        isPositive: true,
        icon: Percent,
        color: 'text-blue-500',
      },
      {
        label: 'Economia via Engine',
        value: 'R$ 8.432,10',
        trend: 'Recorde',
        isPositive: true,
        icon: Zap,
        color: 'text-amber-500',
      },
      {
        label: 'Pendências XML',
        value: '03',
        trend: 'Atenção',
        isPositive: false,
        icon: AlertCircle,
        color: 'text-red-500',
      },
    ],
    [],
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 p-8">
      {/* HEADER DE CONTEXTO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            Performance <span className="text-blue-500">Intelligence</span>
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Análise em tempo real para:{' '}
            <span className="text-slate-300 font-bold">
              {selectedCompany?.name || 'Selecione uma unidade'}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 transition-all">
            Exportar PDF
          </button>
          <button className="px-4 py-2 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all">
            Gerar DARF
          </button>
        </div>
      </div>

      {/* GRID DE KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="p-6 rounded-3xl bg-[#0a0f1a] border border-white/5 hover:border-blue-500/30 transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div
                className={`p-3 rounded-2xl bg-white/[0.03] ${stat.color} group-hover:scale-110 transition-transform`}
              >
                <stat.icon size={20} />
              </div>
              <span
                className={`text-[10px] font-black px-2 py-1 rounded-lg ${stat.isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
              >
                {stat.trend}
              </span>
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              {stat.label}
            </p>
            <h3 className="text-xl font-bold text-white mt-1 tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* ÁREA DE ANÁLISE GRÁFICA & COMPLIANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PLACEHOLDER DE GRÁFICO */}
        <div className="lg:col-span-2 p-8 rounded-[2rem] bg-[#0a0f1a] border border-white/5 min-h-[400px] flex flex-col justify-center items-center text-center">
          <Activity size={48} className="text-slate-800 mb-4 animate-pulse" />
          <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.3em]">
            Projeção Tributária Dinâmica
          </p>
          <p className="text-[10px] text-slate-700 mt-2 italic">
            Sincronizando com bCost Engine v7.0...
          </p>
        </div>

        {/* CARD DE CONFORMIDADE (Onde o ShieldCheck brilha) */}
        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col justify-between shadow-2xl shadow-blue-600/10">
          <div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck size={32} className="text-white opacity-90" />
            </div>
            <h4 className="text-2xl font-black leading-tight">Empresa em conformidade.</h4>
            <p className="text-blue-100/70 text-sm mt-4 leading-relaxed">
              O rastreio fiscal não detectou anomalias nos últimos 30 dias. O motor bCost protegeu
              seu caixa em <strong className="text-white">R$ 12.400,00</strong> este mês.
            </p>
          </div>

          <button className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest mt-8 hover:bg-blue-50 transition-all shadow-xl hover:-translate-y-1">
            Detalhes do Escaneamento
          </button>
        </div>
      </div>
    </div>
  );
}

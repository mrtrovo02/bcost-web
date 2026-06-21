'use client';

import React, { useState, useEffect } from 'react';
import { revenueApi } from '../../../lib/api/revenue';
import { RevenueStats } from '../../../lib/types/global';
import { TrendingUp, Users, Target, DollarSign, ArrowUpRight, BarChart3 } from 'lucide-react';

export default function RevenuePage() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRevenueData = async () => {
      try {
        setLoading(true);
        const data = await revenueApi.getStats();
        setStats(data);
      } catch (error) {
        console.error('🔴 [Revenue Engine Error]:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRevenueData();
  }, []);

  if (loading)
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Iniciando Engine de Receita...
        </p>
      </div>
    );

  return (
    <div className="p-10 space-y-10 bg-[#fcfdfe] min-h-screen animate-in fade-in duration-700">
      <header>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic">
          Revenue <span className="text-blue-600">Intelligence.</span>
        </h1>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2">
          Análise de Performance e Projeção de Faturamento
        </p>
      </header>

      {/* KPIs de Alto Impacto */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: 'Receita Total',
            val: stats?.totalRevenue,
            icon: <DollarSign size={20} />,
            color: 'text-blue-600',
          },
          {
            label: 'Projeção (Next Month)',
            val: stats?.projectedRevenue,
            icon: <Target size={20} />,
            color: 'text-purple-600',
          },
          {
            label: 'Crescimento',
            val: `${stats?.growthRate}%`,
            icon: <TrendingUp size={20} />,
            color: 'text-emerald-600',
          },
          {
            label: 'Contratos Ativos',
            val: stats?.activeContracts,
            icon: <Users size={20} />,
            color: 'text-slate-900',
          },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group"
          >
            <div
              className={`mb-6 p-4 rounded-2xl bg-slate-50 ${item.color} w-fit group-hover:bg-blue-600 group-hover:text-white transition-colors`}
            >
              {item.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {item.label}
            </p>
            <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tighter">
              {typeof item.val === 'number' ? `R$ ${item.val.toLocaleString('pt-BR')}` : item.val}
            </h2>
          </div>
        ))}
      </div>

      {/* Seção de Gráficos e Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <BarChart3 className="absolute right-10 top-10 text-white/5" size={120} />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">
              Insight de IA
            </p>
            <h3 className="text-3xl font-black tracking-tighter max-w-md">
              Sua receita projetada para o próximo trimestre apresenta um crescimento de{' '}
              <span className="text-blue-500">18%</span> baseado no histórico fiscal.
            </h3>
            <button className="mt-8 px-8 py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all">
              Ver Relatório Detalhado
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-[3rem] p-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <ArrowUpRight size={14} className="text-emerald-500" /> Principais Origens
          </p>
          <div className="space-y-6">
            {/* Mock de origens para visualização, deve ser conectado ao backend conforme evoluirmos */}
            {['Serviços Digitais', 'Consultoria', 'Recorrência SaaS'].map((source, i) => (
              <div
                key={i}
                className="flex justify-between items-center pb-4 border-b border-slate-50"
              >
                <span className="text-sm font-bold text-slate-700">{source}</span>
                <span className="text-sm font-black text-slate-900">{45 - i * 10}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

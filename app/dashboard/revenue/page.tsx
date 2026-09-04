'use client';

import React, { useState, useEffect } from 'react';
import { revenueApi } from '../../../lib/api/revenue';
import { RevenueStats } from '../../../lib/types/global';
import { AlertCircle, TrendingUp, Users, Target, DollarSign, ArrowUpRight, BarChart3 } from 'lucide-react';
import SplitPaymentProjector from '@/components/split-payment/SplitPaymentProjector';
import { isDemoSession } from '@/services/api';

function readCompanyRevenue(): number {
  if (typeof window === 'undefined') return 150000;
  try {
    const stored = localStorage.getItem('bcost_fiscal_revenue');
    if (stored) return Number(stored);
  } catch {
    return 150000;
  }
  return 150000;
}

export default function RevenuePage() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [faturamento, setFaturamento] = useState(150000);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFaturamento(readCompanyRevenue());

    const loadRevenueData = async () => {
      try {
        setLoading(true);
        setError(null);
        if (isDemoSession()) {
          setStats({
            totalRevenue: 830000,
            projectedRevenue: 980000,
            growthRate: 18,
            activeContracts: 12,
          });
          setFaturamento(138333);
          return;
        }
        const data = await revenueApi.getStats();
        setStats(data);
        if (data?.totalRevenue) {
          setFaturamento(Math.round(data.totalRevenue / 6));
        }
      } catch (error) {
        console.error('🔴 [Revenue Engine Error]:', error);
        setStats(null);
        setError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar as métricas reais de receita.',
        );
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

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-[#fcfdfe] p-10">
        <div className="max-w-3xl rounded-[2rem] border border-rose-200 bg-rose-50 p-8 text-rose-950 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 bg-white text-rose-600">
            <AlertCircle size={24} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-600">
            Revenue indisponível
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            Dados reais de receita não carregados
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-rose-900/80">
            {error} O módulo não exibirá valores zerados ou demonstrativos para uma empresa produtiva.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-10 bg-[#fcfdfe] min-h-screen animate-in fade-in duration-700">
      <header>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic">
          Revenue <span className="text-blue-600">Intelligence.</span>
        </h1>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2">
          Analise de Performance, Projecao de Faturamento e Split Payment
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
            label: 'Projecao (Proximo Mes)',
            val: stats?.projectedRevenue,
            icon: <Target size={20} />,
            color: 'text-purple-600',
          },
          {
            label: 'Crescimento',
            val: `${stats?.growthRate ?? 0}%`,
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
            <div className={`mb-6 p-4 rounded-2xl bg-slate-50 ${item.color} w-fit group-hover:bg-blue-600 group-hover:text-white transition-colors`}>
              {item.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {item.label}
            </p>
            <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tighter">
              {typeof item.val === 'number'
                ? item.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
                : item.val}
            </h2>
          </div>
        ))}
      </div>

      {/* Secao de Grafico e Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <BarChart3 className="absolute right-10 top-10 text-white/5" size={120} />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">
              Insight de IA
            </p>
            <h3 className="text-3xl font-black tracking-tighter max-w-md">
              Sua receita projetada para o proximo trimestre apresenta um crescimento de{' '}
              <span className="text-blue-500">{stats?.growthRate ?? 18}%</span> baseado no historico fiscal.
            </h3>
            <button className="mt-8 px-8 py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all">
              Ver Relatorio Detalhado
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-[3rem] p-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <ArrowUpRight size={14} className="text-emerald-500" /> Principais Origens
          </p>
          <div className="space-y-6">
            {['Servicos Digitais', 'Consultoria', 'Recorrencia SaaS'].map((source, i) => (
              <div key={i} className="flex justify-between items-center pb-4 border-b border-slate-50">
                <span className="text-sm font-bold text-slate-700">{source}</span>
                <span className="text-sm font-black text-slate-900">{45 - i * 10}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Split Payment Projector */}
      <div>
        <div className="mb-5">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Split Payment <span className="text-rose-600">Impact Projector</span>
          </h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
            Simulacao do impacto no fluxo de caixa 2026-2030
          </p>
        </div>
        <SplitPaymentProjector
          faturamentoMensal={faturamento}
          aliquotaEfetiva={0.11}
        />
      </div>
    </div>
  );
}

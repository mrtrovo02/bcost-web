'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useFiscalStore } from '../../../services/fiscal-store';
import { fiscalApi } from '@/lib/api/fiscal';
import { isDemoSession } from '@/services/api';
import { getDemoFiscalData } from '@/services/demo-data';
import { HealthGauge } from '../../../components/fiscal/health-gauge';
import { FactorRDiagnostic } from '../../../components/fiscal/factor-r-diagnostic';
import { IntegrityBadge } from '../../../components/fiscal/integrity-badge';
import { FiscalPerformance } from '../../../components/fiscal/fiscal-performance';
import { Info, TrendingDown, Target, AlertCircle } from 'lucide-react';

export default function IntelligencePage() {
  const { intelligence, setIntelligence, loading, setLoading, setError } = useFiscalStore();

  // Memórias do Especialista: Sincronizamos estado do browser apenas após montagem,
  // evitando mismatch de hydration entre servidor e cliente.
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeCompanyName, setActiveCompanyName] = useState('Empresa Demo');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const companyId = localStorage.getItem('bcost_active_company');
    setActiveCompanyId(companyId);

    try {
      const raw = localStorage.getItem('bcost_active_company_data');
      if (!raw) {
        setActiveCompanyName('Empresa Demo');
        return;
      }
      const parsed = JSON.parse(raw);
      setActiveCompanyName(typeof parsed?.name === 'string' ? parsed.name : 'Empresa Demo');
    } catch {
      setActiveCompanyName('Empresa Demo');
    }
  }, []);

  const syncEngine = useCallback(
    async (abortController: AbortController) => {
      if (!activeCompanyId || activeCompanyId === 'ID_DA_EMPRESA') {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        /**
         * PARALLEL EXECUTION (Grade A Performance)
         */
        const [health, opt, perf] = await Promise.all([
          fiscalApi.getDashboard(activeCompanyId),
          fiscalApi.getPerformance(activeCompanyId),
          fiscalApi.getPayrollDiagnostics(activeCompanyId),
        ]);

        setIntelligence({
          health,
          optimization: opt,
          performance: perf,
          integrity: {
            status: 'VALID',
            lastAudit: new Date().toISOString(),
          },
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);

        if (!isDemoSession()) {
          console.error('❌ [bCost Engine Error]:', message);
        }

        if (isDemoSession()) {
          const demoData = getDemoFiscalData(activeCompanyName);
          const now = new Date().toISOString();
          setIntelligence({
            health: {
              revenue: demoData.evolucao.reduce((sum, item) => sum + item.faturamento, 0),
              taxPaid: demoData.comparison.comBcost,
              taxSaved: demoData.comparison.netSavings,
              healthScore: 84,
              rbt12: demoData.evolucao.reduce((sum, item) => sum + item.faturamento, 0) * 12,
              usagePercent: '68%',
              warning: 'Dados de demonstração carregados localmente.',
              lastUpdate: now,
            },
            optimization: demoData.evolucao.map((item) => ({
              month: item.month,
              year: item.year,
              revenue: item.faturamento,
              imposto: item.imposto,
              optimized: item.otimizado,
              total: item.semBeneficio,
            })),
            performance: {
              currentFactor: 0.28,
              requiredPayroll: 13500,
              actualPayroll: 15000,
              status: 'SAFE',
              projection: {
                nextMonth: '07/2026',
                estimatedSaving: 8200,
              },
            },
            integrity: {
              status: 'VALID',
              lastAudit: now,
            },
          });
          setError(null);
        } else {
          setError(message || 'Falha na sincronização dos dados fiscais.');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [activeCompanyId, activeCompanyName, setIntelligence, setLoading, setError],
  );

  useEffect(() => {
    const abortController = new AbortController();
    syncEngine(abortController);

    return () => abortController.abort();
  }, [syncEngine]);

  /**
   * UI: ESTADO DE CARREGAMENTO
   */
  if (loading || !activeCompanyId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fcfdfe]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] animate-pulse">
            Sincronizando Engine bCost...
          </p>
        </div>
      </div>
    );
  }

  /**
   * UI: EMPTY STATE / ERROR
   * Proteção contra intelligence nulo para satisfazer o TypeScript
   */
  if (!intelligence) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcfdfe] p-8">
        <AlertCircle className="text-slate-300 mb-4" size={48} />
        <h2 className="text-xl font-bold text-slate-800">Aguardando Conexão</h2>
        <p className="text-slate-500 text-sm">
          Selecione uma empresa ativa para iniciar o diagnóstico.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-[#fcfdfe] min-h-screen animate-in fade-in duration-700">
      {/* HEADER ESTRATÉGICO */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            bCost <span className="text-blue-600">Intelligence</span>
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Tech Partners 2026
            </span>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              • Ciclo Fator R Ativo • Port: 5000 Sincronizado
            </span>
          </div>
        </div>
        <IntegrityBadge status={intelligence.integrity.status} />
      </div>

      {/* GRID DE CARDS SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm group hover:border-blue-200 transition-all duration-300">
          <div className="flex items-center gap-3 text-slate-400 mb-6">
            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
              <Info size={16} className="group-hover:text-blue-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">
              Cenário Padrão (Sem bCost)
            </span>
          </div>
          {/* Conectado aos dados reais do DashboardStats */}
          <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
            R$ {intelligence.health.revenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase">
            Alíquota Base: 15.5%
          </p>
        </div>

        <FactorRDiagnostic data={intelligence.optimization} />
        <HealthGauge data={intelligence.health} />
      </div>

      {/* SEÇÃO MÉDIA: PERFORMANCE E ESTRATÉGIA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <FiscalPerformance
            data={Array.isArray(intelligence.performance) ? intelligence.performance : []}
          />
        </div>

        {/* Card de Análise Estratégica */}
        <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Target size={120} />
          </div>

          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
              <TrendingDown size={24} />
            </div>
            <h3 className="text-3xl font-black tracking-tighter leading-tight">
              Análise
              <br />
              Estratégica
            </h3>
            <p className="text-slate-400 text-sm mt-4 font-medium leading-relaxed">
              Otimização via <span className="text-blue-400 font-bold">Fator R</span> detectada.
              Sugerimos enquadramento no:
            </p>
            <div className="mt-4 inline-block px-6 py-2 bg-blue-600 rounded-xl border border-blue-500 shadow-inner">
              <span className="text-xl font-black tracking-tighter">ANEXO III</span>
            </div>
          </div>

          <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/5 relative z-10 backdrop-blur-sm">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              Economia Projetada (Mês)
            </p>
            <div className="text-3xl font-black text-emerald-400 tracking-tighter">
              R${' '}
              {intelligence.health.taxSaved?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

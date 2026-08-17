'use client';

import { useReconciliation } from '@/app/hooks/use-reconciliation';
import { useCompany } from '@/app/context/CompanyContext';
import { ReconciliationStatus } from '@/components/reconciliation-status';
import { getToken, isDemoSession } from '@/services/api';
import { Play, History, Info, AlertTriangle, ChevronRight, ShieldCheck } from 'lucide-react';

export default function ReconciliationPage() {
  const { selectedCompany, isLoading: companyLoading } = useCompany();
  const companyId = selectedCompany?.id ?? '';
  const token = getToken();
  const canRunReconciliation = Boolean(companyId && (token || isDemoSession()));

  const { isProcessing, runAutoMatch, lastResult } = useReconciliation(companyId, token);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header com Contexto de Auditoria */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Conciliação Inteligente
          </h1>
          <p className="text-slate-500 flex items-center gap-2 mt-1">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            Motor bCost v3.0 • Processamento Auditável e Seguro
          </p>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <History className="h-4 w-4" />
            Ver Histórico
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Controle Principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-800">Automação de Fluxo</h3>
                  <p className="text-sm text-slate-500">
                    Nossa IA cruza extratos OFX/PDF com suas notas fiscais emitidas usando
                    algoritmos de similaridade.
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <Play className="h-6 w-6 text-indigo-600" />
                </div>
              </div>

              {/* Banner de Informação Técnica */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 mb-8">
                <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <strong>Dica de Especialista:</strong> Certifique-se de que os extratos bancários
                  do período foram importados na aba <em>Banking</em> antes de iniciar.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
                <button
                  onClick={runAutoMatch}
                  disabled={isProcessing || !canRunReconciliation || companyLoading}
                  className={`relative group flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${
                    isProcessing || !canRunReconciliation || companyLoading
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      Motor em Execução...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 fill-current" />
                      Iniciar Conciliação Automática
                    </>
                  )}
                </button>
                <p className="mt-4 text-xs text-slate-400">
                  {selectedCompany
                    ? `Empresa ativa: ${selectedCompany.name}`
                    : 'Selecione uma empresa ativa para executar a conciliação.'}
                </p>
              </div>

              {/* Status Reativo (Injetando o componente que criamos) */}
              <ReconciliationStatus isProcessing={isProcessing} result={lastResult} />
            </div>
          </div>
        </div>

        {/* Sidebar de Insights Rápidos */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Pendências Críticas
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-sm text-slate-300">Transações S/ Nota</span>
                <span className="font-mono font-bold text-amber-400">12</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-sm text-slate-300">Divergência de Data</span>
                <span className="font-mono font-bold text-red-400">03</span>
              </div>
              <button className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors">
                Ver Detalhes <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h4 className="font-semibold text-slate-800 mb-2">Por que bCost?</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Diferente de sistemas comuns, nossa esteira valida a{' '}
              <strong>assinatura digital</strong> das notas conciliadas para garantir validade
              jurídica perante o fisco.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

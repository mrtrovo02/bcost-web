'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { bankingApi } from '@/lib/api/banking';
import { getDemoBankTransactions } from '@/services/demo-data';
import { isDemoSession } from '@/services/api';
import { BankTransaction, TransactionStatus } from '../../../lib/types/global';
import { Landmark, RefreshCw, TrendingDown } from 'lucide-react';
import { calcularSplitPayment } from '@/components/split-payment/SplitPaymentProjector';

function readFaturamento(): number {
  if (typeof window === 'undefined') return 150000;
  try {
    return Number(localStorage.getItem('bcost_fiscal_revenue') ?? '150000') || 150000;
  } catch {
    return 150000;
  }
}

export default function BankingPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [faturamento] = useState(readFaturamento);

  const splitProjecao = calcularSplitPayment(
    { aliquotaEfetiva: 0.11, faturamentoMensal: faturamento, meiosPagamento: { pix: 60, cartao: 25, boleto: 10, outros: 5 } },
    2026,
  );
  const totalSplitMes = splitProjecao[new Date().getMonth()]?.impostoSplit ?? 0;
  const totalSplitAno = splitProjecao.reduce((s, m) => s + m.impostoSplit, 0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (isDemoSession()) {
        setTransactions(getDemoBankTransactions());
        return;
      }
      const data = await bankingApi.getTransactions();
      setTransactions(data);
    } catch (e) {
      if (isDemoSession()) {
        setTransactions(getDemoBankTransactions());
        return;
      }
      console.error('🔴 [Banking Engine Error]:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await bankingApi.runAiReconciliation();
      await loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <div className="p-8 space-y-8 bg-[#fcfdfe] min-h-screen animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
            Banking <span className="text-blue-600">& Ledger</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            Core Banking Integration 1.0.0
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Sincronizando...' : 'Conciliacao Inteligente'}
        </button>
      </header>

      {/* Split Payment no contexto bancario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white rounded-[2rem] border border-rose-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingDown size={16} className="text-rose-500" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Split Payment 2026</p>
            <p className="text-xs font-black text-slate-700">Impacto no recebimento</p>
          </div>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Retencao este mes</p>
          <p className="text-sm font-black text-rose-600">{fmt(totalSplitMes)}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">descontado no ato do recebimento</p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Retencao no ano</p>
          <p className="text-sm font-black text-amber-600">{fmt(totalSplitAno)}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">
            <a href="/dashboard/revenue" className="text-blue-500 hover:underline font-bold">
              Ver projecao completa
            </a>
          </p>
        </div>
      </div>

      {/* Grid de Transacoes */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Data / Ref</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Descricao</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Valor</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Split Estimado</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="p-10 bg-slate-50/30" />
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-20 text-center">
                  <Landmark className="mx-auto text-slate-200 mb-4" size={40} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Nenhum registro no Ledger bancario
                  </p>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const splitEstimado = tx.type === 'CREDIT' ? Math.round(tx.amount * 0.11 * 0.01 * 100) / 100 : 0;
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6 text-[11px] font-bold text-slate-500">
                      {new Date(tx.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-6 text-[11px] font-black text-slate-900 uppercase tracking-tighter">
                      {tx.description}
                    </td>
                    <td className={`p-6 text-right font-black text-[13px] ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {tx.type === 'CREDIT' ? '+' : '-'} {fmt(tx.amount)}
                    </td>
                    <td className="p-6 text-right">
                      {tx.type === 'CREDIT' && splitEstimado > 0 ? (
                        <span className="text-[11px] font-black text-rose-500">-{fmt(splitEstimado)}</span>
                      ) : (
                        <span className="text-[11px] text-slate-300">--</span>
                      )}
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                        tx.status === TransactionStatus.RECONCILED
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {tx.status === TransactionStatus.RECONCILED ? 'Conciliado' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
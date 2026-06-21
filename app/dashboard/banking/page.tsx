'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { bankingApi } from '@/lib/api/banking'; // Certifique-se que o alias @ funciona ou use ../../../lib/api/banking
import { getDemoBankTransactions } from '@/services/demo-data';
import { isDemoSession } from '@/services/api';
import { BankTransaction, TransactionStatus } from '../../../lib/types/global';
import { Landmark, RefreshCw } from 'lucide-react';

export default function BankingPage() {
  // CORREÇÃO 2345: Tipamos o estado para não ser 'never[]'
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

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
          {isSyncing ? 'Sincronizando...' : 'Conciliação Inteligente'}
        </button>
      </header>

      {/* Grid de Transações */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Data / Ref
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Descrição
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">
                Valor
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="p-10 bg-slate-50/30" />
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-20 text-center">
                  <Landmark className="mx-auto text-slate-200 mb-4" size={40} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Nenhum registro no Ledger bancário
                  </p>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6 text-[11px] font-bold text-slate-500">
                    {new Date(tx.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-6 text-[11px] font-black text-slate-900 uppercase tracking-tighter">
                    {tx.description}
                  </td>
                  <td
                    className={`p-6 text-right font-black text-[13px] ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900'}`}
                  >
                    {tx.type === 'CREDIT' ? '+' : '-'} R${' '}
                    {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-6 text-center">
                    <span
                      className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                        tx.status === TransactionStatus.RECONCILED
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}
                    >
                      {tx.status === TransactionStatus.RECONCILED ? 'Conciliado' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

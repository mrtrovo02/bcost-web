'use client';

import { useState } from 'react';
import { OpenFinanceModuleFactory } from '@/shared/factories/open-finance-factory.shared';
import { BankAccountProps } from '@/domain/open-finance/bank-account.entity';
import { Landmark, RefreshCw, Link2, AlertTriangle, CheckCircle } from 'lucide-react';

interface OpenFinanceWidgetProps {
  companyId: string;
}

export default function OpenFinanceWidget({ companyId }: OpenFinanceWidgetProps) {
  const [accounts, setAccounts] = useState<BankAccountProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    try {
      const useCase = OpenFinanceModuleFactory.makeSyncBankAccountsUseCase();
      const data = await useCase.execute({ companyId });
      setAccounts(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Falha ao sincronizar dados bancários do Open Finance.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#090d16] p-6 rounded-[2.2rem] border border-white/5 shadow-2xl transition-all duration-300 hover:border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white text-lg font-bold tracking-tight flex items-center gap-2">
            <Landmark className="text-blue-500 w-5 h-5" /> Conciliação Open Finance
          </h3>
          <p className="text-slate-400 text-xs mt-1">Sincronize suas contas PJ em tempo real.</p>
        </div>

        <button
          onClick={handleSync}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2 px-4 rounded-xl flex items-center gap-2 transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {accounts.length > 0 ? 'Atualizar Dados' : 'Conectar Banco'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="border border-dashed border-white/5 rounded-2xl p-8 text-center bg-white/[0.01]">
          <Link2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-xs">
            Nenhuma instituição financeira integrada via Open Finance.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-3">
                {account.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.logoUrl}
                    alt={account.bankName}
                    className="w-9 h-9 rounded-xl object-contain bg-white/5 p-1"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 font-bold text-xs">
                    {account.bankName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-white text-sm font-semibold">{account.name}</p>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                    {account.bankName} • {account.type}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-sm font-bold">
                  {account.balance.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: account.currency,
                  })}
                </p>
                <p className="text-emerald-500 text-xs flex items-center gap-1 justify-end mt-0.5 font-medium">
                  <CheckCircle className="w-2.5 h-2.5" /> Sincronizado
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

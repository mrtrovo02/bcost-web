'use client';

import { FileSpreadsheet, Download, Search } from 'lucide-react';

const mockTransactions = [
  {
    id: '1',
    mes: 'Janeiro/2024',
    faturamento: 45000,
    imposto: 2700,
    economia: 4275,
    status: 'Fechado',
  },
  {
    id: '2',
    mes: 'Fevereiro/2024',
    faturamento: 52000,
    imposto: 3120,
    economia: 4940,
    status: 'Fechado',
  },
  {
    id: '3',
    mes: 'Março/2024',
    faturamento: 48500,
    imposto: 2910,
    economia: 4607,
    status: 'Processando',
  },
];

export default function TaxHistoryTable() {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            Histórico de Fechamentos
          </h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 text-zinc-500">
            Detalhamento por competência
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar mês..."
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all w-64 font-medium"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600">
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              <th className="px-8 py-5">Competência</th>
              <th className="px-8 py-5">Faturamento Bruto</th>
              <th className="px-8 py-5">Imposto (Anexo III)</th>
              <th className="px-8 py-5 text-emerald-600">Economia Gerada</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5">Doc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {mockTransactions.map((tx) => (
              <tr key={tx.id} className="group hover:bg-blue-50/30 transition-colors">
                <td className="px-8 py-5 font-bold text-slate-700">{tx.mes}</td>
                <td className="px-8 py-5 text-slate-600 font-medium">
                  R$ {tx.faturamento.toLocaleString('pt-BR')}
                </td>
                <td className="px-8 py-5 text-blue-600 font-bold">
                  R$ {tx.imposto.toLocaleString('pt-BR')}
                </td>
                <td className="px-8 py-5">
                  <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black">
                    + R$ {tx.economia.toLocaleString('pt-BR')}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${tx.status === 'Fechado' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`}
                    />
                    <span className="text-xs font-bold text-slate-600">{tx.status}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors">
                  <FileSpreadsheet size={20} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
        <button className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors">
          Ver Histórico Completo
        </button>
      </div>
    </div>
  );
}

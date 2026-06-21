'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { hrApi } from '@/lib/api/hr';
import type { PayrollRecord } from '@/types/hr';
import UploadModal from '../../../components/UploadModal';
import { getDemoPayroll } from '@/services/demo-data';
import { isDemoSession } from '@/services/api';
import { Search, Filter, Users, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function PayrollPage() {
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  /**
   * Data Engine: Consome a API de RH blindada com fallback para Demo
   */
  const fetchPayroll = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isDemoSession()) {
        const demoData = getDemoPayroll();
        setPayroll(Array.isArray(demoData) ? demoData : []);
        return;
      }
      const data = await hrApi.getPayroll();
      setPayroll(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      if (isDemoSession()) {
        const demoData = getDemoPayroll();
        setPayroll(Array.isArray(demoData) ? demoData : []);
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error('🔴 [bCost Payroll Engine Error]:', message);
      setPayroll([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  /**
   * Business Logic: Filtragem otimizada com normalização defensiva de strings
   */
  const filteredPayroll = useMemo(() => {
    const safePayroll = Array.isArray(payroll) ? payroll : [];
    const safeSearch = (searchTerm ?? '').toLowerCase();

    return safePayroll.filter((record) => {
      if (!record) return false;

      // Normalização robusta de propriedades em runtime
      const employeeName = (record.employeeName ?? '').toString().toLowerCase();
      const role = (record.role ?? '').toString().toLowerCase();
      const department = (record.department ?? '').toString().toLowerCase();

      const matchesSearch =
        employeeName.includes(safeSearch) ||
        role.includes(safeSearch) ||
        department.includes(safeSearch);

      const matchesStatus = filterStatus === 'ALL' || record.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [payroll, searchTerm, filterStatus]);

  return (
    <div className="p-8 space-y-8 bg-[#fcfdfe] min-h-screen animate-in fade-in duration-700">
      {/* Header Estratégico */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            Folha de <span className="text-blue-600">Pagamento</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            Gestão de Colaboradores e Remuneração
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-slate-200 active:scale-95"
        >
          <Users size={16} className="group-hover:scale-110 transition-transform" />
          Importar Espelho Ponto
        </button>
      </div>

      {/* Toolbar de Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input
            type="text"
            placeholder="Buscar por colaborador, cargo ou departamento..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-[11px] font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 ring-blue-500/10 focus:border-blue-500 transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
          <select
            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-[11px] font-bold text-slate-600 outline-none cursor-pointer appearance-none hover:bg-slate-100 transition-colors"
            onChange={(e) => setFilterStatus(e.target.value)}
            value={filterStatus}
          >
            <option value="ALL">TODOS OS STATUS</option>
            <option value="PAID">PAGO</option>
            <option value="PENDING">AGUARDANDO</option>
            <option value="ERROR">INCONSISTÊNCIA</option>
          </select>
        </div>
        <div className="flex items-center justify-center bg-blue-50 rounded-xl px-4 text-[10px] font-black text-blue-600 uppercase tracking-widest border border-blue-100">
          {filteredPayroll.length} Registros
        </div>
      </div>

      {/* Tabela de Folha de Pagamento */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Colaborador
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Cargo / Departamento
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">
                Remuneração Líquida
              </th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                Status Pagamento
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="p-8 h-20 bg-slate-50/30" />
                </tr>
              ))
            ) : filteredPayroll.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-32 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="text-slate-200" size={48} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Nenhum registro encontrado no banco de dados.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPayroll.map((record) => (
                <tr
                  key={record?.id}
                  className="hover:bg-slate-50/80 transition-all group cursor-default"
                >
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Users size={18} />
                      </div>
                      <div>
                        <p className="text-[12px] font-black text-slate-900 tracking-tighter uppercase">
                          {record?.employeeName ?? 'Colaborador Não Identificado'}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">
                          ID: {record?.id ?? 'S/N'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <p className="text-[11px] font-bold text-slate-900 uppercase truncate max-w-[200px]">
                      {record?.role ?? 'Não Informado'}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      {record?.department ?? 'Sem Departamento'}
                    </p>
                  </td>
                  <td className="p-6 text-right">
                    <p className="text-[13px] font-black text-slate-900">
                      R$ {(record?.netPay ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center">
                      <span
                        className={`
                        flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border
                        ${
                          record?.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : record?.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-600 border-amber-100'
                              : 'bg-red-50 text-red-600 border-red-100'
                        }
                      `}
                      >
                        {record?.status === 'PAID' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {record?.status === 'PAID'
                          ? 'Efetuado'
                          : record?.status === 'PENDING'
                            ? 'Agendado'
                            : 'Inconsistente'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPayroll}
      />
    </div>
  );
}

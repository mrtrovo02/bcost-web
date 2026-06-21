'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../../services/api';

/**
 * Interface de Contrato: Estrutura de Folha de Pagamento
 */
interface PayrollRecord {
  id: string;
  employeeName: string;
  department: string;
  grossSalary: number;
  netSalary: number;
  taxTotal: number; // Soma de INSS + FGTS + IRRF
  referenceMonth: string;
}

export default function PayrollPage() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  /**
   * Engine de Carga: Busca registros da empresa ativa
   */
  const fetchPayroll = useCallback(async () => {
    try {
      setIsLoading(true);
      const companyId = localStorage.getItem('bcost_active_company');

      if (!companyId) return;

      const { data } = await api.get<PayrollRecord[]>(`/fiscal/payroll/${companyId}`);
      setRecords(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('🔴 [Payroll Error]:', message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  /**
   * Cálculos de BI (Business Intelligence) em tempo real
   */
  const stats = useMemo(() => {
    const filtered =
      selectedDept === 'ALL' ? records : records.filter((r) => r.department === selectedDept);

    return {
      totalPayroll: filtered.reduce((acc, curr) => acc + curr.grossSalary, 0),
      totalTaxes: filtered.reduce((acc, curr) => acc + curr.taxTotal, 0),
      headcount: filtered.length,
      filteredData: filtered,
    };
  }, [records, selectedDept]);

  // Extrai departamentos únicos para o filtro
  const departments = useMemo(
    () => Array.from(new Set(records.map((r) => r.department))),
    [records],
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Industrial */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">
            Folha de Pagamento<span className="text-blue-500">.</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">
            Gestão de Encargos e Proventos Trabalhistas
          </p>
        </div>

        <div className="flex gap-4">
          <select
            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-blue-400 uppercase outline-none"
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="ALL">Todos os Departamentos</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de KPIs de Encargos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] backdrop-blur-md">
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
            Custo Bruto Total
          </p>
          <p className="text-2xl font-black text-white">
            R$ {stats.totalPayroll.toLocaleString('pt-BR')}
          </p>
          <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 w-[70%]" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] backdrop-blur-md">
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
            Encargos (INSS/FGTS)
          </p>
          <p className="text-2xl font-black text-red-500">
            R$ {stats.totalTaxes.toLocaleString('pt-BR')}
          </p>
          <p className="text-[9px] font-bold text-slate-600 mt-1 uppercase">
            Eficiência: 28.4% sobre o bruto
          </p>
        </div>

        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] backdrop-blur-md">
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
            Colaboradores Ativos
          </p>
          <p className="text-2xl font-black text-blue-500">{stats.headcount}</p>
          <p className="text-[9px] font-bold text-slate-600 mt-1 uppercase">
            Unidade: {selectedDept}
          </p>
        </div>
      </div>

      {/* Tabela Detalhada */}
      <div className="bg-slate-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 border-b border-white/5">
              <th className="p-6 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                Colaborador
              </th>
              <th className="p-6 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                Departamento
              </th>
              <th className="p-6 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                Salário Bruto
              </th>
              <th className="p-6 text-[9px] font-black uppercase text-slate-500 tracking-widest text-right">
                Encargos Totais
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading
              ? [1, 2, 3].map((i) => <tr key={i} className="h-16 animate-pulse bg-white/5" />)
              : stats.filteredData.map((record) => (
                  <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-6">
                      <p className="text-[11px] font-black text-white uppercase">
                        {record.employeeName}
                      </p>
                      <p className="text-[8px] font-bold text-slate-600 uppercase">
                        REF: {record.referenceMonth}
                      </p>
                    </td>
                    <td className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {record.department}
                    </td>
                    <td className="p-6 text-[12px] font-black text-white">
                      R$ {record.grossSalary.toLocaleString('pt-BR')}
                    </td>
                    <td className="p-6 text-right">
                      <span className="text-[12px] font-black text-red-400">
                        R$ {record.taxTotal.toLocaleString('pt-BR')}
                      </span>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { hrApi } from '@/lib/api/hr';
import type { PayrollRecord } from '@/types/hr';
import UploadModal from '../../../components/UploadModal';
import { getDemoPayroll } from '@/services/demo-data';
import { isDemoSession } from '@/services/api';
import { DpModuleFactory } from '@/shared/factories/dp-factory.shared';
import { formatCurrency } from '@/lib/formatters';
import {
  Search,
  Filter,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calculator,
  TrendingUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Tipos locais
// ---------------------------------------------------------------------------

interface FolhaCalculada {
  id: string;
  colaboradorId: string;
  nomeColaborador: string;
  periodoCompetencia: string;
  salarioBruto: number;
  descontoInss: number;
  descontoIrrf: number;
  fgts?: number;
  salarioLiquido: number;
  tipo?: string;
}

const MES_ATUAL = new Date().getMonth() + 1;
const ANO_ATUAL = new Date().getFullYear();
const COMPETENCIA_ATUAL = `${ANO_ATUAL}-${String(MES_ATUAL).padStart(2, '0')}`;

function readCompanyId(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('bcost_active_company') ||
    localStorage.getItem('bcost_company_id') ||
    ''
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  color = 'text-slate-900',
  icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
        <p className={`text-lg font-black mt-0.5 ${color}`}>{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabela de Folha Calculada
// ---------------------------------------------------------------------------

function FolhaCalculadaTable({ data }: { data: FolhaCalculada[] }) {
  if (data.length === 0) return null;

  const totalBruto = data.reduce((s, r) => s + r.salarioBruto, 0);
  const totalInss = data.reduce((s, r) => s + r.descontoInss, 0);
  const totalIrrf = data.reduce((s, r) => s + r.descontoIrrf, 0);
  const totalFgts = data.reduce((s, r) => s + (r.fgts ?? 0), 0);
  const totalLiquido = data.reduce((s, r) => s + r.salarioLiquido, 0);

  return (
    <div className="space-y-4">
      {/* KPIs da folha calculada */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Bruto" value={formatCurrency(totalBruto)} icon={<TrendingUp size={16} />} />
        <KpiCard label="Total INSS" value={formatCurrency(totalInss)} color="text-amber-600" icon={<Calculator size={16} />} />
        <KpiCard label="Total IRRF" value={formatCurrency(totalIrrf)} color="text-rose-600" icon={<Calculator size={16} />} />
        <KpiCard label="Total FGTS" value={formatCurrency(totalFgts)} color="text-blue-600" icon={<Calculator size={16} />} />
        <KpiCard label="Total Líquido" value={formatCurrency(totalLiquido)} color="text-emerald-600" icon={<CheckCircle2 size={16} />} />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-50">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Calculator size={14} className="text-blue-600" />
            Cálculo de Folha — {data[0]?.periodoCompetencia}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Tabelas INSS/IRRF 2024 progressivas</p>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              {['Colaborador', 'Salário Bruto', 'INSS', 'IRRF', 'FGTS', 'Salário Líquido'].map((h) => (
                <th key={h} className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  <p className="text-xs font-black text-slate-900 uppercase">{r.nomeColaborador}</p>
                  <p className="text-[9px] text-slate-400 uppercase">{r.tipo ?? 'MENSAL'}</p>
                </td>
                <td className="p-4 text-sm font-bold text-slate-700">{formatCurrency(r.salarioBruto)}</td>
                <td className="p-4 text-sm font-bold text-amber-600">{formatCurrency(r.descontoInss)}</td>
                <td className="p-4 text-sm font-bold text-rose-600">{formatCurrency(r.descontoIrrf)}</td>
                <td className="p-4 text-sm font-bold text-blue-600">{formatCurrency(r.fgts ?? 0)}</td>
                <td className="p-4 text-sm font-black text-emerald-600">{formatCurrency(r.salarioLiquido)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900">
              <td className="p-4 text-xs font-black text-white uppercase tracking-wider">TOTAIS</td>
              <td className="p-4 text-xs font-black text-white">{formatCurrency(totalBruto)}</td>
              <td className="p-4 text-xs font-black text-amber-300">{formatCurrency(totalInss)}</td>
              <td className="p-4 text-xs font-black text-rose-300">{formatCurrency(totalIrrf)}</td>
              <td className="p-4 text-xs font-black text-blue-300">{formatCurrency(totalFgts)}</td>
              <td className="p-4 text-xs font-black text-emerald-300">{formatCurrency(totalLiquido)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function PayrollPage() {
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [folhaCalculada, setFolhaCalculada] = useState<FolhaCalculada[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [competencia, setCompetencia] = useState<string>(COMPETENCIA_ATUAL);
  const [tipoCalculo, setTipoCalculo] = useState<'MENSAL' | 'DECIMO_TERCEIRO' | 'FERIAS' | 'RESCISAO'>('MENSAL');
  const [erroCalculo, setErroCalculo] = useState<string | null>(null);

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
        setPayroll(getDemoPayroll());
        return;
      }
      console.error('🔴 [bCost Payroll Engine Error]:', error);
      setPayroll([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  const calcularFolha = useCallback(async () => {
    setIsCalculating(true);
    setErroCalculo(null);
    try {
      const companyId = readCompanyId();
      if (!companyId && !isDemoSession()) {
        throw new Error('Empresa não selecionada. Selecione uma empresa na barra lateral.');
      }

      if (isDemoSession()) {
        // Simula cálculo com dados demo
        const demoData = getDemoPayroll();
        const calculados: FolhaCalculada[] = demoData.map((r, i) => {
          const bruto = r.grossSalary ?? 5000;
          const inss = bruto * 0.11;
          const irrf = bruto > 2500 ? (bruto - inss) * 0.075 - 150 : 0;
          const fgts = bruto * 0.08;
          return {
            id: String(i),
            colaboradorId: r.id,
            nomeColaborador: r.employeeName ?? '',
            periodoCompetencia: competencia,
            salarioBruto: bruto,
            descontoInss: Math.max(0, inss),
            descontoIrrf: Math.max(0, irrf),
            fgts,
            salarioLiquido: bruto - inss - Math.max(0, irrf),
            tipo: tipoCalculo,
          };
        });
        setFolhaCalculada(calculados);
        return;
      }

      const useCase = DpModuleFactory.makeCalculateFolhaUseCase();
      const resultado = await useCase.execute({
        companyId,
        competencia,
        tipo: tipoCalculo,
      });
      setFolhaCalculada(resultado as FolhaCalculada[]);
    } catch (err) {
      setErroCalculo(err instanceof Error ? err.message : 'Erro ao calcular folha.');
    } finally {
      setIsCalculating(false);
    }
  }, [competencia, tipoCalculo]);

  const filteredPayroll = useMemo(() => {
    const safePayroll = Array.isArray(payroll) ? payroll : [];
    const safeSearch = (searchTerm ?? '').toLowerCase();

    return safePayroll.filter((record) => {
      if (!record) return false;
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            Folha de <span className="text-blue-600">Pagamento</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            Gestão de Colaboradores · Tabelas INSS/IRRF 2024
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

      {/* Painel de Cálculo */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <Calculator size={14} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Motor de Cálculo — Folha bCost
            </h3>
            <p className="text-[10px] text-slate-400">INSS progressivo · IRRF 2024 · FGTS 8%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              Competência
            </label>
            <input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
              Tipo de Cálculo
            </label>
            <select
              value={tipoCalculo}
              onChange={(e) => setTipoCalculo(e.target.value as typeof tipoCalculo)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
            >
              <option value="MENSAL">Folha Mensal</option>
              <option value="DECIMO_TERCEIRO">13º Salário</option>
              <option value="FERIAS">Férias</option>
              <option value="RESCISAO">Rescisão</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={calcularFolha}
              disabled={isCalculating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            >
              {isCalculating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Calculator size={14} />
              )}
              {isCalculating ? 'Calculando...' : 'Calcular Folha'}
            </button>
          </div>
        </div>

        {erroCalculo && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-bold text-rose-600">
            {erroCalculo}
          </div>
        )}
      </div>

      {/* Resultado do cálculo */}
      {folhaCalculada.length > 0 && <FolhaCalculadaTable data={folhaCalculada} />}

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
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center justify-center bg-blue-50 rounded-xl px-4 h-full text-[10px] font-black text-blue-600 uppercase tracking-widest border border-blue-100">
            {filteredPayroll.length} Registros
          </div>
          <button
            onClick={fetchPayroll}
            disabled={isLoading}
            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin text-slate-500" />
            ) : (
              <RefreshCw size={14} className="text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Tabela histórico de folha */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-50">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Histórico de Pagamentos
          </h3>
        </div>
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
                      Nenhum registro encontrado.
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
                      {record.role ?? 'Não Informado'}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      {record.department ?? 'Sem Departamento'}
                    </p>
                  </td>
                  <td className="p-6 text-right">
                    <p className="text-[13px] font-black text-slate-900">
                      {formatCurrency(record.netPay ?? record.amount ?? 0)}
                    </p>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center">
                      <span
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          record?.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : record?.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-600 border-amber-100'
                              : 'bg-red-50 text-red-600 border-red-100'
                        }`}
                      >
                        {record?.status === 'PAID' ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <Clock size={12} />
                        )}
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

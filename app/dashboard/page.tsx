'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, isDemoSession } from '@/services/api';
import { getDemoFiscalData } from '@/services/demo-data';
import { useCompany } from '@/app/context/CompanyContext';
import TaxEvolutionChart from '@/components/TaxEvolutionChart';
import { MonthlyPerformance } from '@/lib/types/fiscal';
import { TrendingUp, Download, Activity, AlertCircle, Clock, DollarSign } from 'lucide-react';

type DashboardHistoryEntry = MonthlyPerformance;

interface FiscalData {
  company: string;
  overview: {
    totalRevenue: number;
    estimatedTax: number;
    netRevenue: number;
    fatorR: string;
    totalInvoices: number;
  };
  insights: {
    taxEfficiency: string;
    suggestion: string;
  };
  history: DashboardHistoryEntry[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<FiscalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const lastLoadedId = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTaxData = useCallback(async () => {
    if (!selectedCompany?.id) {
      setData(null);
      lastLoadedId.current = null;
      return;
    }

    if (selectedCompany.id === lastLoadedId.current) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);

    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Consultas simultâneas otimizadas no Motor bCost
      const [metricsRes, fatorRRes, overviewRes] = await Promise.all([
        api.get(`/revenue/metrics/${selectedCompany.id}`, {
          params: { month, year },
          signal: abortControllerRef.current.signal,
        }),
        api.get(`/revenue/factor-r/${selectedCompany.id}`, {
          signal: abortControllerRef.current.signal,
        }),
        api.get('/dashboard/overview', {
          headers: { 'x-company-id': selectedCompany.id },
          signal: abortControllerRef.current.signal,
        }),
      ]);

      lastLoadedId.current = selectedCompany.id;

      const metrics = metricsRes.data as {
        totalInvoiced?: number;
        taxProvision?: number;
        invoiceCount?: number;
        fiscalIntelligence?: { isEligibleAnexoIII?: boolean };
      };
      const fatorR = fatorRRes.data as { fatorR?: number; value?: number };
      const overview = overviewRes.data as {
        summary?: { financialScore?: number };
        revenueChart?: DashboardHistoryEntry[];
      };

      const totalRevenue = metrics.totalInvoiced || 0;
      const estimatedTax = metrics.taxProvision || 0;
      const isAnexoIII = metrics.fiscalIntelligence?.isEligibleAnexoIII || false;
      const fatorRValue = fatorR.fatorR || fatorR.value || 0;

      setData({
        company: selectedCompany.name,
        overview: {
          totalRevenue,
          estimatedTax,
          netRevenue: totalRevenue - estimatedTax,
          fatorR: `${(fatorRValue * 100).toFixed(2)}%`,
          totalInvoices: metrics.invoiceCount || 0,
        },
        insights: {
          taxEfficiency: `Anexo ${isAnexoIII ? 'III' : 'V'} • Score: ${overview.summary?.financialScore || 0}/100`,
          suggestion: isAnexoIII
            ? 'Parabéns! Enquadramento no Anexo III via Fator R ativo.'
            : 'Sugestão: Ajuste o Pró-labore para enquadramento no Anexo III.',
        },
        history: overview.revenueChart || [],
      });
    } catch (error: unknown) {
      const isCanceled =
        error instanceof Error &&
        (error.name === 'CanceledError' || (error as { code?: string }).code === 'ERR_CANCELED');
      if (isCanceled) return;

      console.error('Erro crítico no Motor bCost:', error);

      const status =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as Record<string, unknown>).status === 'number'
          ? (error as { status?: number }).status
          : undefined;

      if (isDemoSession()) {
        const demoData = getDemoFiscalData(selectedCompany.name);
        const totalRevenue = demoData.evolucao.reduce((sum, item) => sum + item.faturamento, 0);
        setData({
          company: selectedCompany.name,
          overview: {
            totalRevenue,
            estimatedTax: demoData.comparison.comBcost,
            netRevenue: totalRevenue - demoData.comparison.comBcost,
            fatorR: '11.0%',
            totalInvoices: demoData.evolucao.length,
          },
          insights: {
            taxEfficiency: `Anexo ${demoData.metadata.anexoUtilizado} • Demo Ativo`,
            suggestion: 'Exibição de demonstração localizada para o painel de vendas.',
          },
          history: demoData.evolucao,
        });
      } else if (status === 401) {
        router.push('/login');
      }
      lastLoadedId.current = null;
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, selectedCompany?.name, router]);

  useEffect(() => {
    fetchTaxData();
    return () => abortControllerRef.current?.abort();
  }, [fetchTaxData]);

  const exportToPDF = async () => {
    const element = document.getElementById('dashboard-content');
    if (!element || !data) return;
    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#020408',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Relatorio_bCost_${selectedCompany?.name}.pdf`);
    } catch (e) {
      console.error('Falha na exportação:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full space-y-8 pb-10">
      {/* Título da Rota e Ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            bCost <span className="text-blue-500 font-normal">Intelligence</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
            {selectedCompany?.name || 'Aguardando Unidade'} • Ciclo {new Date().getFullYear()}
          </p>
        </div>
        <button
          onClick={exportToPDF}
          disabled={isExporting || !data}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/10 transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none"
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Download size={15} />
          )}
          {isExporting ? 'Gerando Relatório...' : 'Exportar Relatório'}
        </button>
      </div>

      {!selectedCompany ? (
        <div className="p-24 text-center border-2 border-dashed rounded-[2.5rem] border-white/5 bg-[#090d16]/30 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="bg-[#090d16] border border-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Activity className="text-blue-500/70" size={28} />
          </div>
          <p className="text-slate-300 font-black text-lg uppercase tracking-widest">
            Aguardando Unidade de Negócio
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Selecione uma empresa na barra lateral para carregar a inteligência fiscal.
          </p>
        </div>
      ) : loading && !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[#090d16] border border-white/5 rounded-[2rem]" />
            ))}
          </div>
          <div className="h-96 bg-[#090d16] border border-white/5 rounded-[2.5rem] animate-pulse" />
        </div>
      ) : (
        <div
          id="dashboard-content"
          className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ${loading ? 'opacity-40 pointer-events-none' : ''}`}
        >
          {/* Grid de Métricas de Alta Performance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Faturamento Bruto"
              value={data?.overview.totalRevenue || 0}
              icon={<TrendingUp size={18} />}
              badgeColor="bg-blue-500/10 text-blue-400"
            />
            <KPICard
              title="Provisão de Imposto"
              value={data?.overview.estimatedTax || 0}
              icon={<AlertCircle size={18} />}
              color="text-rose-400"
              badgeColor="bg-rose-500/10 text-rose-400"
            />
            <KPICard
              title="Fator R Atual"
              value={data?.overview.fatorR || '0%'}
              icon={<Activity size={18} />}
              isCurrency={false}
              color="text-amber-400"
              badgeColor="bg-amber-500/10 text-amber-400"
            />
            <KPICard
              title="Disponibilidade Líquida"
              value={data?.overview.netRevenue || 0}
              icon={<DollarSign size={18} />}
              color="text-emerald-400"
              badgeColor="bg-emerald-500/10 text-emerald-400"
            />
          </div>

          {/* Gráfico do Histórico */}
          <div className="bg-[#090d16] border border-white/5 p-8 rounded-[2.5rem] shadow-[0_4px_30px_rgba(0,0,0,0.4)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
              <TrendingUp size={140} className="text-white" />
            </div>
            <h3 className="text-base font-black mb-8 flex items-center gap-2 text-white relative z-10 uppercase tracking-wider">
              <Clock className="text-blue-500" size={16} /> Histórico de Performance
            </h3>
            <div className="h-[380px] w-full relative z-10 min-w-0">
              <TaxEvolutionChart data={data?.history || []} loading={loading} />
            </div>
          </div>

          {/* Banner de Insight Estratégico */}
          <div className="bg-gradient-to-r from-[#090d16] to-[#0d1527] p-7 rounded-[2rem] text-white flex flex-col md:flex-row items-start md:items-center justify-between border border-white/5 shadow-xl gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                <ZapIcon />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-0.5">
                  Estratégia Sugerida
                </p>
                <p className="text-sm font-bold text-slate-200">{data?.insights.suggestion}</p>
              </div>
            </div>
            <div className="text-left md:text-right flex-shrink-0 bg-white/[0.02] border border-white/5 p-3 rounded-xl min-w-[140px]">
              <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-0.5">
                Eficiência Fiscal
              </p>
              <p className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                {data?.insights.taxEfficiency}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ZapIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white"
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  isCurrency?: boolean;
  color?: string;
  badgeColor?: string;
}

function KPICard({
  title,
  value,
  icon,
  isCurrency = true,
  color = 'text-white',
  badgeColor = 'bg-white/5 text-slate-400',
}: KPICardProps) {
  return (
    <div className="bg-[#090d16] p-6 rounded-[2.2rem] border border-white/5 shadow-[0_4px_25px_rgba(0,0,0,0.2)] transition-all duration-300 hover:border-white/10 group">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-105 ${badgeColor}`}
      >
        {icon}
      </div>
      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
        {title}
      </p>
      <h4 className={`text-xl font-black tracking-tight ${color}`}>
        {isCurrency
          ? Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : value}
      </h4>
    </div>
  );
}

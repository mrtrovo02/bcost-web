'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isDemoSession } from '@/services/api';
import { getDemoFiscalData } from '@/services/demo-data';
import { useCompany } from '@/app/context/CompanyContext';
import TaxEvolutionChart from '@/components/TaxEvolutionChart';
import CbsIbsAlertBanner, { calcularCbsIbs } from '@/components/alerts/CbsIbsAlertBanner';
import TaxScenarioSimulator from '@/components/tax-intelligence/TaxScenarioSimulator';
import TaxReformScenarioStack from '@/components/tax-reform/TaxReformScenarioStack';
import { MonthlyPerformance } from '@/lib/types/fiscal';
import { CBS_IBS_TRANSITION } from '@/lib/tax-reform/official-data';
import { buildDashboardPdfCanvasOptions } from '@/lib/export/html2canvas-options';
import { FiscalModuleFactory } from '@/shared/factories/fiscal-factory.shared';
import { assertOperationalDemoFallbackEnabled, isDemoEntityId } from '@/lib/config/demo-policy';
import {
  TrendingUp,
  Download,
  Activity,
  AlertCircle,
  Clock,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

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
  history: MonthlyPerformance[];
}

function getErrorStatus(error: unknown): number | undefined {
  const responseStatus =
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
      ? (error as { response: { status: number } }).response.status
      : undefined;

  const directStatus =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as Record<string, unknown>).status === 'number'
      ? (error as { status?: number }).status
      : undefined;

  return responseStatus ?? directStatus;
}

export default function DashboardPage() {
  const router = useRouter();
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<FiscalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [operationalError, setOperationalError] = useState<string | null>(null);
  const lastLoadedId = useRef<string | null>(null);

  const fetchTaxData = useCallback(async (companyId: string) => {
    if (companyId === lastLoadedId.current) return;
    setLoading(true);
    setOperationalError(null);

    try {
      if (isDemoSession() && isDemoEntityId(companyId)) {
        assertOperationalDemoFallbackEnabled(
          'Intelligence demonstrativo desabilitado neste ambiente.',
        );
        const demoData = getDemoFiscalData(selectedCompany?.name || '');
        const totalRevenue = demoData.evolucao.reduce((sum, item) => sum + item.faturamento, 0);
        setData({
          company: selectedCompany?.name || '',
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
        lastLoadedId.current = companyId;
        return;
      }

      const useCase = FiscalModuleFactory.makeFetchTaxDataUseCase();
      const raw = await useCase.execute({ companyId });

      setData({
        company: selectedCompany?.name || companyId,
        overview: {
          totalRevenue: raw.totalRevenue,
          estimatedTax: raw.estimatedTax,
          netRevenue: raw.netRevenue,
          fatorR: raw.fatorR,
          totalInvoices: raw.totalInvoices,
        },
        insights: {
          taxEfficiency: raw.taxEfficiency ?? 'Calculando...',
          suggestion: raw.suggestion ?? 'Nenhuma sugestão disponível.',
        },
        history: [],
      });
      lastLoadedId.current = companyId;
    } catch (error: unknown) {
      console.error('Erro capturado pela esteira Clean Architecture:', error);
      const status = getErrorStatus(error);

      if (status === 401) {
        router.push('/login');
        return;
      }

      setOperationalError(
        status
          ? `Não foi possível carregar os dados fiscais reais desta empresa (HTTP ${status}).`
          : 'Não foi possível carregar os dados fiscais reais desta empresa.',
      );
      setData(null);
      lastLoadedId.current = null;
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.name, router]);

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchTaxData(selectedCompany.id);
    } else {
      setData(null);
      setOperationalError(null);
      lastLoadedId.current = null;
    }
  }, [selectedCompany?.id, fetchTaxData]);

  const exportToPDF = async () => {
    const element = document.getElementById('dashboard-content');
    if (!element || !data) return;
    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(element, buildDashboardPdfCanvasOptions('#020408'));
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

  // Calcula destaque informativo CBS/IBS com base no faturamento atual.
  const cbsIbsImpact = data?.overview.totalRevenue
    ? calcularCbsIbs(data.overview.totalRevenue)
    : null;
  const annualizedRevenue = data?.overview.totalRevenue
    ? data.overview.totalRevenue * 12
    : 0;
  const annualizedTax = data?.overview.estimatedTax
    ? data.overview.estimatedTax * 12
    : 0;

  return (
    <div className="w-full space-y-8 pb-10">
      {/* Título e ações */}
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
      ) : operationalError ? (
        <div className="p-10 border border-amber-500/20 rounded-[2rem] bg-amber-500/[0.06] animate-in fade-in duration-500">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="text-amber-400" size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">
                Integração fiscal indisponível
              </p>
              <h3 className="mt-2 text-xl font-black text-white">
                Dados reais não carregados para esta empresa
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                {operationalError} O painel não exibirá dados demonstrativos para uma empresa real;
                valide autenticação, `x-company-id`, permissões e o endpoint fiscal antes de usar o
                relatório como evidência operacional.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          id="dashboard-content"
          className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ${loading ? 'opacity-40 pointer-events-none' : ''}`}
        >
          {/* KPIs principais */}
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

          <div className="mt-2">
            <TaxScenarioSimulator />
          </div>

          {/* ─── Painel CBS/IBS com impacto calculado ──────────────────── */}
          {cbsIbsImpact && (
            <div className="bg-[#090d16] border border-amber-500/20 rounded-[2rem] p-6 space-y-5 animate-in fade-in duration-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShieldAlert size={18} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Destaque informativo CBS/IBS no faturamento
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {CBS_IBS_TRANSITION.phaseLabel} a partir de {CBS_IBS_TRANSITION.displayStartDate} • Reforma Tributária EC 132/2023
                  </p>
                </div>
              </div>

              {/* Métricas de impacto */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
                    Base de Cálculo
                  </p>
                  <p className="text-base font-black text-white">
                    {cbsIbsImpact.baseValue.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1">faturamento atual</p>
                </div>

                <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase text-amber-500/70 tracking-widest mb-2">
                    CBS — 0,9%
                  </p>
                  <p className="text-base font-black text-amber-400">
                    {cbsIbsImpact.cbs.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1">Contribuição sobre B&S</p>
                </div>

                <div className="bg-orange-500/[0.06] border border-orange-500/20 rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase text-orange-500/70 tracking-widest mb-2">
                    IBS — 0,1%
                  </p>
                  <p className="text-base font-black text-orange-400">
                    {cbsIbsImpact.ibs.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1">Imposto sobre B&S</p>
                </div>

                <div className="bg-red-500/[0.06] border border-red-500/20 rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase text-red-500/70 tracking-widest mb-2">
                    Teste Total — 1%
                  </p>
                  <p className="text-base font-black text-red-400">
                    {cbsIbsImpact.total.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1">CBS + IBS como destaque</p>
                </div>
              </div>

              {/* Banner compacto com contagem regressiva */}
              <CbsIbsAlertBanner
                estimatedMonthlyRevenue={0}
                dismissible={false}
                compact
              />
            </div>
          )}

          {annualizedRevenue > 0 && (
            <TaxReformScenarioStack
              annualRevenue={annualizedRevenue}
              currentTax={annualizedTax}
            />
          )}

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

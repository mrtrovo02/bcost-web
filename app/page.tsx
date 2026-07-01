'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, isDemoSession } from '@/services/api';
import { getDemoFiscalData } from '@/services/demo-data';
import { useCompany } from '@/app/context/CompanyContext';
import TaxComparisonCard from '../components/TaxComparisonCard';
import TaxEvolutionChart from '../components/TaxEvolutionChart';
import Sidebar from '../components/Sidebar';
import ExecutiveCommandCenter from '../components/ExecutiveCommandCenter';
import DecisionIntelligencePanel from '../components/DecisionIntelligencePanel';
import ScenarioComparisonCard from '../components/ScenarioComparisonCard';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCompactCurrency, formatCurrency, formatPercentage, getAnexoLabel } from '@/lib/formatters';
import { LoadingShell } from '@/components/ui/LoadingShell';
import { StatePanel } from '@/components/ui/StatePanel';

interface DashboardChartPoint {
  label?: string;
  month?: string;
  year?: number;
  revenue?: number;
  taxPayable?: number;
  effectiveRate?: number;
  taxWithoutBenefit?: number;
}

interface DashboardOverview {
  summary?: { financialScore?: number };
  revenueChart?: DashboardChartPoint[];
}

interface DashboardMetrics {
  taxProvision?: number;
  fiscalIntelligence?: { isEligibleAnexoIII?: boolean };
}

interface MonthlyPerformance {
  month: string;
  year: number;
  faturamento: number;
  imposto: number;
  taxPercentage: number;
  otimizado: number;
  semBeneficio: number;
}

interface FiscalData {
  company: string;
  comparison: {
    netSavings: number;
    semBcost: number;
    comBcost: number;
  };
  metadata: {
    anexoUtilizado: string;
  };
  evolucao: MonthlyPerformance[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { selectedCompany } = useCompany();

  const [data, setData] = useState<FiscalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const lastFetchedCompanyId = useRef<string | null>(null);

  const fetchTaxData = useCallback(
    async (isInitial = false) => {
      if (!selectedCompany?.id) return;

      if (isInitial) setLoading(true);
      else setIsRefetching(true);

      try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const shouldUseDemoFallback =
          isDemoSession() || !selectedCompany?.id || selectedCompany.id.toLowerCase().startsWith('demo-');

        if (shouldUseDemoFallback) {
          const demoData = getDemoFiscalData(selectedCompany?.name ?? 'Empresa Demo');
          setData({
            company: selectedCompany?.name ?? 'Empresa Demo',
            comparison: {
              comBcost: demoData.comparison.comBcost,
              semBcost: demoData.comparison.semBcost,
              netSavings: demoData.comparison.netSavings,
            },
            metadata: {
              anexoUtilizado: demoData.metadata.anexoUtilizado,
            },
            evolucao: demoData.evolucao,
          });
          setLoading(false);
          setIsRefetching(false);
          lastFetchedCompanyId.current = selectedCompany?.id ?? 'demo';
          return;
        }

        const [overviewRes, metricsRes] = await Promise.all([
          api.get('/dashboard/overview', {
            headers: { 'x-company-id': selectedCompany.id },
          }),
          api.get(`/revenue/metrics/${selectedCompany.id}`, {
            params: { month, year },
          }),
        ]);

        const overview = overviewRes.data as DashboardOverview;
        const metrics = metricsRes.data as DashboardMetrics;

        const baseTax = metrics.taxProvision || 0;
        const savings = overview.summary?.financialScore || 0;

        const formattedData: FiscalData = {
          company: selectedCompany.name,
          comparison: {
            comBcost: baseTax,
            semBcost: baseTax + savings,
            netSavings: savings,
          },
          metadata: {
            anexoUtilizado: metrics.fiscalIntelligence?.isEligibleAnexoIII ? 'III' : 'V',
          },
          evolucao: (overview.revenueChart ?? []).map((item) => ({
            month: item.label || item.month || 'Mês',
            year: item.year || year,
            faturamento: item.revenue || 0,
            imposto: item.taxPayable || 0,
            taxPercentage: item.effectiveRate || 0,
            otimizado: item.taxPayable || 0,
            semBeneficio: item.taxWithoutBenefit ?? (item.taxPayable ?? 0) * 1.15,
          })),
        };

        setData(formattedData);
        lastFetchedCompanyId.current = selectedCompany.id;
      } catch (error: unknown) {
        console.error('Erro bCost Dashboard:', error);

        const status =
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof (error as Record<string, unknown>).status === 'number'
            ? (error as { status?: number }).status
            : undefined;

        if (isDemoSession() && selectedCompany) {
          const demoData = getDemoFiscalData(selectedCompany.name);
          setData({
            company: selectedCompany.name,
            comparison: {
              comBcost: demoData.comparison.comBcost,
              semBcost: demoData.comparison.semBcost,
              netSavings: demoData.comparison.netSavings,
            },
            metadata: {
              anexoUtilizado: demoData.metadata.anexoUtilizado,
            },
            evolucao: demoData.evolucao,
          });
        } else if (status === 401) {
          setData(null);
          router.push('/login');
        }
      } finally {
        setLoading(false);
        setIsRefetching(false);
      }
    },
    [selectedCompany, router],
  );

  useEffect(() => {
    if (selectedCompany?.id && selectedCompany.id !== lastFetchedCompanyId.current) {
      fetchTaxData(true);
    }
  }, [selectedCompany?.id, fetchTaxData]);

  const exportToPDF = async () => {
    const element = document.getElementById('dashboard-content');
    if (!element || !data) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F8FAFC',
        onclone: (clonedDoc) => {
          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            const style = window.getComputedStyle(el);
            if (style.color.includes('lab') || style.color.includes('oklch'))
              el.style.color = '#1e293b';
            if (style.backgroundColor.includes('lab') || style.backgroundColor.includes('oklch')) {
              el.style.backgroundColor = el.classList.contains('bg-blue-600')
                ? '#2563eb'
                : 'transparent';
            }
          }
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`bCost_Relatorio_${data.company.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Erro na exportação:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 p-4 md:p-10 text-slate-900 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-slate-200 pb-12">
            <div className="space-y-3">
              <h1 className="text-5xl font-black tracking-tighter text-slate-900">
                bCost <span className="text-blue-600">Intelligence</span>
              </h1>
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
                  {selectedCompany?.name || 'Selecione uma Unidade'} • Ciclo{' '}
                  {new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>

          {!selectedCompany ? (
            <StatePanel
              title="Selecione uma empresa"
              description="Acesse a navegação lateral para escolher uma unidade e abrir a visão executiva completa do bCost."
              actionLabel="Ir para o painel"
              actionHref="/dashboard"
            />
          ) : loading ? (
            <LoadingShell />
          ) : data ? (
            <div
              id="dashboard-content"
              className={`space-y-12 transition-all duration-500 ${isRefetching ? 'opacity-40 grayscale' : 'opacity-100'}`}
            >
              <section className="glass-panel p-8 md:p-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.35em] text-blue-600">
                      Snapshot executivo
                    </p>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">
                      Visão imediata de economia e risco fiscal
                    </h2>
                    <p className="max-w-2xl text-sm leading-7 text-slate-600">
                      O painel consolida eficiência tributária, impacto do planejamento e a decisão mais
                      relevante para o time financeiro em tempo real.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Status</p>
                    <p className="mt-2 text-xl font-black">Operação otimizada</p>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[1.5rem] bg-slate-900 p-6 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                      Economia líquida
                    </p>
                    <p className="mt-3 text-3xl font-black">{formatCurrency(data.comparison.netSavings)}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                      Imposto estimado com bCost
                    </p>
                    <p className="mt-3 text-3xl font-black text-slate-900">
                      {formatCompactCurrency(data.comparison.comBcost)}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                      Estratégia aplicada
                    </p>
                    <p className="mt-3 text-xl font-black text-slate-900">
                      {getAnexoLabel(data.metadata.anexoUtilizado)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {formatPercentage(data.evolucao[0]?.taxPercentage ?? 0)} média no ciclo
                    </p>
                  </div>
                </div>
              </section>

              <ExecutiveCommandCenter
                companyName={data.company}
                netSavings={data.comparison.netSavings}
                taxSavingsRate={data.evolucao[0]?.taxPercentage ?? 0}
                anexo={data.metadata.anexoUtilizado}
                activeAlerts={2}
              />
              <DecisionIntelligencePanel
                riskLevel="médio"
                opportunityValue={Math.max(data.comparison.netSavings * 0.6, 50000)}
                nextAction="Revisar documentos pendentes"
              />
              <ScenarioComparisonCard
                baseScenario={data.comparison.semBcost}
                optimizedScenario={data.comparison.comBcost}
              />
              <TaxComparisonCard data={data} />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8">
                  <TaxEvolutionChart data={data.evolucao} />
                </div>
                <div className="lg:col-span-4 bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl flex flex-col justify-between border border-white/5">
                  <div>
                    <div className="inline-flex p-4 bg-blue-600 rounded-2xl mb-8">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-black mb-4 tracking-tighter">
                      Análise Estratégica
                    </h3>
                    <p className="text-slate-400 font-medium leading-relaxed mb-8">
                      Otimização via <span className="text-blue-400 font-bold">Fator R</span>{' '}
                      detectada no{' '}
                      <span className="text-white font-black">
                        Anexo {data.metadata.anexoUtilizado}
                      </span>
                      .
                    </p>
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                      <p className="text-[10px] text-blue-400 uppercase font-black mb-1 tracking-widest">
                        Economia Realizada
                      </p>
                      <p className="text-3xl font-black text-emerald-400">
                        R${' '}
                        {data.comparison.netSavings.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={exportToPDF}
                    disabled={isExporting}
                    className="w-full py-5 bg-blue-600 text-white font-black rounded-[2rem] hover:bg-blue-500 mt-10 uppercase tracking-widest text-[10px] disabled:bg-slate-700 transition-colors"
                  >
                    {isExporting ? 'Processando...' : 'Exportar PDF'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

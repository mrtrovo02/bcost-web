'use client';

import { useRef, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
  ScriptableContext,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, ArrowDownCircle } from 'lucide-react';
import { MonthlyPerformance } from '@/lib/types/fiscal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface TaxEvolutionChartProps {
  data?: MonthlyPerformance[];
  loading?: boolean;
}

const MONTH_NAMES = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
];

export default function TaxEvolutionChart({
  data: apiData = [],
  loading = false,
}: TaxEvolutionChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  useEffect(() => {
    const chartInstance = chartRef.current;

    return () => {
      if (chartInstance) chartInstance.destroy();
    };
  }, []);

  const { chartConfig, totalSavings } = useMemo(() => {
    const safeData = Array.isArray(apiData) ? apiData : [];

    if (safeData.length === 0) {
      return {
        chartConfig: { labels: [], datasets: [] } as ChartData<'line'>,
        totalSavings: 0,
      };
    }

    // Ordenação cronológica estrita por ano e mês
    const sorted = [...safeData].sort((a, b) => {
      const monthA =
        typeof a.month === 'string' ? MONTH_NAMES.indexOf(a.month.toUpperCase()) : a.month;
      const monthB =
        typeof b.month === 'string' ? MONTH_NAMES.indexOf(b.month.toUpperCase()) : b.month;
      return (
        (a.year ?? new Date().getFullYear()) * 12 +
        monthA -
        ((b.year ?? new Date().getFullYear()) * 12 + monthB)
      );
    });

    const labels = sorted.map((h) => {
      if (typeof h.month === 'string') return h.month.toUpperCase();
      return MONTH_NAMES[h.month - 1] || `M${h.month}`;
    });

    const optimized = sorted.map((h) => Number(h.imposto || 0));
    const standard = sorted.map((h) => Number(h.faturamento || 0) * 0.155); // Anexo V - faixa inicial

    const savings = standard.reduce((acc, curr, i) => acc + (curr - (optimized[i] || 0)), 0);

    const config: ChartData<'line'> = {
      labels,
      datasets: [
        {
          label: 'EFICIÊNCIA bCost (ANEXO III)',
          data: optimized,
          borderColor: '#3b82f6',
          borderWidth: 3.5,
          tension: 0.38,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#090d16',
          pointBorderWidth: 2,
          backgroundColor: (context: ScriptableContext<'line'>) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(59, 130, 246, 0.01)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.12)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
            return gradient;
          },
        },
        {
          label: 'CENÁRIO ANEXO V - FAIXA INICIAL (15.5%)',
          data: standard,
          borderColor: '#334155',
          borderDash: [6, 6],
          borderWidth: 2,
          tension: 0.38,
          fill: false,
          pointRadius: 0,
        },
      ],
    };

    return { chartConfig: config, totalSavings: savings };
  }, [apiData]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#94a3b8',
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 10,
            weight: 'bold',
            family: 'Inter',
          },
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#020408',
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 11 },
        padding: 12,
        displayColors: true,
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y ?? 0;
            return ` ${ctx.dataset.label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          },
        },
      },
    },
    scales: {
      y: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        border: { display: false },
        ticks: {
          color: '#64748b',
          font: { size: 9, weight: 'bold' },
          callback: (val) => 'R$ ' + Number(val).toLocaleString('pt-BR', { notation: 'compact' }),
        },
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#64748b', font: { size: 9, weight: 'bold' } },
      },
    },
  };

  return (
    <div className="w-full h-full flex flex-col min-w-0">
      {/* Indicador de Economia Embutido de Forma Fluida */}
      {totalSavings > 0 && !loading && (
        <div className="mb-6 flex items-center gap-3 bg-blue-500/[0.03] border border-blue-500/10 px-4 py-2.5 rounded-xl self-start">
          <ArrowDownCircle size={15} className="text-blue-400" />
          <p className="text-xs text-slate-300 font-medium">
            Economia Realizada no Ciclo:{' '}
            <span className="text-emerald-400 font-black ml-1">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                totalSavings,
              )}
            </span>
          </p>
        </div>
      )}

      {/* Área Real do Gráfico */}
      <div className="relative flex-1 w-full min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3 bg-white/[0.01] rounded-2xl border border-white/5">
            <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-[#64748b] text-[9px] font-black uppercase tracking-widest">
              Sincronizando Engine bCost...
            </p>
          </div>
        ) : Array.isArray(apiData) &&
          apiData.length > 0 &&
          Array.isArray(chartConfig.labels) &&
          chartConfig.labels.length > 0 &&
          chartConfig.datasets.length > 0 ? (
          <div className="w-full h-full">
            <Line ref={chartRef} options={options} data={chartConfig} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full border border-dashed border-white/5 rounded-2xl bg-white/[0.01] p-6">
            <TrendingUp size={36} className="text-slate-800 mb-3" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center max-w-[240px]">
              Sem histórico de XMLs processados para esta unidade
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

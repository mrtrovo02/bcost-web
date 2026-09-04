'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  GitBranch,
  Landmark,
  Loader2,
  RefreshCw,
  Scale,
  Target,
  WalletCards,
} from 'lucide-react';
import { useCompany } from '@/app/context/CompanyContext';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import {
  getDemoManagementCockpit,
  getManagementCockpit,
  type ManagementCockpitBudget,
  type ManagementCockpitResponse,
} from '@/lib/api/management-cockpit';
import { isDemoSession } from '@/services/api';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function OperationsPage() {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<ManagementCockpitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isDemoSession()) {
        setData(getDemoManagementCockpit(selectedCompany?.name));
        return;
      }

      setData(await getManagementCockpit());
    } catch (err) {
      if (isDemoSession()) {
        setData(getDemoManagementCockpit(selectedCompany?.name));
        setError(err instanceof Error ? err.message : 'API indisponível; exibindo leitura local.');
        return;
      }

      setData(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar a controladoria para a empresa real.',
      );
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const maxCash = useMemo(() => {
    const values = data?.cashFlow.monthly.flatMap((item) => [item.cashIn, item.cashOut]) ?? [1];
    return Math.max(...values, 1);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p className="text-xs font-black uppercase tracking-widest">Consolidando controladoria</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-2xl rounded-3xl border border-rose-400/25 bg-rose-500/10 p-8 text-rose-50 shadow-2xl shadow-black/30">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-300/30 bg-rose-400/10">
            <AlertTriangle size={24} />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-rose-200">
            Controladoria indisponível
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white">
            Não foi possível carregar dados reais desta empresa
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-rose-100/80">
            {error ??
              'O painel não exibirá dados demonstrativos para uma empresa real. Verifique a API, autenticação e vínculo da empresa antes de liberar este módulo.'}
          </p>
          <button
            onClick={loadData}
            disabled={loading}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-rose-500 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-10">
      <header className="flex flex-col gap-4 border-b border-white/5 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-200">
            <Building2 size={12} />
            {data.company.name}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Controladoria <span className="text-blue-400">Executiva</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            DRE, fluxo de caixa, balanço, conciliação, centros de custo e orçamento em uma visão
            operacional.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          Atualizar
        </button>
      </header>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-200">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={CircleDollarSign}
          label="Receita YTD"
          value={formatCurrency(data.kpis.revenueYtd)}
        />
        <Kpi
          icon={WalletCards}
          label="Caixa líquido YTD"
          value={formatCurrency(data.kpis.netCashYtd)}
          tone={data.kpis.netCashYtd >= 0 ? 'emerald' : 'rose'}
        />
        <Kpi
          icon={Target}
          label="Margem gerencial"
          value={formatPercentage(data.kpis.grossMargin)}
          tone={data.kpis.grossMargin >= 20 ? 'emerald' : 'amber'}
        />
        <Kpi
          icon={GitBranch}
          label="Conciliação"
          value={formatPercentage(data.kpis.reconciliationRate)}
          tone={data.kpis.reconciliationRate >= 90 ? 'emerald' : 'amber'}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="DRE Gerencial" icon={BarChart3}>
          <DreRows data={data} />
        </Panel>

        <Panel title="Balanço Executivo" icon={Scale}>
          <div className="grid gap-3">
            <BalanceRow label="Ativos" value={data.balance.assets} />
            <BalanceRow label="Passivos" value={data.balance.liabilities} />
            <BalanceRow label="Patrimônio / Resultado" value={data.balance.equity} strong />
          </div>
          <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Obrigações fiscais em aberto
            </p>
            <p className="mt-2 text-2xl font-black text-white">{data.kpis.openFiscalObligations}</p>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="Fluxo de Caixa" icon={Landmark}>
          <div className="flex h-64 items-end gap-2">
            {data.cashFlow.monthly.map((item) => (
              <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-48 w-full items-end gap-1">
                  <div
                    className="w-1/2 rounded-t-lg bg-emerald-400/70"
                    style={{ height: `${Math.max(4, (item.cashIn / maxCash) * 100)}%` }}
                    title={`Entradas ${formatCurrency(item.cashIn)}`}
                  />
                  <div
                    className="w-1/2 rounded-t-lg bg-rose-400/70"
                    style={{ height: `${Math.max(4, (item.cashOut / maxCash) * 100)}%` }}
                    title={`Saídas ${formatCurrency(item.cashOut)}`}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  {MONTHS[item.month - 1]}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Orçamento vs Realizado" icon={Target}>
          <div className="space-y-4">
            <BudgetRow item={data.budgetVsActual.revenue} positiveGood />
            <BudgetRow item={data.budgetVsActual.expenses} />
            <BudgetRow item={data.budgetVsActual.netCash} positiveGood />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Centros de Custos" icon={Building2}>
          {data.costCenters.length === 0 ? (
            <EmptyState text="Nenhum centro de custo apurado no período." />
          ) : (
            <div className="space-y-3">
              {data.costCenters.map((center) => (
                <div
                  key={center.name}
                  className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-white">{center.name}</p>
                    <span className="text-xs font-black text-slate-400">
                      {formatPercentage(center.usagePercent)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${center.usagePercent > 100 ? 'bg-rose-400' : 'bg-blue-400'}`}
                      style={{ width: `${Math.min(100, Math.max(2, center.usagePercent))}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Real {formatCurrency(center.actual)}</span>
                    <span className={center.variance > 0 ? 'text-rose-300' : 'text-emerald-300'}>
                      {formatCurrency(center.variance)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Conciliação e Automação" icon={GitBranch}>
          <div className="grid gap-3">
            <ReconciliationRow
              label="Notas fiscais"
              total={data.reconciliation.invoices.total}
              done={data.reconciliation.invoices.reconciled}
              pending={data.reconciliation.invoices.pending}
            />
            <ReconciliationRow
              label="Transações bancárias"
              total={data.reconciliation.bankTransactions.total}
              done={data.reconciliation.bankTransactions.reconciled}
              pending={data.reconciliation.bankTransactions.pending}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatusTile label="Automações ativas" value={data.automation.running} />
            <StatusTile label="Falhas" value={data.automation.failed} tone="rose" />
          </div>

          {data.compliance.length > 0 && (
            <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
              <div className="flex items-center gap-2 text-rose-200">
                <AlertTriangle size={15} />
                <p className="text-xs font-black uppercase tracking-widest">
                  {data.compliance.length} alerta(s)
                </p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-rose-100/80">
                {data.compliance[0]?.description || data.compliance[0]?.checkName}
              </p>
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/5 bg-[#090d16] p-5 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/20">
          <Icon size={18} />
        </div>
        <h2 className="text-sm font-black uppercase tracking-widest text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone = 'blue',
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'rose';
}) {
  const color = {
    blue: 'text-blue-300 bg-blue-500/10 ring-blue-400/20',
    emerald: 'text-emerald-300 bg-emerald-500/10 ring-emerald-400/20',
    amber: 'text-amber-300 bg-amber-500/10 ring-amber-400/20',
    rose: 'text-rose-300 bg-rose-500/10 ring-rose-400/20',
  }[tone];

  return (
    <div className="rounded-3xl border border-white/5 bg-[#090d16] p-5 shadow-xl shadow-black/15">
      <div
        className={`mb-5 flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${color}`}
      >
        <Icon size={18} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function DreRows({ data }: { data: ManagementCockpitResponse }) {
  const rows = [
    ['Receita bruta', data.dre.revenue, 'text-emerald-300'],
    ['Tributos destacados/provisionados', -data.dre.taxes, 'text-amber-300'],
    ['Despesas operacionais', -data.dre.operatingExpenses, 'text-rose-300'],
    ['EBITDA gerencial', data.dre.ebitda, 'text-blue-300'],
    [
      'Resultado líquido',
      data.dre.netIncome,
      data.dre.netIncome >= 0 ? 'text-emerald-300' : 'text-rose-300',
    ],
  ] as const;

  return (
    <div className="divide-y divide-white/5">
      {rows.map(([label, value, color]) => (
        <div key={label} className="flex items-center justify-between gap-4 py-3">
          <span className="text-sm font-bold text-slate-400">{label}</span>
          <span className={`text-sm font-black ${color}`}>{formatCurrency(value)}</span>
        </div>
      ))}
    </div>
  );
}

function BalanceRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <span className="text-sm font-bold text-slate-400">{label}</span>
      <span className={`text-sm font-black ${strong ? 'text-emerald-300' : 'text-white'}`}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function BudgetRow({
  item,
  positiveGood = false,
}: {
  item: ManagementCockpitBudget;
  positiveGood?: boolean;
}) {
  const isGood = positiveGood ? item.variance >= 0 : item.variance <= 0;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-white">{item.label}</p>
        <span
          className={`inline-flex items-center gap-1 text-xs font-black ${isGood ? 'text-emerald-300' : 'text-rose-300'}`}
        >
          {isGood ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {formatCurrency(item.variance)}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={
            isGood ? 'h-full rounded-full bg-emerald-400' : 'h-full rounded-full bg-rose-400'
          }
          style={{ width: `${Math.min(100, Math.max(2, item.achievement))}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Previsto {formatCurrency(item.planned)}</span>
        <span>Real {formatCurrency(item.actual)}</span>
      </div>
    </div>
  );
}

function ReconciliationRow({
  label,
  total,
  done,
  pending,
}: {
  label: string;
  total: number;
  done: number;
  pending: number;
}) {
  const pct = total > 0 ? (done / total) * 100 : 100;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-white">{label}</p>
        <span className="text-xs font-black text-blue-300">{formatPercentage(pct)}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-400"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 size={13} className="text-emerald-300" />
          {done} conciliados
        </span>
        <span>{pending} pendentes</span>
      </div>
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone = 'blue',
}: {
  label: string;
  value: number;
  tone?: 'blue' | 'rose';
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p
        className={`mt-2 text-2xl font-black ${tone === 'rose' ? 'text-rose-300' : 'text-blue-300'}`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

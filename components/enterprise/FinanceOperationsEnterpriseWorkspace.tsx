'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CircleDollarSign,
  Database,
  Gauge,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';

import {
  FinanceItem,
  FinanceOperationsSummaryResponse,
  FinanceOperationStatus,
  financeOperationsEnterpriseApi,
} from '@/lib/api/finance-operations-enterprise';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';

type UiMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
};

type TabKey = 'overview' | 'receivables' | 'payables' | 'cashflow' | 'timeline';

function brl(value: number | undefined | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function scoreTone(score: number) {
  if (score >= 85) return 'from-emerald-600 to-teal-500';
  if (score >= 60) return 'from-amber-500 to-orange-500';
  return 'from-red-600 to-rose-500';
}

function statusTone(status?: string) {
  const normalized = String(status || '').toUpperCase();

  if (
    normalized === 'HEALTHY' ||
    normalized === 'PAID' ||
    normalized === 'RECEIVED' ||
    normalized === 'LOW'
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (
    normalized === 'ATTENTION' ||
    normalized === 'DUE_SOON' ||
    normalized === 'PENDING' ||
    normalized === 'OPEN' ||
    normalized === 'MEDIUM' ||
    normalized === 'HIGH'
  ) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'CRITICAL' || normalized === 'OVERDUE') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function Button({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-slate-950 text-white'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400'
      }`}
    >
      {children}
    </button>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
  helper,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'purple';
  helper?: string;
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-950',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    purple: 'border-purple-100 bg-purple-50 text-purple-700',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm opacity-70">{label}</div>
          <div className="mt-2 truncate text-2xl font-black">{value}</div>
          {helper && <div className="mt-1 text-xs opacity-70">{helper}</div>}
        </div>
        <div className="rounded-xl bg-white/70 p-2">{icon}</div>
      </div>
    </div>
  );
}

function ScoreRing({ score, status }: { score: number; status: string }) {
  const safeScore = Math.max(0, Math.min(100, Number(score || 0)));
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (safeScore / 100) * circumference;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg className="h-40 w-40 -rotate-90" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-white/20"
        />
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-white"
        />
      </svg>

      <div className="absolute text-center text-white">
        <div className="text-4xl font-black">{safeScore}</div>
        <div className="mt-1 text-xs font-bold uppercase tracking-wide opacity-80">{status}</div>
      </div>
    </div>
  );
}

function FinanceItemCard({ item }: { item: FinanceItem }) {
  const isIn = item.type === 'RECEIVABLE' || item.type === 'CASH_IN';

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div
          className={`rounded-xl border p-2 ${
            isIn
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          {isIn ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(item.status)}`}
            >
              {item.status}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(item.riskLevel)}`}
            >
              {item.riskLevel}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
              {item.source}
            </span>
          </div>

          <h3 className="mt-3 text-sm font-bold text-slate-950">{item.title}</h3>

          <p className="mt-1 text-xs text-slate-500">
            {item.description || item.customerName || 'Sem descrição'}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniMetric label="Valor" value={brl(item.amount)} />
            <MiniMetric label="Vencimento" value={formatDate(item.dueDate)} />
            <MiniMetric
              label="Atraso"
              value={item.daysOverdue > 0 ? `${item.daysOverdue}d` : '—'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 truncate text-xs font-black text-slate-900">{value}</div>
    </div>
  );
}

type AgingBucket = {
  count: number;
  amount: number;
};

type AgingRow = {
  label: string;
  bucket: AgingBucket;
};

function AgingBlock({
  title,
  aging,
}: {
  title: string;
  aging: FinanceOperationsSummaryResponse['aging']['receivables'];
}) {
  const rows: AgingRow[] = [
    { label: 'Em dia', bucket: aging.current },
    { label: 'Vence em 7 dias', bucket: aging.dueSoon7 },
    { label: 'Vencido 1-7', bucket: aging.overdue1To7 },
    { label: 'Vencido 8-30', bucket: aging.overdue8To30 },
    { label: 'Vencido 31-60', bucket: aging.overdue31To60 },
    { label: 'Vencido 61+', bucket: aging.overdue61Plus },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">Aging financeiro por faixa de vencimento.</p>

      <div className="mt-5 space-y-3">
        {rows.map(({ label, bucket }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-700">{label}</span>
              <span className="font-black text-slate-950">{brl(bucket.amount)}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{bucket.count} item(ns)</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function FinanceOperationsEnterpriseWorkspace() {
  const [companyId, setCompanyId] = useState('');
  const [payload, setPayload] = useState<FinanceOperationsSummaryResponse | null>(null);
  const [tab, setTab] = useState<TabKey>('overview');
  const [statusFilter, setStatusFilter] = useState<FinanceOperationStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setMessage(null);

      const resolvedCompanyId = companyId || (await resolveEnterpriseCompanyIdWithFallback());
      setCompanyId(resolvedCompanyId);

      const response = await financeOperationsEnterpriseApi.summary(resolvedCompanyId, {
        limit: 50,
        includeRaw: false,
      });

      setPayload(response);
    } catch (error) {
      setMessage({
        type: 'error',
        title: 'Falha ao carregar Finance Operations Enterprise',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = payload?.executiveSummary;
  const score = summary?.financeScore ?? 0;
  const status = summary?.financeStatus ?? 'HEALTHY';

  const list = useMemo(() => {
    const base =
      tab === 'receivables'
        ? payload?.lists.receivables || []
        : tab === 'payables'
          ? payload?.lists.payables || []
          : tab === 'cashflow'
            ? payload?.lists.cashItems || []
            : [
                ...(payload?.lists.receivables || []),
                ...(payload?.lists.payables || []),
                ...(payload?.lists.cashItems || []),
              ];

    return base.filter((item) => {
      const matchStatus = statusFilter === 'ALL' ? true : item.status === statusFilter;

      const haystack = `${item.title} ${item.description || ''} ${item.source} ${
        item.customerName || ''
      }`.toLowerCase();

      const matchSearch = search.trim() ? haystack.includes(search.toLowerCase()) : true;

      return matchStatus && matchSearch;
    });
  }, [payload, tab, statusFilter, search]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div
          className={`overflow-hidden rounded-3xl bg-gradient-to-br ${scoreTone(
            score,
          )} p-1 shadow-sm`}
        >
          <div className="rounded-[1.35rem] bg-slate-950/20 p-6 backdrop-blur">
            <div className="grid gap-6 lg:grid-cols-[1fr_180px] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  <WalletCards className="h-4 w-4" />
                  Finance Operations Enterprise
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                  Finance Operations
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-white/80">
                  Cockpit financeiro enterprise com contas a receber, contas a pagar, caixa, aging,
                  risco financeiro e timeline operacional, usando dados reais de notas, obrigações,
                  banco e eventos.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/80">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                    <Database className="h-4 w-4" />
                    {payload?.supportingData?.sourceCounts?.invoices ?? 0} notas
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                    <Banknote className="h-4 w-4" />
                    {payload?.supportingData?.sourceCounts?.bankTransactions ?? 0} transações
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-mono text-xs">
                    {companyId || 'carregando...'}
                  </span>
                </div>
              </div>

              <div className="flex justify-center lg:justify-end">
                <ScoreRing score={score} status={status} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button onClick={load} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Atualizar
              </Button>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-2xl border p-4 text-sm ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : message.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : message.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-blue-200 bg-blue-50 text-blue-800'
            }`}
          >
            <div className="font-semibold">{message.title}</div>
            {message.description && <div className="mt-1 opacity-90">{message.description}</div>}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-6">
          <KpiCard
            label="A Receber Aberto"
            value={brl(summary?.receivables.openAmount)}
            tone="emerald"
            icon={<TrendingUp className="h-5 w-5" />}
            helper={`${summary?.receivables.openCount ?? 0} item(ns)`}
          />
          <KpiCard
            label="A Pagar Aberto"
            value={brl(summary?.payables.openAmount)}
            tone="amber"
            icon={<TrendingDown className="h-5 w-5" />}
            helper={`${summary?.payables.openCount ?? 0} item(ns)`}
          />
          <KpiCard
            label="Vencido"
            value={brl(summary?.totalOverdueAmount)}
            tone={(summary?.totalOverdueAmount ?? 0) > 0 ? 'red' : 'emerald'}
            icon={<ShieldAlert className="h-5 w-5" />}
            helper={`${summary?.totalOverdueCount ?? 0} item(ns)`}
          />
          <KpiCard
            label="Saldo Real"
            value={brl(summary?.cashflow.netCash)}
            tone={(summary?.cashflow.netCash ?? 0) >= 0 ? 'blue' : 'red'}
            icon={<CircleDollarSign className="h-5 w-5" />}
          />
          <KpiCard
            label="Saldo Projetado"
            value={brl(summary?.cashflow.projectedNet)}
            tone={(summary?.cashflow.projectedNet ?? 0) >= 0 ? 'purple' : 'red'}
            icon={<Gauge className="h-5 w-5" />}
          />
          <KpiCard
            label="Risco Caixa"
            value={summary?.cashflow.riskStatus ?? '—'}
            tone={
              summary?.cashflow.riskStatus === 'CRITICAL'
                ? 'red'
                : summary?.cashflow.riskStatus === 'ATTENTION'
                  ? 'amber'
                  : 'emerald'
            }
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button active={tab === 'overview'} onClick={() => setTab('overview')}>
                Overview
              </Button>
              <Button active={tab === 'receivables'} onClick={() => setTab('receivables')}>
                Receivables
              </Button>
              <Button active={tab === 'payables'} onClick={() => setTab('payables')}>
                Payables
              </Button>
              <Button active={tab === 'cashflow'} onClick={() => setTab('cashflow')}>
                Cashflow
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar título, origem, cliente..."
                  className="rounded-2xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as FinanceOperationStatus | 'ALL')
                }
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="ALL">Todos</option>
                <option value="OPEN">OPEN</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="DUE_SOON">DUE_SOON</option>
                <option value="PAID">PAID</option>
                <option value="RECEIVED">RECEIVED</option>
              </select>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-bold text-slate-950">Timeline Financeira</h2>
              <p className="mt-1 text-sm text-slate-500">
                Recebíveis, pagáveis e eventos de caixa consolidados.
              </p>
            </div>

            <div className="grid gap-4 p-5">
              {loading ? (
                <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando Finance Operations...
                </div>
              ) : list.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Nenhum item encontrado para os filtros atuais.
                </div>
              ) : (
                list.map((item) => (
                  <FinanceItemCard key={`${item.source}-${item.id}`} item={item} />
                ))
              )}
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <AgingBlock
              title="Aging Receivables"
              aging={
                payload?.aging.receivables || {
                  current: { count: 0, amount: 0 },
                  dueSoon7: { count: 0, amount: 0 },
                  overdue1To7: { count: 0, amount: 0 },
                  overdue8To30: { count: 0, amount: 0 },
                  overdue31To60: { count: 0, amount: 0 },
                  overdue61Plus: { count: 0, amount: 0 },
                }
              }
            />

            <AgingBlock
              title="Aging Payables"
              aging={
                payload?.aging.payables || {
                  current: { count: 0, amount: 0 },
                  dueSoon7: { count: 0, amount: 0 },
                  overdue1To7: { count: 0, amount: 0 },
                  overdue8To30: { count: 0, amount: 0 },
                  overdue31To60: { count: 0, amount: 0 },
                  overdue61Plus: { count: 0, amount: 0 },
                }
              }
            />

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Source Coverage</h2>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {Object.entries(payload?.supportingData.sourceCounts || {}).map(([key, value]) => (
                  <MiniMetric key={key} label={key} value={value} />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

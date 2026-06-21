'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from 'lucide-react';

import {
  AuditLogRecord,
  CreateFiscalPayload,
  CreateTaxPayload,
  FiscalObligationRecord,
  FiscalObligationStatus,
  FiscalObligationType,
  FiscalListResponse,
  obligationsApi,
  TaxListResponse,
  TaxObligationRecord,
  TaxObligationStatus,
} from '@/lib/api/obligations';
import { api } from '@/services/api';

type WorkspaceMode = 'tax' | 'fiscal';

type AuthMeResponse = {
  id: string;
  email: string;
  companyId?: string;
  role?: string;
  [key: string]: unknown;
};

type UiMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
};

type TaxFormState = {
  name: string;
  dueDate: string;
  amount: string;
  status: TaxObligationStatus;
  fileUrl: string;
};

type FiscalFormState = {
  type: FiscalObligationType;
  referenceMonth: string;
  referenceYear: string;
  dueDate: string;
  status: FiscalObligationStatus;
  fileUrl: string;
  fileHash: string;
  receiptCode: string;
};

const DEFAULT_TAX_FORM: TaxFormState = {
  name: '',
  dueDate: '',
  amount: '',
  status: 'PENDING',
  fileUrl: '',
};

const DEFAULT_FISCAL_FORM: FiscalFormState = {
  type: 'DCTF',
  referenceMonth: String(new Date().getMonth() + 1),
  referenceYear: String(new Date().getFullYear()),
  dueDate: '',
  status: 'PENDING',
  fileUrl: '',
  fileHash: '',
  receiptCode: '',
};

const FISCAL_TYPES: FiscalObligationType[] = [
  'DAS',
  'GPS',
  'DARF',
  'SPED_FISCAL',
  'SPED_CONTRIBUICOES',
  'ECD',
  'ECF',
  'DCTF',
  'RAIS',
  'CAGED',
  'DIRF',
  'DEFIS',
  'PGDAS',
];

function isBrowser() {
  return typeof window !== 'undefined';
}

function readStoredCompanyId(): string | null {
  if (!isBrowser()) return null;

  const keys = ['bcost_active_company', 'bcost_company_id', 'companyId', 'activeCompanyId'];

  for (const key of keys) {
    const value = localStorage.getItem(key);

    if (value && value !== 'null' && value !== 'undefined' && value !== 'ID_DA_EMPRESA') {
      return value;
    }
  }

  try {
    const rawUser =
      localStorage.getItem('bcost_user') ||
      localStorage.getItem('user') ||
      localStorage.getItem('auth_user');

    if (rawUser) {
      const parsed = JSON.parse(rawUser) as Record<string, unknown>;
      const companyId = parsed.companyId || parsed.activeCompanyId || parsed.company_id;

      if (typeof companyId === 'string' && companyId) return companyId;
    }
  } catch {
    return null;
  }

  return null;
}

async function resolveCompanyId(): Promise<string> {
  const stored = readStoredCompanyId();

  if (stored) return stored;

  const response = await api.get<AuthMeResponse>('/auth/me');
  const companyId = response.data.companyId;

  if (!companyId) throw new Error('Empresa ativa não encontrada.');

  if (isBrowser()) {
    localStorage.setItem('bcost_active_company', companyId);
  }

  return companyId;
}

function fromDateInput(value: string, endOfDay = false) {
  if (!value) return '';
  return `${value}T${endOfDay ? '23:59:59' : '00:00:00'}.000Z`;
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

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

function formatJson(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (['PAID', 'ACCEPTED'].includes(value)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (['PENDING', 'GENERATED', 'SUBMITTED', 'PARTIAL'].includes(value)) {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (['OVERDUE', 'REJECTED'].includes(value)) {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (['CANCELLED'].includes(value)) {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }

  return 'border-slate-200 bg-white text-slate-600';
}

function moduleName(mode: WorkspaceMode) {
  return mode === 'tax' ? 'tax-obligations' : 'fiscal-obligations';
}

function Button({
  children,
  onClick,
  disabled,
  variant = 'default',
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'secondary' | 'danger' | 'success' | 'warning';
  type?: 'button' | 'submit';
}) {
  const classes = {
    default: 'bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300',
    secondary:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-300',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${classes[variant]}`}
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
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: 'slate' | 'emerald' | 'amber' | 'red' | 'blue';
}) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-950',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm opacity-70">{label}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
        </div>
        <div className="rounded-xl bg-white/70 p-2">{icon}</div>
      </div>
    </div>
  );
}

export default function ObligationsEnterpriseWorkspace({ mode }: { mode: WorkspaceMode }) {
  const [companyId, setCompanyId] = useState('');
  const [taxPayload, setTaxPayload] = useState<TaxListResponse | null>(null);
  const [fiscalPayload, setFiscalPayload] = useState<FiscalListResponse | null>(null);
  const [selectedTax, setSelectedTax] = useState<TaxObligationRecord | null>(null);
  const [selectedFiscal, setSelectedFiscal] = useState<FiscalObligationRecord | null>(null);
  const [taxForm, setTaxForm] = useState<TaxFormState>(DEFAULT_TAX_FORM);
  const [fiscalForm, setFiscalForm] = useState<FiscalFormState>(DEFAULT_FISCAL_FORM);
  const [audits, setAudits] = useState<AuditLogRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const taxItems = taxPayload?.items || [];
  const fiscalItems = fiscalPayload?.items || [];
  const selected = mode === 'tax' ? selectedTax : selectedFiscal;
  const selectedStatus = String(selected?.status ?? 'UNKNOWN');
  const selectedOperationalStatus = String(selected?.operationalStatus ?? '—');
  const selectedDaysToDue = selected?.daysToDue ?? '—';
  const selectedCreatedAt = selected?.createdAt;
  const auditModule = moduleName(mode);

  const loadAudits = useCallback(
    async (companyIdOverride?: string, entityId?: string) => {
      const effectiveCompanyId = companyIdOverride || companyId;

      if (!effectiveCompanyId) {
        setAudits([]);
        return;
      }

      try {
        const response = await obligationsApi.audit(effectiveCompanyId, auditModule, {
          limit: 30,
        });

        const items = response.items || [];
        const filtered = entityId ? items.filter((item) => item.entityId === entityId) : items;

        setAudits(filtered.length > 0 ? filtered : items.slice(0, 10));
      } catch {
        setAudits([]);
      }
    },
    [auditModule, companyId],
  );

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) setLoading(true);
        setMessage(null);

        const resolvedCompanyId = companyId || (await resolveCompanyId());
        setCompanyId(resolvedCompanyId);

        if (mode === 'tax') {
          const response = await obligationsApi.listTax(resolvedCompanyId, {
            limit: 100,
            status: statusFilter,
            search,
          });

          setTaxPayload(response);

          const nextSelected =
            response.items.find((item) => item.id === selectedTax?.id) || response.items[0] || null;

          setSelectedTax(nextSelected);
          await loadAudits(resolvedCompanyId, nextSelected?.id);
        } else {
          const response = await obligationsApi.listFiscal(resolvedCompanyId, {
            limit: 100,
            status: statusFilter,
            type: typeFilter,
            search,
          });

          setFiscalPayload(response);

          const nextSelected =
            response.items.find((item) => item.id === selectedFiscal?.id) ||
            response.items[0] ||
            null;

          setSelectedFiscal(nextSelected);
          await loadAudits(resolvedCompanyId, nextSelected?.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao carregar obrigações',
          description:
            error instanceof Error ? error.message : 'Não foi possível carregar o módulo.',
        });
      } finally {
        setLoading(false);
      }
    },
    [
      companyId,
      mode,
      statusFilter,
      typeFilter,
      search,
      selectedTax?.id,
      selectedFiscal?.id,
      loadAudits,
    ],
  );

  useEffect(() => {
    load();
  }, [load]);

  const taxCanSubmit = useMemo(() => {
    return Boolean(taxForm.name && taxForm.dueDate && Number(taxForm.amount) > 0);
  }, [taxForm]);

  const fiscalCanSubmit = useMemo(() => {
    return Boolean(
      fiscalForm.type &&
      fiscalForm.referenceMonth &&
      fiscalForm.referenceYear &&
      fiscalForm.dueDate,
    );
  }, [fiscalForm]);

  const submitTax = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!companyId || !taxCanSubmit) return;

      setActionLoading('create-tax');
      setMessage(null);

      try {
        const payload: CreateTaxPayload = {
          name: taxForm.name.trim(),
          dueDate: fromDateInput(taxForm.dueDate),
          amount: Number(taxForm.amount),
          status: taxForm.status,
          fileUrl: taxForm.fileUrl.trim() || undefined,
        };

        const response = await obligationsApi.createTax(companyId, payload);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Obrigação tributária criada.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Operação concluída, mas a auditoria retornou alerta.',
        });

        setTaxForm(DEFAULT_TAX_FORM);
        await load({ silent: true });

        if (response.item) {
          setSelectedTax(response.item);
          await loadAudits(companyId, response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao criar obrigação tributária',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, taxCanSubmit, taxForm, load, loadAudits],
  );

  const submitFiscal = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!companyId || !fiscalCanSubmit) return;

      setActionLoading('create-fiscal');
      setMessage(null);

      try {
        const payload: CreateFiscalPayload = {
          type: fiscalForm.type,
          referenceMonth: Number(fiscalForm.referenceMonth),
          referenceYear: Number(fiscalForm.referenceYear),
          dueDate: fromDateInput(fiscalForm.dueDate),
          status: fiscalForm.status,
          fileUrl: fiscalForm.fileUrl.trim() || undefined,
          fileHash: fiscalForm.fileHash.trim() || undefined,
          receiptCode: fiscalForm.receiptCode.trim() || undefined,
        };

        const response = await obligationsApi.createFiscal(companyId, payload);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Obrigação fiscal criada.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Operação concluída, mas a auditoria retornou alerta.',
        });

        setFiscalForm(DEFAULT_FISCAL_FORM);
        await load({ silent: true });

        if (response.item) {
          setSelectedFiscal(response.item);
          await loadAudits(companyId, response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao criar obrigação fiscal',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, fiscalCanSubmit, fiscalForm, load, loadAudits],
  );

  const runTaxAction = useCallback(
    async (action: 'pay' | 'cancel', item: TaxObligationRecord) => {
      if (!companyId) return;

      setActionLoading(`${action}:${item.id}`);
      setMessage(null);

      try {
        const response =
          action === 'pay'
            ? await obligationsApi.payTax(companyId, item.id)
            : await obligationsApi.cancelTax(companyId, item.id);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Ação concluída.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Ação concluída, mas a auditoria retornou alerta.',
        });

        await load({ silent: true });

        if (response.item) {
          setSelectedTax(response.item);
          await loadAudits(companyId, response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha na ação tributária',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load, loadAudits],
  );

  const runFiscalAction = useCallback(
    async (action: 'submit' | 'accept' | 'reject', item: FiscalObligationRecord) => {
      if (!companyId) return;

      setActionLoading(`${action}:${item.id}`);
      setMessage(null);

      try {
        const response =
          action === 'submit'
            ? await obligationsApi.submitFiscal(companyId, item.id, {
                receiptCode: item.receiptCode || `REC-BCOST-${new Date().getTime()}`,
                fileHash: item.fileHash || `HASH-BCOST-${new Date().getTime()}`,
              })
            : action === 'accept'
              ? await obligationsApi.acceptFiscal(companyId, item.id)
              : await obligationsApi.rejectFiscal(companyId, item.id);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Ação fiscal concluída.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Ação concluída, mas a auditoria retornou alerta.',
        });

        await load({ silent: true });

        if (response.item) {
          setSelectedFiscal(response.item);
          await loadAudits(companyId, response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha na ação fiscal',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load, loadAudits],
  );

  const selectTax = useCallback(
    async (item: TaxObligationRecord) => {
      setSelectedTax(item);
      await loadAudits(companyId, item.id);
    },
    [companyId, loadAudits],
  );

  const selectFiscal = useCallback(
    async (item: FiscalObligationRecord) => {
      setSelectedFiscal(item);
      await loadAudits(companyId, item.id);
    },
    [companyId, loadAudits],
  );

  const isTax = mode === 'tax';
  const taxSummary = taxPayload?.summary;
  const fiscalSummary = fiscalPayload?.summary;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                {isTax ? <ReceiptText className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                Fiscal Operations Layer
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {isTax ? 'Obrigações Tributárias' : 'Obrigações Fiscais'}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {isTax
                  ? 'Gestão operacional de guias, valores, vencimentos e pagamento tributário.'
                  : 'Controle de obrigações acessórias, competência, transmissão, aceite e rejeição fiscal.'}
              </p>

              <div className="mt-3 text-xs text-slate-500">
                Empresa ativa:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {companyId || 'carregando...'}
                </span>
              </div>
            </div>

            <Button onClick={() => load()} disabled={loading} variant="secondary">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Atualizar
            </Button>
          </div>

          {message && (
            <div
              className={`mt-5 rounded-2xl border p-4 text-sm ${
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
        </div>

        {isTax ? (
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard
              label="Pendentes"
              value={taxSummary?.pending ?? 0}
              tone="blue"
              icon={<CalendarClock className="h-5 w-5" />}
            />
            <KpiCard
              label="Pagas"
              value={taxSummary?.paid ?? 0}
              tone="emerald"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <KpiCard
              label="Vencidas"
              value={taxSummary?.overdue ?? 0}
              tone="red"
              icon={<ShieldAlert className="h-5 w-5" />}
            />
            <KpiCard
              label="Valor pendente"
              value={formatMoney(taxSummary?.pendingAmount ?? 0)}
              tone="amber"
              icon={<ReceiptText className="h-5 w-5" />}
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-5">
            <KpiCard
              label="Pendentes"
              value={fiscalSummary?.pending ?? 0}
              tone="blue"
              icon={<CalendarClock className="h-5 w-5" />}
            />
            <KpiCard
              label="Submetidas"
              value={fiscalSummary?.submitted ?? 0}
              tone="amber"
              icon={<UploadCloud className="h-5 w-5" />}
            />
            <KpiCard
              label="Aceitas"
              value={fiscalSummary?.accepted ?? 0}
              tone="emerald"
              icon={<ShieldCheck className="h-5 w-5" />}
            />
            <KpiCard
              label="Rejeitadas"
              value={fiscalSummary?.rejected ?? 0}
              tone="red"
              icon={<AlertTriangle className="h-5 w-5" />}
            />
            <KpiCard
              label="Vencidas"
              value={fiscalSummary?.overdue ?? 0}
              tone="red"
              icon={<ShieldAlert className="h-5 w-5" />}
            />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(400px,0.9fr)]">
          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                {isTax ? 'Criar obrigação tributária' : 'Criar obrigação fiscal'}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {isTax
                  ? 'Crie guias e obrigações financeiras tributárias com vencimento e valor.'
                  : 'Crie obrigações acessórias por tipo e competência.'}
              </p>

              {isTax ? (
                <form onSubmit={submitTax} className="mt-5 grid gap-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Nome</span>
                      <input
                        value={taxForm.name}
                        onChange={(event) =>
                          setTaxForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Ex: DAS Simples Nacional"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Valor</span>
                      <input
                        type="number"
                        step="0.01"
                        value={taxForm.amount}
                        onChange={(event) =>
                          setTaxForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        placeholder="1450.75"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Vencimento</span>
                      <input
                        type="date"
                        value={taxForm.dueDate}
                        onChange={(event) =>
                          setTaxForm((current) => ({
                            ...current,
                            dueDate: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Status</span>
                      <select
                        value={taxForm.status}
                        onChange={(event) =>
                          setTaxForm((current) => ({
                            ...current,
                            status: event.target.value as TaxObligationStatus,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                        <option value="OVERDUE">OVERDUE</option>
                        <option value="CANCELLED">CANCELLED</option>
                        <option value="PARTIAL">PARTIAL</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Arquivo/URL</span>
                      <input
                        value={taxForm.fileUrl}
                        onChange={(event) =>
                          setTaxForm((current) => ({
                            ...current,
                            fileUrl: event.target.value,
                          }))
                        }
                        placeholder="https://..."
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      variant="success"
                      disabled={!taxCanSubmit || actionLoading === 'create-tax'}
                    >
                      {actionLoading === 'create-tax' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      Criar obrigação
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={submitFiscal} className="mt-5 grid gap-4">
                  <div className="grid gap-4 lg:grid-cols-4">
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Tipo</span>
                      <select
                        value={fiscalForm.type}
                        onChange={(event) =>
                          setFiscalForm((current) => ({
                            ...current,
                            type: event.target.value as FiscalObligationType,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      >
                        {FISCAL_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Mês</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={fiscalForm.referenceMonth}
                        onChange={(event) =>
                          setFiscalForm((current) => ({
                            ...current,
                            referenceMonth: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Ano</span>
                      <input
                        type="number"
                        min={2000}
                        max={2100}
                        value={fiscalForm.referenceYear}
                        onChange={(event) =>
                          setFiscalForm((current) => ({
                            ...current,
                            referenceYear: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Vencimento</span>
                      <input
                        type="date"
                        value={fiscalForm.dueDate}
                        onChange={(event) =>
                          setFiscalForm((current) => ({
                            ...current,
                            dueDate: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Status</span>
                      <select
                        value={fiscalForm.status}
                        onChange={(event) =>
                          setFiscalForm((current) => ({
                            ...current,
                            status: event.target.value as FiscalObligationStatus,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="GENERATED">GENERATED</option>
                        <option value="SUBMITTED">SUBMITTED</option>
                        <option value="ACCEPTED">ACCEPTED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="OVERDUE">OVERDUE</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Arquivo/URL</span>
                      <input
                        value={fiscalForm.fileUrl}
                        onChange={(event) =>
                          setFiscalForm((current) => ({
                            ...current,
                            fileUrl: event.target.value,
                          }))
                        }
                        placeholder="https://..."
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Hash/recibo</span>
                      <input
                        value={fiscalForm.fileHash}
                        onChange={(event) =>
                          setFiscalForm((current) => ({
                            ...current,
                            fileHash: event.target.value,
                          }))
                        }
                        placeholder="HASH..."
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      variant="success"
                      disabled={!fiscalCanSubmit || actionLoading === 'create-fiscal'}
                    >
                      {actionLoading === 'create-fiscal' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      Criar obrigação
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      {isTax ? 'Obrigações tributárias' : 'Obrigações fiscais'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Acompanhamento operacional com ações auditáveis.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') load();
                        }}
                        placeholder="Buscar..."
                        className="w-52 rounded-2xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                    >
                      <option value="ALL">Todos status</option>
                      {isTax ? (
                        <>
                          <option value="PENDING">PENDING</option>
                          <option value="PAID">PAID</option>
                          <option value="OVERDUE">OVERDUE</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="PARTIAL">PARTIAL</option>
                        </>
                      ) : (
                        <>
                          <option value="PENDING">PENDING</option>
                          <option value="GENERATED">GENERATED</option>
                          <option value="SUBMITTED">SUBMITTED</option>
                          <option value="ACCEPTED">ACCEPTED</option>
                          <option value="REJECTED">REJECTED</option>
                          <option value="OVERDUE">OVERDUE</option>
                        </>
                      )}
                    </select>

                    {!isTax && (
                      <select
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value)}
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-100 transition focus:border-blue-400 focus:ring-4"
                      >
                        <option value="ALL">Todos tipos</option>
                        {FISCAL_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    )}

                    <Button variant="secondary" onClick={() => load()}>
                      Aplicar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Carregando obrigações...
                  </div>
                ) : isTax ? (
                  taxItems.length === 0 ? (
                    <EmptyState mode={mode} />
                  ) : (
                    taxItems.map((item) => (
                      <TaxRow
                        key={item.id}
                        item={item}
                        selected={selectedTax?.id === item.id}
                        actionLoading={actionLoading}
                        onSelect={selectTax}
                        onPay={(target) => runTaxAction('pay', target)}
                        onCancel={(target) => runTaxAction('cancel', target)}
                      />
                    ))
                  )
                ) : fiscalItems.length === 0 ? (
                  <EmptyState mode={mode} />
                ) : (
                  fiscalItems.map((item) => (
                    <FiscalRow
                      key={item.id}
                      item={item}
                      selected={selectedFiscal?.id === item.id}
                      actionLoading={actionLoading}
                      onSelect={selectFiscal}
                      onSubmit={(target) => runFiscalAction('submit', target)}
                      onAccept={(target) => runFiscalAction('accept', target)}
                      onReject={(target) => runFiscalAction('reject', target)}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Detalhe operacional</h2>
              <p className="mt-1 text-sm text-slate-500">
                Evidência técnica e fiscal para auditoria.
              </p>

              {!selected ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Selecione uma obrigação para ver os detalhes.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(
                        selectedStatus,
                      )}`}
                    >
                      {selectedStatus}
                    </span>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(
                        selectedOperationalStatus,
                      )}`}
                    >
                      {selectedOperationalStatus}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">Dias até vencimento</div>
                      <div className="mt-1 text-2xl font-bold text-slate-950">
                        {selectedDaysToDue}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">Criado em</div>
                      <div className="mt-1 text-sm font-semibold text-slate-950">
                        {formatDate(selectedCreatedAt)}
                      </div>
                    </div>
                  </div>

                  <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                    {formatJson(selected)}
                  </pre>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Auditoria relacionada</h2>
              <p className="mt-1 text-sm text-slate-500">
                Últimos eventos auditáveis de {auditModule}.
              </p>

              <div className="mt-5 space-y-3">
                {audits.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    Nenhum evento de auditoria carregado.
                  </div>
                ) : (
                  audits.map((audit) => (
                    <div
                      key={audit.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                          {audit.module}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                          {audit.action}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        {formatDate(audit.createdAt)}
                      </div>

                      <pre className="mt-3 max-h-44 overflow-auto rounded-xl bg-slate-900 p-3 text-xs leading-5 text-slate-100">
                        {formatJson(audit.payload)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function EmptyState({ mode }: { mode: WorkspaceMode }) {
  return (
    <div className="p-10 text-center">
      <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />
      <div className="mt-3 text-sm font-semibold text-slate-700">Nenhuma obrigação cadastrada.</div>
      <div className="mt-1 text-sm text-slate-500">
        {mode === 'tax'
          ? 'Crie a primeira obrigação tributária para acompanhar valores e vencimentos.'
          : 'Crie a primeira obrigação fiscal para acompanhar competências e transmissão.'}
      </div>
    </div>
  );
}

function TaxRow({
  item,
  selected,
  actionLoading,
  onSelect,
  onPay,
  onCancel,
}: {
  item: TaxObligationRecord;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (item: TaxObligationRecord) => void;
  onPay: (item: TaxObligationRecord) => void;
  onCancel: (item: TaxObligationRecord) => void;
}) {
  const busy = actionLoading?.endsWith(`:${item.id}`);

  return (
    <article className={`p-5 transition ${selected ? 'bg-blue-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <button type="button" onClick={() => onSelect(item)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(item.status)}`}
            >
              {item.status}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(item.operationalStatus)}`}
            >
              {item.operationalStatus || '—'}
            </span>
            {typeof item.daysToDue === 'number' && (
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                {item.daysToDue} dias
              </span>
            )}
          </div>

          <h3 className="mt-3 truncate text-base font-bold text-slate-950">{item.name}</h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <span>Valor: {formatMoney(item.amount)}</span>
            <span>Vencimento: {formatDate(item.dueDate)}</span>
            <span>Versão: {item.version ?? '—'}</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="success"
            disabled={busy || item.status === 'PAID'}
            onClick={() => onPay(item)}
          >
            {actionLoading === `pay:${item.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Pagar
          </Button>

          <Button
            variant="secondary"
            disabled={busy || item.status === 'CANCELLED'}
            onClick={() => onCancel(item)}
          >
            <XCircle className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </div>
    </article>
  );
}

function FiscalRow({
  item,
  selected,
  actionLoading,
  onSelect,
  onSubmit,
  onAccept,
  onReject,
}: {
  item: FiscalObligationRecord;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (item: FiscalObligationRecord) => void;
  onSubmit: (item: FiscalObligationRecord) => void;
  onAccept: (item: FiscalObligationRecord) => void;
  onReject: (item: FiscalObligationRecord) => void;
}) {
  const busy = actionLoading?.endsWith(`:${item.id}`);

  return (
    <article className={`p-5 transition ${selected ? 'bg-blue-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <button type="button" onClick={() => onSelect(item)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
              {item.type}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(item.status)}`}
            >
              {item.status}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(item.operationalStatus)}`}
            >
              {item.operationalStatus || '—'}
            </span>
            {typeof item.daysToDue === 'number' && (
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                {item.daysToDue} dias
              </span>
            )}
          </div>

          <h3 className="mt-3 truncate text-base font-bold text-slate-950">
            {item.type} — {String(item.referenceMonth).padStart(2, '0')}/{item.referenceYear}
          </h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <span>Vencimento: {formatDate(item.dueDate)}</span>
            <span>Submissão: {formatDate(item.submittedAt)}</span>
            <span>Recibo: {item.receiptCode || '—'}</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="warning"
            disabled={busy || item.status === 'SUBMITTED' || item.status === 'ACCEPTED'}
            onClick={() => onSubmit(item)}
          >
            {actionLoading === `submit:${item.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            Submeter
          </Button>

          <Button
            variant="success"
            disabled={busy || item.status === 'ACCEPTED'}
            onClick={() => onAccept(item)}
          >
            <ShieldCheck className="h-4 w-4" />
            Aceitar
          </Button>

          <Button
            variant="danger"
            disabled={busy || item.status === 'REJECTED'}
            onClick={() => onReject(item)}
          >
            <XCircle className="h-4 w-4" />
            Rejeitar
          </Button>
        </div>
      </div>
    </article>
  );
}

'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  BookOpenCheck,
  CheckCircle2,
  FileSpreadsheet,
  Landmark,
  Layers3,
  Loader2,
  LockKeyhole,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UnlockKeyhole,
  XCircle,
} from 'lucide-react';

import {
  AccountPlanRecord,
  AccountType,
  AccountingEntriesListResponse,
  AccountingEntryRecord,
  accountingApi,
  AccountPlanListResponse,
  AuditLogRecord,
  BalanceLockRecord,
  CreateAccountingEntryPayload,
  CreateAccountPlanPayload,
  EntryOrigin,
} from '@/lib/api/accounting';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';

type WorkspaceMode = 'account-plan' | 'accounting-entries';

type UiMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
};

type AccountPlanFormState = {
  code: string;
  name: string;
  type: AccountType;
  parentCode: string;
  active: boolean;
};

type EntryFormState = {
  date: string;
  description: string;
  debitCode: string;
  creditCode: string;
  amount: string;
  origin: EntryOrigin;
  referenceId: string;
  referenceType: string;
};

type LockFormState = {
  month: string;
  year: string;
  lockedBy: string;
};

const ACCOUNT_TYPES: AccountType[] = [
  'ATIVO',
  'PASSIVO',
  'PATRIMONIO_LIQUIDO',
  'RECEITA',
  'DESPESA',
  'CUSTO',
];

const ENTRY_ORIGINS: EntryOrigin[] = [
  'MANUAL',
  'INVOICE_AUTO',
  'PAYROLL_AUTO',
  'BANK_IMPORT',
  'TAX_PAYMENT',
];

const DEFAULT_ACCOUNT_FORM: AccountPlanFormState = {
  code: '',
  name: '',
  type: 'ATIVO',
  parentCode: '',
  active: true,
};

const DEFAULT_ENTRY_FORM: EntryFormState = {
  date: new Date().toISOString().slice(0, 10),
  description: '',
  debitCode: '1.1.02',
  creditCode: '4.1.01',
  amount: '',
  origin: 'MANUAL',
  referenceId: '',
  referenceType: 'MANUAL',
};

const DEFAULT_LOCK_FORM: LockFormState = {
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
  lockedBy: 'admin@bcost.com.br',
};

async function resolveCompanyId(): Promise<string> {
  return resolveEnterpriseCompanyIdWithFallback();
}

function fromDateInput(value: string) {
  if (!value) return '';
  return `${value}T00:00:00.000Z`;
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

function statusClass(value?: string | boolean | null) {
  const normalized = String(value || '').toUpperCase();

  if (normalized === 'TRUE' || normalized === 'ACTIVE' || normalized === 'BALANCED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'FALSE' || normalized === 'INACTIVE' || normalized === 'UNBALANCED') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (normalized === 'LOCKED') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-slate-200 bg-white text-slate-600';
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
  tone: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'purple';
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
        <div>
          <div className="text-sm opacity-70">{label}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
        </div>
        <div className="rounded-xl bg-white/70 p-2">{icon}</div>
      </div>
    </div>
  );
}

export default function AccountingEnterpriseWorkspace({ mode }: { mode: WorkspaceMode }) {
  const [companyId, setCompanyId] = useState('');
  const [accountPayload, setAccountPayload] = useState<AccountPlanListResponse | null>(null);
  const [entryPayload, setEntryPayload] = useState<AccountingEntriesListResponse | null>(null);
  const [locks, setLocks] = useState<BalanceLockRecord[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountPlanRecord | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AccountingEntryRecord | null>(null);
  const [accountForm, setAccountForm] = useState<AccountPlanFormState>(DEFAULT_ACCOUNT_FORM);
  const [entryForm, setEntryForm] = useState<EntryFormState>(DEFAULT_ENTRY_FORM);
  const [lockForm, setLockForm] = useState<LockFormState>(DEFAULT_LOCK_FORM);
  const [audits, setAudits] = useState<AuditLogRecord[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [originFilter, setOriginFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const isPlan = mode === 'account-plan';
  const auditModule = isPlan ? 'account-plan' : 'accounting-entries';

  const accounts = accountPayload?.items || [];
  const entries = entryPayload?.items || [];
  const accountSummary = accountPayload?.summary;
  const entrySummary = entryPayload?.summary;

  const accountCanSubmit = useMemo(() => {
    return Boolean(accountForm.code && accountForm.name && accountForm.type);
  }, [accountForm]);

  const entryCanSubmit = useMemo(() => {
    return Boolean(
      entryForm.date &&
      entryForm.description &&
      entryForm.debitCode &&
      entryForm.creditCode &&
      Number(entryForm.amount) > 0 &&
      entryForm.debitCode !== entryForm.creditCode,
    );
  }, [entryForm]);

  const loadAudits = useCallback(
    async (
      companyIdOverride?: string,
      moduleOverride?: 'account-plan' | 'accounting-entries' | 'balance-locks',
      entityId?: string,
    ) => {
      const effectiveCompanyId = companyIdOverride || companyId;
      const effectiveModule = moduleOverride || auditModule;

      if (!effectiveCompanyId) {
        setAudits([]);
        return;
      }

      try {
        const response = await accountingApi.audit(effectiveCompanyId, effectiveModule, {
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

  const loadLocks = useCallback(
    async (companyIdOverride?: string) => {
      const effectiveCompanyId = companyIdOverride || companyId;

      if (!effectiveCompanyId) return;

      try {
        const response = await accountingApi.listLocks(effectiveCompanyId);
        setLocks(response.items || []);
      } catch {
        setLocks([]);
      }
    },
    [companyId],
  );

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) setLoading(true);
        setMessage(null);

        const resolvedCompanyId = companyId || (await resolveCompanyId());
        setCompanyId(resolvedCompanyId);

        if (isPlan) {
          const response = await accountingApi.listAccountPlan(resolvedCompanyId, {
            limit: 200,
            search,
            type: typeFilter,
          });

          setAccountPayload(response);

          const nextSelected =
            response.items.find((item) => item.id === selectedAccount?.id) ||
            response.items[0] ||
            null;

          setSelectedAccount(nextSelected);
          await loadAudits(resolvedCompanyId, 'account-plan', nextSelected?.id);
        } else {
          const response = await accountingApi.listEntries(resolvedCompanyId, {
            limit: 100,
            search,
            origin: originFilter,
          });

          setEntryPayload(response);

          const nextSelected =
            response.items.find((item) => item.id === selectedEntry?.id) ||
            response.items[0] ||
            null;

          setSelectedEntry(nextSelected);
          await loadAudits(resolvedCompanyId, 'accounting-entries', nextSelected?.id);
          await loadLocks(resolvedCompanyId);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao carregar módulo contábil',
          description:
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os dados contábeis.',
        });
      } finally {
        setLoading(false);
      }
    },
    [
      companyId,
      isPlan,
      search,
      typeFilter,
      originFilter,
      selectedAccount?.id,
      selectedEntry?.id,
      loadAudits,
      loadLocks,
    ],
  );

  useEffect(() => {
    load();
  }, [load]);

  const submitAccount = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!companyId || !accountCanSubmit) return;

      setActionLoading('create-account');
      setMessage(null);

      try {
        const payload: CreateAccountPlanPayload = {
          code: accountForm.code.trim(),
          name: accountForm.name.trim(),
          type: accountForm.type,
          parentCode: accountForm.parentCode.trim() || undefined,
          active: accountForm.active,
        };

        const response = await accountingApi.createAccountPlan(companyId, payload);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Conta contábil criada.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Operação concluída, mas a auditoria retornou alerta.',
        });

        setAccountForm(DEFAULT_ACCOUNT_FORM);
        await load({ silent: true });

        if (response.item) {
          setSelectedAccount(response.item);
          await loadAudits(companyId, 'account-plan', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao criar conta contábil',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, accountCanSubmit, accountForm, load, loadAudits],
  );

  const submitEntry = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!companyId || !entryCanSubmit) return;

      setActionLoading('create-entry');
      setMessage(null);

      try {
        const payload: CreateAccountingEntryPayload = {
          date: fromDateInput(entryForm.date),
          description: entryForm.description.trim(),
          debitCode: entryForm.debitCode.trim(),
          creditCode: entryForm.creditCode.trim(),
          amount: Number(entryForm.amount),
          origin: entryForm.origin,
          referenceId: entryForm.referenceId.trim() || undefined,
          referenceType: entryForm.referenceType.trim() || undefined,
        };

        const response = await accountingApi.createEntry(companyId, payload);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Lançamento contábil criado.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Operação concluída, mas a auditoria retornou alerta.',
        });

        setEntryForm(DEFAULT_ENTRY_FORM);
        await load({ silent: true });

        if (response.item) {
          setSelectedEntry(response.item);
          await loadAudits(companyId, 'accounting-entries', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao criar lançamento',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, entryCanSubmit, entryForm, load, loadAudits],
  );

  const seedDefaultPlan = useCallback(async () => {
    if (!companyId) return;

    setActionLoading('seed-plan');
    setMessage(null);

    try {
      const response = await accountingApi.seedDefaultAccountPlan(companyId);

      setMessage({
        type: response.audit?.recorded ? 'success' : 'warning',
        title: response.message || 'Plano base aplicado.',
        description: response.results
          ? `Criadas: ${
              response.results.filter((item) => item.status === 'CREATED').length
            } | Ignoradas: ${response.results.filter((item) => item.status === 'SKIPPED').length}`
          : undefined,
      });

      await load({ silent: true });
      await loadAudits(companyId, 'account-plan');
    } catch (error) {
      setMessage({
        type: 'error',
        title: 'Falha ao aplicar plano base',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    } finally {
      setActionLoading(null);
    }
  }, [companyId, load, loadAudits]);

  const deactivateAccount = useCallback(
    async (account: AccountPlanRecord) => {
      if (!companyId) return;

      setActionLoading(`deactivate:${account.id}`);
      setMessage(null);

      try {
        const response = await accountingApi.deactivateAccountPlan(companyId, account.id);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Conta desativada.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Ação concluída, mas a auditoria retornou alerta.',
        });

        await load({ silent: true });

        if (response.item) {
          setSelectedAccount(response.item);
          await loadAudits(companyId, 'account-plan', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao desativar conta',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load, loadAudits],
  );

  const deleteEntry = useCallback(
    async (entry: AccountingEntryRecord) => {
      if (!companyId) return;

      setActionLoading(`delete:${entry.id}`);
      setMessage(null);

      try {
        const response = await accountingApi.deleteEntry(companyId, entry.id);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Lançamento removido.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Ação concluída, mas a auditoria retornou alerta.',
        });

        if (selectedEntry?.id === entry.id) {
          setSelectedEntry(null);
        }

        await load({ silent: true });
        await loadAudits(companyId, 'accounting-entries');
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao remover lançamento',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, selectedEntry?.id, load, loadAudits],
  );

  const lockPeriod = useCallback(async () => {
    if (!companyId) return;

    const month = Number(lockForm.month);
    const year = Number(lockForm.year);

    if (!month || !year) return;

    setActionLoading('lock-period');
    setMessage(null);

    try {
      const response = await accountingApi.lockPeriod(companyId, {
        month,
        year,
        lockedBy: lockForm.lockedBy.trim() || undefined,
      });

      setMessage({
        type: response.audit?.recorded ? 'success' : 'warning',
        title: response.message || 'Período bloqueado.',
        description: response.audit?.recorded
          ? 'Evento registrado em AuditLog.'
          : 'Ação concluída, mas a auditoria retornou alerta.',
      });

      await load({ silent: true });
      await loadAudits(companyId, 'balance-locks');
    } catch (error) {
      setMessage({
        type: 'error',
        title: 'Falha ao bloquear período',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    } finally {
      setActionLoading(null);
    }
  }, [companyId, lockForm, load, loadAudits]);

  const unlockPeriod = useCallback(
    async (lock: BalanceLockRecord) => {
      if (!companyId) return;

      setActionLoading(`unlock:${lock.id}`);
      setMessage(null);

      try {
        const response = await accountingApi.unlockPeriod(companyId, lock.month, lock.year);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Período desbloqueado.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Ação concluída, mas a auditoria retornou alerta.',
        });

        await load({ silent: true });
        await loadAudits(companyId, 'balance-locks');
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao desbloquear período',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load, loadAudits],
  );

  const selectAccount = useCallback(
    async (account: AccountPlanRecord) => {
      setSelectedAccount(account);
      await loadAudits(companyId, 'account-plan', account.id);
    },
    [companyId, loadAudits],
  );

  const selectEntry = useCallback(
    async (entry: AccountingEntryRecord) => {
      setSelectedEntry(entry);
      await loadAudits(companyId, 'accounting-entries', entry.id);
    },
    [companyId, loadAudits],
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
                {isPlan ? <Layers3 className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                Accounting Core Layer
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {isPlan ? 'Plano de Contas' : 'Lançamentos Contábeis'}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {isPlan
                  ? 'Gestão enterprise do plano de contas contábil, com tipos, escopo, hierarquia e auditoria.'
                  : 'Motor de lançamentos contábeis com débito, crédito, competência, lock de período e trilha de auditoria.'}
              </p>

              <div className="mt-3 text-xs text-slate-500">
                Empresa ativa:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {companyId || 'carregando...'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isPlan && (
                <Button
                  onClick={seedDefaultPlan}
                  disabled={actionLoading === 'seed-plan' || loading}
                  variant="success"
                >
                  {actionLoading === 'seed-plan' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BookOpenCheck className="h-4 w-4" />
                  )}
                  Aplicar plano base
                </Button>
              )}

              <Button onClick={() => load()} disabled={loading} variant="secondary">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Atualizar
              </Button>
            </div>
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

        {isPlan ? (
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard
              label="Contas"
              value={accountSummary?.count ?? 0}
              tone="purple"
              icon={<Layers3 className="h-5 w-5" />}
            />
            <KpiCard
              label="Ativas"
              value={accountSummary?.active ?? 0}
              tone="emerald"
              icon={<ShieldCheck className="h-5 w-5" />}
            />
            <KpiCard
              label="Inativas"
              value={accountSummary?.inactive ?? 0}
              tone="red"
              icon={<XCircle className="h-5 w-5" />}
            />
            <KpiCard
              label="Empresa"
              value={accountSummary?.companySpecific ?? 0}
              tone="blue"
              icon={<Landmark className="h-5 w-5" />}
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-5">
            <KpiCard
              label="Lançamentos"
              value={entrySummary?.count ?? 0}
              tone="purple"
              icon={<FileSpreadsheet className="h-5 w-5" />}
            />
            <KpiCard
              label="Débitos"
              value={formatMoney(entrySummary?.totalDebit ?? 0)}
              tone="blue"
              icon={<PlusCircle className="h-5 w-5" />}
            />
            <KpiCard
              label="Créditos"
              value={formatMoney(entrySummary?.totalCredit ?? 0)}
              tone="emerald"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <KpiCard
              label="Balanceado"
              value={entrySummary?.balanced ? 'Sim' : 'Não'}
              tone={entrySummary?.balanced ? 'emerald' : 'red'}
              icon={<BadgeCheck className="h-5 w-5" />}
            />
            <KpiCard
              label="Bloqueados"
              value={entrySummary?.locked ?? 0}
              tone="amber"
              icon={<LockKeyhole className="h-5 w-5" />}
            />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                {isPlan ? 'Criar conta contábil' : 'Criar lançamento contábil'}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {isPlan
                  ? 'Crie contas específicas da empresa preservando o plano base.'
                  : 'Crie lançamentos manuais com débito, crédito, valor e competência.'}
              </p>

              {isPlan ? (
                <form onSubmit={submitAccount} className="mt-5 grid gap-4">
                  <div className="grid gap-4 lg:grid-cols-4">
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Código</span>
                      <input
                        value={accountForm.code}
                        onChange={(event) =>
                          setAccountForm((current) => ({
                            ...current,
                            code: event.target.value,
                          }))
                        }
                        placeholder="Ex: 4.2.01"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm lg:col-span-2">
                      <span className="font-semibold text-slate-700">Nome</span>
                      <input
                        value={accountForm.name}
                        onChange={(event) =>
                          setAccountForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Ex: Receita de assinatura SaaS"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Tipo</span>
                      <select
                        value={accountForm.type}
                        onChange={(event) =>
                          setAccountForm((current) => ({
                            ...current,
                            type: event.target.value as AccountType,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      >
                        {ACCOUNT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Código pai</span>
                      <input
                        value={accountForm.parentCode}
                        onChange={(event) =>
                          setAccountForm((current) => ({
                            ...current,
                            parentCode: event.target.value,
                          }))
                        }
                        placeholder="Opcional"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </label>

                    <label className="flex items-center gap-2 pt-7 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={accountForm.active}
                        onChange={(event) =>
                          setAccountForm((current) => ({
                            ...current,
                            active: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Conta ativa
                    </label>

                    <div className="flex items-end">
                      <Button
                        type="submit"
                        variant="success"
                        disabled={!accountCanSubmit || actionLoading === 'create-account'}
                      >
                        {actionLoading === 'create-account' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <BadgeCheck className="h-4 w-4" />
                        )}
                        Criar conta
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={submitEntry} className="mt-5 grid gap-4">
                  <div className="grid gap-4 lg:grid-cols-4">
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Data</span>
                      <input
                        type="date"
                        value={entryForm.date}
                        onChange={(event) =>
                          setEntryForm((current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Débito</span>
                      <input
                        value={entryForm.debitCode}
                        onChange={(event) =>
                          setEntryForm((current) => ({
                            ...current,
                            debitCode: event.target.value,
                          }))
                        }
                        placeholder="1.1.02"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Crédito</span>
                      <input
                        value={entryForm.creditCode}
                        onChange={(event) =>
                          setEntryForm((current) => ({
                            ...current,
                            creditCode: event.target.value,
                          }))
                        }
                        placeholder="4.1.01"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Valor</span>
                      <input
                        type="number"
                        step="0.01"
                        value={entryForm.amount}
                        onChange={(event) =>
                          setEntryForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        placeholder="2500.50"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </label>
                  </div>

                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Descrição</span>
                    <input
                      value={entryForm.description}
                      onChange={(event) =>
                        setEntryForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Ex: Reconhecimento de receita mensal"
                      className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                    />
                  </label>

                  <div className="grid gap-4 lg:grid-cols-4">
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Origem</span>
                      <select
                        value={entryForm.origin}
                        onChange={(event) =>
                          setEntryForm((current) => ({
                            ...current,
                            origin: event.target.value as EntryOrigin,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      >
                        {ENTRY_ORIGINS.map((origin) => (
                          <option key={origin} value={origin}>
                            {origin}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Reference Type</span>
                      <input
                        value={entryForm.referenceType}
                        onChange={(event) =>
                          setEntryForm((current) => ({
                            ...current,
                            referenceType: event.target.value,
                          }))
                        }
                        placeholder="MANUAL"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Reference ID</span>
                      <input
                        value={entryForm.referenceId}
                        onChange={(event) =>
                          setEntryForm((current) => ({
                            ...current,
                            referenceId: event.target.value,
                          }))
                        }
                        placeholder="Opcional"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </label>

                    <div className="flex items-end">
                      <Button
                        type="submit"
                        variant="success"
                        disabled={!entryCanSubmit || actionLoading === 'create-entry'}
                      >
                        {actionLoading === 'create-entry' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <BadgeCheck className="h-4 w-4" />
                        )}
                        Criar lançamento
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {!isPlan && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Fechamento de período</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Bloqueie ou desbloqueie períodos contábeis com trilha de auditoria.
                </p>

                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Mês</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={lockForm.month}
                      onChange={(event) =>
                        setLockForm((current) => ({
                          ...current,
                          month: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                    />
                  </label>

                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Ano</span>
                    <input
                      type="number"
                      min={2000}
                      max={2100}
                      value={lockForm.year}
                      onChange={(event) =>
                        setLockForm((current) => ({
                          ...current,
                          year: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                    />
                  </label>

                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-slate-700">Bloqueado por</span>
                    <input
                      value={lockForm.lockedBy}
                      onChange={(event) =>
                        setLockForm((current) => ({
                          ...current,
                          lockedBy: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                    />
                  </label>

                  <div className="flex items-end">
                    <Button
                      variant="warning"
                      onClick={lockPeriod}
                      disabled={actionLoading === 'lock-period'}
                    >
                      {actionLoading === 'lock-period' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LockKeyhole className="h-4 w-4" />
                      )}
                      Bloquear período
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {locks.length === 0 ? (
                    <span className="text-sm text-slate-500">Nenhum período bloqueado.</span>
                  ) : (
                    locks.map((lock) => (
                      <button
                        key={lock.id}
                        onClick={() => unlockPeriod(lock)}
                        disabled={actionLoading === `unlock:${lock.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                      >
                        {actionLoading === `unlock:${lock.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UnlockKeyhole className="h-3.5 w-3.5" />
                        )}
                        {String(lock.month).padStart(2, '0')}/{lock.year}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      {isPlan ? 'Contas contábeis' : 'Lançamentos'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Lista operacional com detalhe e auditoria relacionada.
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
                        className="w-52 rounded-2xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      />
                    </div>

                    {isPlan ? (
                      <select
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value)}
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      >
                        <option value="ALL">Todos tipos</option>
                        {ACCOUNT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={originFilter}
                        onChange={(event) => setOriginFilter(event.target.value)}
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-purple-100 transition focus:border-purple-400 focus:ring-4"
                      >
                        <option value="ALL">Todas origens</option>
                        {ENTRY_ORIGINS.map((origin) => (
                          <option key={origin} value={origin}>
                            {origin}
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
                    Carregando...
                  </div>
                ) : isPlan ? (
                  accounts.length === 0 ? (
                    <EmptyState mode={mode} />
                  ) : (
                    accounts.map((account) => (
                      <AccountRow
                        key={account.id}
                        account={account}
                        selected={selectedAccount?.id === account.id}
                        actionLoading={actionLoading}
                        onSelect={selectAccount}
                        onDeactivate={deactivateAccount}
                      />
                    ))
                  )
                ) : entries.length === 0 ? (
                  <EmptyState mode={mode} />
                ) : (
                  entries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      selected={selectedEntry?.id === entry.id}
                      actionLoading={actionLoading}
                      onSelect={selectEntry}
                      onDelete={deleteEntry}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Detalhe técnico</h2>
              <p className="mt-1 text-sm text-slate-500">Evidência para auditoria e suporte.</p>

              {isPlan ? (
                !selectedAccount ? (
                  <DetailEmpty />
                ) : (
                  <DetailJson value={selectedAccount} />
                )
              ) : !selectedEntry ? (
                <DetailEmpty />
              ) : (
                <DetailJson value={selectedEntry} />
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Auditoria relacionada</h2>
              <p className="mt-1 text-sm text-slate-500">Últimos eventos auditáveis do módulo.</p>

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
      <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-300" />
      <div className="mt-3 text-sm font-semibold text-slate-700">Nenhum registro encontrado.</div>
      <div className="mt-1 text-sm text-slate-500">
        {mode === 'account-plan'
          ? 'Aplique o plano base ou crie uma nova conta contábil.'
          : 'Crie o primeiro lançamento contábil para movimentar o livro razão.'}
      </div>
    </div>
  );
}

function DetailEmpty() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
      Selecione um registro para ver os detalhes.
    </div>
  );
}

function DetailJson({ value }: { value: unknown }) {
  return (
    <div className="mt-5">
      <pre className="max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
        {formatJson(value)}
      </pre>
    </div>
  );
}

function AccountRow({
  account,
  selected,
  actionLoading,
  onSelect,
  onDeactivate,
}: {
  account: AccountPlanRecord;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (account: AccountPlanRecord) => void;
  onDeactivate: (account: AccountPlanRecord) => void;
}) {
  const busy = actionLoading?.endsWith(`:${account.id}`);

  return (
    <article className={`p-5 transition ${selected ? 'bg-purple-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <button
          type="button"
          onClick={() => onSelect(account)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
              {account.code}
            </span>
            <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
              {account.type}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(account.active)}`}
            >
              {account.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
              {account.scope || '—'}
            </span>
          </div>

          <h3 className="mt-3 truncate text-base font-bold text-slate-950">{account.name}</h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <span>Conta pai: {account.parentCode || '—'}</span>
            <span>Criada em: {formatDate(account.createdAt)}</span>
            <span>ID: {account.id}</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={busy || !account.active}
            onClick={() => onDeactivate(account)}
          >
            {actionLoading === `deactivate:${account.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Desativar
          </Button>
        </div>
      </div>
    </article>
  );
}

function EntryRow({
  entry,
  selected,
  actionLoading,
  onSelect,
  onDelete,
}: {
  entry: AccountingEntryRecord;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (entry: AccountingEntryRecord) => void;
  onDelete: (entry: AccountingEntryRecord) => void;
}) {
  const busy = actionLoading?.endsWith(`:${entry.id}`);

  return (
    <article className={`p-5 transition ${selected ? 'bg-purple-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <button type="button" onClick={() => onSelect(entry)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
              {entry.origin}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(entry.locked ? 'LOCKED' : 'ACTIVE')}`}
            >
              {entry.locked ? 'LOCKED' : 'OPEN'}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
              {entry.periodLabel || `${String(entry.month).padStart(2, '0')}/${entry.year}`}
            </span>
          </div>

          <h3 className="mt-3 truncate text-base font-bold text-slate-950">{entry.description}</h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-4">
            <span>Débito: {entry.debitCode}</span>
            <span>Crédito: {entry.creditCode}</span>
            <span>Valor: {formatMoney(entry.amount)}</span>
            <span>Data: {formatDate(entry.date)}</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          <Button variant="danger" disabled={busy || entry.locked} onClick={() => onDelete(entry)}>
            {actionLoading === `delete:${entry.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Remover
          </Button>
        </div>
      </div>
    </article>
  );
}

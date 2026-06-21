'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Landmark,
  Loader2,
  PlusCircle,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import {
  AuditLogRecord,
  BankAccountEnterpriseRecord,
  BankAccountsListResponse,
  BankTransactionEnterpriseRecord,
  BankTransactionsListResponse,
  bankingEnterpriseApi,
  BankingSummaryResponse,
  CreateBankAccountPayload,
  CreateBankTransactionPayload,
  ReconciliationCandidate,
  TransactionType,
} from '@/lib/api/banking-enterprise';
import { api } from '@/services/api';

type WorkspaceMode = 'bank-accounts' | 'bank-transactions' | 'reconciliation';

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

type AccountFormState = {
  bankName: string;
  agency: string;
  account: string;
  balanceCache: string;
};

type TransactionFormState = {
  bankAccountId: string;
  type: TransactionType;
  amount: string;
  description: string;
  occurredAt: string;
};

const DEFAULT_ACCOUNT_FORM: AccountFormState = {
  bankName: '',
  agency: '',
  account: '',
  balanceCache: '0',
};

const DEFAULT_TRANSACTION_FORM: TransactionFormState = {
  bankAccountId: '',
  type: 'CREDIT',
  amount: '',
  description: '',
  occurredAt: new Date().toISOString().slice(0, 10),
};

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

  if (normalized === 'ACTIVE' || normalized === 'TRUE' || normalized.includes('RECONCILED')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'PENDING' || normalized === 'FALSE' || normalized === 'OPEN') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'DELETED' || normalized === 'FAILED') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (normalized === 'CREDIT') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (normalized === 'DEBIT') {
    return 'border-purple-200 bg-purple-50 text-purple-700';
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

function moduleName(mode: WorkspaceMode) {
  if (mode === 'bank-accounts') return 'bank-accounts';
  if (mode === 'bank-transactions') return 'bank-transactions';
  return 'bank-reconciliation';
}

export default function BankingEnterpriseWorkspace({ mode }: { mode: WorkspaceMode }) {
  const [companyId, setCompanyId] = useState('');
  const [summary, setSummary] = useState<BankingSummaryResponse | null>(null);
  const [accountsPayload, setAccountsPayload] = useState<BankAccountsListResponse | null>(null);
  const [transactionsPayload, setTransactionsPayload] =
    useState<BankTransactionsListResponse | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<BankAccountEnterpriseRecord | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<BankTransactionEnterpriseRecord | null>(null);
  const [candidates, setCandidates] = useState<ReconciliationCandidate[]>([]);
  const [audits, setAudits] = useState<AuditLogRecord[]>([]);
  const [accountForm, setAccountForm] = useState<AccountFormState>(DEFAULT_ACCOUNT_FORM);
  const [transactionForm, setTransactionForm] =
    useState<TransactionFormState>(DEFAULT_TRANSACTION_FORM);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [reconciledFilter, setReconciledFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const accounts = accountsPayload?.items || [];
  const transactions = transactionsPayload?.items || [];
  const auditModule = moduleName(mode);

  const accountCanSubmit = useMemo(() => {
    return Boolean(accountForm.bankName && accountForm.agency && accountForm.account);
  }, [accountForm]);

  const transactionCanSubmit = useMemo(() => {
    return Boolean(
      transactionForm.bankAccountId &&
      transactionForm.type &&
      transactionForm.amount &&
      Number(transactionForm.amount) > 0 &&
      transactionForm.description &&
      transactionForm.occurredAt,
    );
  }, [transactionForm]);

  const loadAudits = useCallback(
    async (
      companyIdOverride?: string,
      moduleOverride?: 'bank-accounts' | 'bank-transactions' | 'bank-reconciliation',
      entityId?: string,
    ) => {
      const effectiveCompanyId = companyIdOverride || companyId;
      const effectiveModule = moduleOverride || auditModule;

      if (!effectiveCompanyId) {
        setAudits([]);
        return;
      }

      try {
        const response = await bankingEnterpriseApi.audit(effectiveCompanyId, effectiveModule, {
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

  const loadCandidates = useCallback(
    async (companyIdOverride?: string, transactionIdOverride?: string, silent = true) => {
      const effectiveCompanyId = companyIdOverride || companyId;
      const effectiveTransactionId = transactionIdOverride || selectedTransaction?.id;

      if (!effectiveCompanyId || !effectiveTransactionId) {
        setCandidates([]);
        return;
      }

      try {
        if (!silent) setActionLoading(`candidates:${effectiveTransactionId}`);

        const response = await bankingEnterpriseApi.candidates(
          effectiveCompanyId,
          effectiveTransactionId,
          {
            amountTolerance: 0.05,
            dateToleranceDays: 90,
          },
        );

        setCandidates(response.candidates || []);
      } catch {
        setCandidates([]);
      } finally {
        if (!silent) setActionLoading(null);
      }
    },
    [companyId, selectedTransaction?.id],
  );

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) setLoading(true);
        setMessage(null);

        const resolvedCompanyId = companyId || (await resolveCompanyId());
        setCompanyId(resolvedCompanyId);

        const [summaryResponse, accountsResponse, transactionsResponse] = await Promise.all([
          bankingEnterpriseApi.summary(resolvedCompanyId),
          bankingEnterpriseApi.listAccounts(resolvedCompanyId, {
            limit: 100,
            search: mode === 'bank-accounts' ? search : undefined,
          }),
          bankingEnterpriseApi.listTransactions(resolvedCompanyId, {
            limit: 100,
            search: mode !== 'bank-accounts' ? search : undefined,
            type: typeFilter,
            reconciled: reconciledFilter,
          }),
        ]);

        setSummary(summaryResponse);
        setAccountsPayload(accountsResponse);
        setTransactionsPayload(transactionsResponse);

        if (!transactionForm.bankAccountId && accountsResponse.items[0]?.id) {
          setTransactionForm((current) => ({
            ...current,
            bankAccountId: accountsResponse.items[0].id,
          }));
        }

        const nextAccount =
          accountsResponse.items.find((item) => item.id === selectedAccount?.id) ||
          accountsResponse.items[0] ||
          null;

        const nextTransaction =
          transactionsResponse.items.find((item) => item.id === selectedTransaction?.id) ||
          transactionsResponse.items[0] ||
          null;

        setSelectedAccount(nextAccount);
        setSelectedTransaction(nextTransaction);

        if (mode === 'bank-accounts') {
          await loadAudits(resolvedCompanyId, 'bank-accounts', nextAccount?.id);
        }

        if (mode === 'bank-transactions') {
          await loadAudits(resolvedCompanyId, 'bank-transactions', nextTransaction?.id);
        }

        if (mode === 'reconciliation') {
          await loadAudits(resolvedCompanyId, 'bank-reconciliation');
          if (nextTransaction) {
            await loadCandidates(resolvedCompanyId, nextTransaction.id, true);
          }
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao carregar Banking Enterprise',
          description:
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os dados bancários.',
        });
      } finally {
        setLoading(false);
      }
    },
    [
      companyId,
      mode,
      search,
      typeFilter,
      reconciledFilter,
      selectedAccount?.id,
      selectedTransaction?.id,
      transactionForm.bankAccountId,
      loadAudits,
      loadCandidates,
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
        const payload: CreateBankAccountPayload = {
          bankName: accountForm.bankName.trim(),
          agency: accountForm.agency.trim(),
          account: accountForm.account.trim(),
          balanceCache: Number(accountForm.balanceCache || 0),
        };

        const response = await bankingEnterpriseApi.createAccount(companyId, payload);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Conta bancária criada.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Operação concluída, mas a auditoria retornou alerta.',
        });

        setAccountForm(DEFAULT_ACCOUNT_FORM);
        await load({ silent: true });

        if (response.item) {
          setSelectedAccount(response.item);
          await loadAudits(companyId, 'bank-accounts', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao criar conta bancária',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, accountCanSubmit, accountForm, load, loadAudits],
  );

  const submitTransaction = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!companyId || !transactionCanSubmit) return;

      setActionLoading('create-transaction');
      setMessage(null);

      try {
        const payload: CreateBankTransactionPayload = {
          bankAccountId: transactionForm.bankAccountId,
          type: transactionForm.type,
          amount: Number(transactionForm.amount),
          description: transactionForm.description.trim(),
          occurredAt: fromDateInput(transactionForm.occurredAt),
          metadata: {
            source: 'frontend-banking-enterprise',
          },
        };

        const response = await bankingEnterpriseApi.createTransaction(companyId, payload);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Transação criada.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Operação concluída, mas a auditoria retornou alerta.',
        });

        setTransactionForm((current) => ({
          ...DEFAULT_TRANSACTION_FORM,
          bankAccountId: current.bankAccountId,
        }));

        await load({ silent: true });

        if (response.item) {
          setSelectedTransaction(response.item);
          await loadAudits(companyId, 'bank-transactions', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao criar transação',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, transactionCanSubmit, transactionForm, load, loadAudits],
  );

  const deactivateAccount = useCallback(
    async (account: BankAccountEnterpriseRecord) => {
      if (!companyId) return;

      setActionLoading(`deactivate:${account.id}`);
      setMessage(null);

      try {
        const response = await bankingEnterpriseApi.deactivateAccount(companyId, account.id);

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
          await loadAudits(companyId, 'bank-accounts', response.item.id);
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

  const selectAccount = useCallback(
    async (account: BankAccountEnterpriseRecord) => {
      setSelectedAccount(account);
      await loadAudits(companyId, 'bank-accounts', account.id);
    },
    [companyId, loadAudits],
  );

  const selectTransaction = useCallback(
    async (transaction: BankTransactionEnterpriseRecord) => {
      setSelectedTransaction(transaction);

      if (mode === 'reconciliation') {
        await Promise.all([
          loadAudits(companyId, 'bank-reconciliation'),
          loadCandidates(companyId, transaction.id, true),
        ]);
      } else {
        await loadAudits(companyId, 'bank-transactions', transaction.id);
      }
    },
    [companyId, mode, loadAudits, loadCandidates],
  );

  const reconcileWithCandidate = useCallback(
    async (candidate: ReconciliationCandidate) => {
      if (!companyId || !selectedTransaction) return;

      setActionLoading(`reconcile:${candidate.targetId}`);
      setMessage(null);

      try {
        const response = await bankingEnterpriseApi.manualReconcile(companyId, {
          bankTransactionId: selectedTransaction.id,
          targetType: candidate.targetType,
          targetId: candidate.targetId,
          force: true,
          note: `Conciliação manual via frontend. Score=${candidate.score}`,
        });

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Conciliação realizada.',
          description: response.financialEvent?.recorded
            ? 'FinancialEvent e AuditLog registrados.'
            : 'Conciliação realizada. Verifique FinancialEvent/AuditLog.',
        });

        await load({ silent: true });

        if (response.item) {
          setSelectedTransaction(response.item);
          setCandidates([]);
          await loadAudits(companyId, 'bank-reconciliation', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha na conciliação',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, selectedTransaction, load, loadAudits],
  );

  const undoReconciliation = useCallback(
    async (transaction: BankTransactionEnterpriseRecord) => {
      if (!companyId) return;

      setActionLoading(`undo:${transaction.id}`);
      setMessage(null);

      try {
        const response = await bankingEnterpriseApi.undoReconciliation(companyId, transaction.id);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Conciliação desfeita.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Ação concluída, mas a auditoria retornou alerta.',
        });

        await load({ silent: true });

        if (response.item) {
          setSelectedTransaction(response.item);
          await loadCandidates(companyId, response.item.id, true);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao desfazer conciliação',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load, loadCandidates],
  );

  const autoReconcile = useCallback(async () => {
    if (!companyId) return;

    setActionLoading('auto-reconcile');
    setMessage(null);

    try {
      const response = await bankingEnterpriseApi.autoReconcile(companyId, {
        amountTolerance: 0.05,
        dateToleranceDays: 90,
        limit: 50,
      });

      setMessage({
        type: response.audit?.recorded ? 'success' : 'warning',
        title: response.message || 'Conciliação automática finalizada.',
        description: `Processadas: ${response.totals.processed} | Conciliadas: ${response.totals.matched} | Ignoradas: ${response.totals.skipped} | Falhas: ${response.totals.failed}`,
      });

      await load({ silent: true });
      await loadAudits(companyId, 'bank-reconciliation');
    } catch (error) {
      setMessage({
        type: 'error',
        title: 'Falha na conciliação automática',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    } finally {
      setActionLoading(null);
    }
  }, [companyId, load, loadAudits]);

  const isAccounts = mode === 'bank-accounts';
  const isTransactions = mode === 'bank-transactions';
  const isReconciliation = mode === 'reconciliation';

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <Landmark className="h-4 w-4" />
                Banking Intelligence Layer
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {isAccounts
                  ? 'Contas Bancárias'
                  : isTransactions
                    ? 'Transações Bancárias'
                    : 'Conciliação Bancária'}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {isAccounts
                  ? 'Gestão enterprise de contas bancárias, saldos e status operacional.'
                  : isTransactions
                    ? 'Registro e monitoramento de créditos, débitos e transações conciliáveis.'
                    : 'Matching assistido entre transações bancárias, notas fiscais e obrigações tributárias.'}
              </p>

              <div className="mt-3 text-xs text-slate-500">
                Empresa ativa:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {companyId || 'carregando...'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isReconciliation && (
                <Button
                  onClick={autoReconcile}
                  disabled={actionLoading === 'auto-reconcile'}
                  variant="success"
                >
                  {actionLoading === 'auto-reconcile' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Auto reconciliar
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

        <div className="grid gap-4 md:grid-cols-5">
          <KpiCard
            label="Contas"
            value={summary?.accounts.count ?? 0}
            tone="blue"
            icon={<Landmark className="h-5 w-5" />}
          />
          <KpiCard
            label="Saldo cache"
            value={formatMoney(summary?.accounts.totalBalance ?? 0)}
            tone="emerald"
            icon={<ReceiptText className="h-5 w-5" />}
          />
          <KpiCard
            label="Créditos"
            value={formatMoney(summary?.transactions.totalCredit ?? 0)}
            tone="blue"
            icon={<PlusCircle className="h-5 w-5" />}
          />
          <KpiCard
            label="Débitos"
            value={formatMoney(summary?.transactions.totalDebit ?? 0)}
            tone="purple"
            icon={<ReceiptText className="h-5 w-5" />}
          />
          <KpiCard
            label="Conciliação"
            value={`${summary?.transactions.reconciliationRate ?? 0}%`}
            tone={(summary?.transactions.reconciliationRate ?? 0) >= 80 ? 'emerald' : 'amber'}
            icon={<BadgeCheck className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
          <section className="flex flex-col gap-6">
            {isAccounts && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Criar conta bancária</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cadastre uma conta operacional para transações e conciliação.
                </p>

                <form onSubmit={submitAccount} className="mt-5 grid gap-4">
                  <div className="grid gap-4 lg:grid-cols-4">
                    <label className="grid gap-2 text-sm lg:col-span-2">
                      <span className="font-semibold text-slate-700">Banco</span>
                      <input
                        value={accountForm.bankName}
                        onChange={(event) =>
                          setAccountForm((current) => ({
                            ...current,
                            bankName: event.target.value,
                          }))
                        }
                        placeholder="Ex: Banco bCost Enterprise"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Agência</span>
                      <input
                        value={accountForm.agency}
                        onChange={(event) =>
                          setAccountForm((current) => ({
                            ...current,
                            agency: event.target.value,
                          }))
                        }
                        placeholder="0001"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Conta</span>
                      <input
                        value={accountForm.account}
                        onChange={(event) =>
                          setAccountForm((current) => ({
                            ...current,
                            account: event.target.value,
                          }))
                        }
                        placeholder="12345-6"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-4">
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Saldo cache</span>
                      <input
                        type="number"
                        step="0.01"
                        value={accountForm.balanceCache}
                        onChange={(event) =>
                          setAccountForm((current) => ({
                            ...current,
                            balanceCache: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                      />
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
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Criar conta
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {(isTransactions || isReconciliation) && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Criar transação bancária</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Registre crédito ou débito para alimentar conciliação.
                </p>

                <form onSubmit={submitTransaction} className="mt-5 grid gap-4">
                  <div className="grid gap-4 lg:grid-cols-4">
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Conta</span>
                      <select
                        value={transactionForm.bankAccountId}
                        onChange={(event) =>
                          setTransactionForm((current) => ({
                            ...current,
                            bankAccountId: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                      >
                        <option value="">Selecione...</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.bankName} — {account.agency}/{account.account}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Tipo</span>
                      <select
                        value={transactionForm.type}
                        onChange={(event) =>
                          setTransactionForm((current) => ({
                            ...current,
                            type: event.target.value as TransactionType,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                      >
                        <option value="CREDIT">CREDIT</option>
                        <option value="DEBIT">DEBIT</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Valor</span>
                      <input
                        type="number"
                        step="0.01"
                        value={transactionForm.amount}
                        onChange={(event) =>
                          setTransactionForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        placeholder="15000.00"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                      />
                    </label>

                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Data</span>
                      <input
                        type="date"
                        value={transactionForm.occurredAt}
                        onChange={(event) =>
                          setTransactionForm((current) => ({
                            ...current,
                            occurredAt: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-slate-700">Descrição</span>
                      <input
                        value={transactionForm.description}
                        onChange={(event) =>
                          setTransactionForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Ex: Recebimento cliente Empresa Teste SaaS"
                        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                      />
                    </label>

                    <div className="flex items-end">
                      <Button
                        type="submit"
                        variant="success"
                        disabled={!transactionCanSubmit || actionLoading === 'create-transaction'}
                      >
                        {actionLoading === 'create-transaction' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Criar transação
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      {isAccounts
                        ? 'Contas cadastradas'
                        : isTransactions
                          ? 'Transações bancárias'
                          : 'Fila de conciliação'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Dados operacionais com auditoria e ações enterprise.
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
                        className="w-52 rounded-2xl border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                      />
                    </div>

                    {!isAccounts && (
                      <>
                        <select
                          value={typeFilter}
                          onChange={(event) => setTypeFilter(event.target.value)}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                        >
                          <option value="ALL">Todos tipos</option>
                          <option value="CREDIT">CREDIT</option>
                          <option value="DEBIT">DEBIT</option>
                        </select>

                        <select
                          value={reconciledFilter}
                          onChange={(event) => setReconciledFilter(event.target.value)}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                        >
                          <option value="ALL">Todos status</option>
                          <option value="false">Pendentes</option>
                          <option value="true">Conciliadas</option>
                        </select>
                      </>
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
                ) : isAccounts ? (
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
                ) : transactions.length === 0 ? (
                  <EmptyState mode={mode} />
                ) : (
                  transactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      selected={selectedTransaction?.id === transaction.id}
                      actionLoading={actionLoading}
                      mode={mode}
                      onSelect={selectTransaction}
                      onUndo={undoReconciliation}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            {isReconciliation && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Candidatos de conciliação</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Matching assistido por valor, data e descrição.
                </p>

                {!selectedTransaction ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    Selecione uma transação para carregar candidatos.
                  </div>
                ) : selectedTransaction.reconciled ? (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
                    Esta transação já está conciliada.
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                    Nenhum candidato encontrado.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {candidates.map((candidate) => (
                      <div
                        key={`${candidate.targetType}:${candidate.targetId}`}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                            {candidate.targetType}
                          </span>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            Score {candidate.score}
                          </span>
                        </div>

                        <div className="mt-3 text-xs leading-5 text-slate-600">
                          {candidate.reason.map((item) => (
                            <div key={item}>• {item}</div>
                          ))}
                        </div>

                        <pre className="mt-3 max-h-44 overflow-auto rounded-xl bg-slate-900 p-3 text-xs leading-5 text-slate-100">
                          {formatJson(candidate.target)}
                        </pre>

                        <div className="mt-3">
                          <Button
                            variant="success"
                            disabled={actionLoading === `reconcile:${candidate.targetId}`}
                            onClick={() => reconcileWithCandidate(candidate)}
                          >
                            {actionLoading === `reconcile:${candidate.targetId}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <BadgeCheck className="h-4 w-4" />
                            )}
                            Conciliar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Detalhe técnico</h2>
              <p className="mt-1 text-sm text-slate-500">
                Evidência operacional para suporte e auditoria.
              </p>

              {isAccounts ? (
                !selectedAccount ? (
                  <DetailEmpty />
                ) : (
                  <DetailJson value={selectedAccount} />
                )
              ) : !selectedTransaction ? (
                <DetailEmpty />
              ) : (
                <DetailJson value={selectedTransaction} />
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
      <Landmark className="mx-auto h-10 w-10 text-slate-300" />
      <div className="mt-3 text-sm font-semibold text-slate-700">Nenhum registro encontrado.</div>
      <div className="mt-1 text-sm text-slate-500">
        {mode === 'bank-accounts'
          ? 'Cadastre a primeira conta bancária enterprise.'
          : 'Crie a primeira transação para alimentar banking e conciliação.'}
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
  account: BankAccountEnterpriseRecord;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (account: BankAccountEnterpriseRecord) => void;
  onDeactivate: (account: BankAccountEnterpriseRecord) => void;
}) {
  const busy = actionLoading?.endsWith(`:${account.id}`);

  return (
    <article className={`p-5 transition ${selected ? 'bg-emerald-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <button
          type="button"
          onClick={() => onSelect(account)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(account.status)}`}
            >
              {account.status || 'ACTIVE'}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
              {account.agency}/{account.account}
            </span>
          </div>

          <h3 className="mt-3 truncate text-base font-bold text-slate-950">{account.bankName}</h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <span>Saldo: {formatMoney(account.balanceCache)}</span>
            <span>Criada em: {formatDate(account.createdAt)}</span>
            <span>ID: {account.id}</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={busy || account.status === 'DELETED'}
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

function TransactionRow({
  transaction,
  selected,
  actionLoading,
  mode,
  onSelect,
  onUndo,
}: {
  transaction: BankTransactionEnterpriseRecord;
  selected: boolean;
  actionLoading: string | null;
  mode: WorkspaceMode;
  onSelect: (transaction: BankTransactionEnterpriseRecord) => void;
  onUndo: (transaction: BankTransactionEnterpriseRecord) => void;
}) {
  const busy = actionLoading?.endsWith(`:${transaction.id}`);

  return (
    <article className={`p-5 transition ${selected ? 'bg-emerald-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <button
          type="button"
          onClick={() => onSelect(transaction)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(transaction.type)}`}
            >
              {transaction.type}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(transaction.reconciliationStatus || String(transaction.reconciled))}`}
            >
              {transaction.reconciliationStatus ||
                (transaction.reconciled ? 'RECONCILED' : 'PENDING')}
            </span>
          </div>

          <h3 className="mt-3 truncate text-base font-bold text-slate-950">
            {transaction.description}
          </h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-4">
            <span>Valor: {formatMoney(transaction.amount)}</span>
            <span>Data: {formatDate(transaction.occurredAt)}</span>
            <span>Invoice: {transaction.invoiceId || '—'}</span>
            <span>Tax: {transaction.taxObligationId || '—'}</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          {mode === 'reconciliation' && transaction.reconciled && (
            <Button variant="warning" disabled={busy} onClick={() => onUndo(transaction)}>
              {actionLoading === `undo:${transaction.id}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              Desfazer
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

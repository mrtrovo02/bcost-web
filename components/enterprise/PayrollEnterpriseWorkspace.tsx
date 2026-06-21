'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UsersRound,
  WalletCards,
  XCircle,
} from 'lucide-react';

import {
  AuditLogRecord,
  CreateEmployeePayload,
  EmployeeEnterpriseRecord,
  EmployeeRegime,
  EmployeesListResponse,
  payrollEnterpriseApi,
  PayrollEnterpriseRecord,
  PayrollEntriesListResponse,
  PayrollEntryEnterpriseRecord,
  PayrollsListResponse,
  PayrollSummaryResponse,
} from '@/lib/api/payroll-enterprise';
import { api } from '@/services/api';

type WorkspaceMode = 'employees' | 'payrolls' | 'payroll-entries';

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

type EmployeeFormState = {
  name: string;
  cpf: string;
  pis: string;
  admissionAt: string;
  role: string;
  baseSalary: string;
  regime: EmployeeRegime;
  active: boolean;
};

type PayrollFormState = {
  month: string;
  year: string;
  force: boolean;
  createFinancialEvent: boolean;
  createAccountingEntry: boolean;
};

type EntryFormState = {
  payrollId: string;
  employeeId: string;
  baseSalary: string;
  otherBenefits: string;
  otherDeductions: string;
};

const today = new Date();
const currentMonth = String(today.getMonth() + 1);
const currentYear = String(today.getFullYear());

const DEFAULT_EMPLOYEE_FORM: EmployeeFormState = {
  name: '',
  cpf: '',
  pis: '',
  admissionAt: new Date().toISOString().slice(0, 10),
  role: '',
  baseSalary: '',
  regime: 'CLT',
  active: true,
};

const DEFAULT_PAYROLL_FORM: PayrollFormState = {
  month: currentMonth,
  year: currentYear,
  force: true,
  createFinancialEvent: true,
  createAccountingEntry: true,
};

const DEFAULT_ENTRY_FORM: EntryFormState = {
  payrollId: '',
  employeeId: '',
  baseSalary: '',
  otherBenefits: '0',
  otherDeductions: '0',
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

function toIsoDate(value: string) {
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

function moduleName(mode: WorkspaceMode) {
  if (mode === 'employees') return 'employees';
  if (mode === 'payrolls') return 'payrolls';
  return 'payroll-entries';
}

function statusClass(value?: string | boolean | null) {
  const normalized = String(value || '').toUpperCase();

  if (
    normalized === 'ACTIVE' ||
    normalized === 'TRUE' ||
    normalized === 'OK' ||
    normalized === 'CLT'
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'INACTIVE' || normalized === 'FALSE' || normalized === 'PENDING') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'DELETED' || normalized === 'FAILED') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (normalized === 'PJ') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
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

export default function PayrollEnterpriseWorkspace({ mode }: { mode: WorkspaceMode }) {
  const [companyId, setCompanyId] = useState('');
  const [summary, setSummary] = useState<PayrollSummaryResponse | null>(null);
  const [employeesPayload, setEmployeesPayload] = useState<EmployeesListResponse | null>(null);
  const [payrollsPayload, setPayrollsPayload] = useState<PayrollsListResponse | null>(null);
  const [entriesPayload, setEntriesPayload] = useState<PayrollEntriesListResponse | null>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeEnterpriseRecord | null>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollEnterpriseRecord | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntryEnterpriseRecord | null>(null);

  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(DEFAULT_EMPLOYEE_FORM);
  const [payrollForm, setPayrollForm] = useState<PayrollFormState>(DEFAULT_PAYROLL_FORM);
  const [entryForm, setEntryForm] = useState<EntryFormState>(DEFAULT_ENTRY_FORM);

  const [search, setSearch] = useState('');
  const [regimeFilter, setRegimeFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [yearFilter, setYearFilter] = useState(currentYear);

  const [audits, setAudits] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const employees = useMemo(() => employeesPayload?.items || [], [employeesPayload?.items]);
  const payrolls = useMemo(() => payrollsPayload?.items || [], [payrollsPayload?.items]);
  const entries = useMemo(() => entriesPayload?.items || [], [entriesPayload?.items]);
  const auditModule = moduleName(mode);

  const isEmployees = mode === 'employees';
  const isPayrolls = mode === 'payrolls';
  const isEntries = mode === 'payroll-entries';

  const employeeCanSubmit = useMemo(() => {
    return Boolean(
      employeeForm.name &&
      employeeForm.cpf &&
      employeeForm.admissionAt &&
      employeeForm.role &&
      employeeForm.baseSalary &&
      Number(employeeForm.baseSalary) > 0,
    );
  }, [employeeForm]);

  const entryCanSubmit = useMemo(() => {
    return Boolean(entryForm.payrollId && entryForm.employeeId);
  }, [entryForm]);

  const loadAudits = useCallback(
    async (
      companyIdOverride?: string,
      moduleOverride?: 'employees' | 'payrolls' | 'payroll-entries',
      entityId?: string,
    ) => {
      const effectiveCompanyId = companyIdOverride || companyId;
      const effectiveModule = moduleOverride || auditModule;

      if (!effectiveCompanyId) {
        setAudits([]);
        return;
      }

      try {
        const response = await payrollEnterpriseApi.audit(effectiveCompanyId, effectiveModule, {
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

        const [summaryResponse, employeesResponse, payrollsResponse, entriesResponse] =
          await Promise.all([
            payrollEnterpriseApi.summary(resolvedCompanyId),
            payrollEnterpriseApi.listEmployees(resolvedCompanyId, {
              limit: 100,
              search: isEmployees ? search : undefined,
              regime: regimeFilter,
              active: activeFilter,
            }),
            payrollEnterpriseApi.listPayrolls(resolvedCompanyId, {
              limit: 100,
              month: isPayrolls ? monthFilter : undefined,
              year: isPayrolls ? yearFilter : undefined,
            }),
            payrollEnterpriseApi.listPayrollEntries(resolvedCompanyId, {
              limit: 100,
              search: isEntries ? search : undefined,
              month: isEntries ? monthFilter : undefined,
              year: isEntries ? yearFilter : undefined,
            }),
          ]);

        setSummary(summaryResponse);
        setEmployeesPayload(employeesResponse);
        setPayrollsPayload(payrollsResponse);
        setEntriesPayload(entriesResponse);

        if (!entryForm.employeeId && employeesResponse.items[0]?.id) {
          setEntryForm((current) => ({
            ...current,
            employeeId: employeesResponse.items[0].id,
          }));
        }

        if (!entryForm.payrollId && payrollsResponse.items[0]?.id) {
          setEntryForm((current) => ({
            ...current,
            payrollId: payrollsResponse.items[0].id,
          }));
        }

        const nextEmployee =
          employeesResponse.items.find((item) => item.id === selectedEmployee?.id) ||
          employeesResponse.items[0] ||
          null;

        const nextPayroll =
          payrollsResponse.items.find((item) => item.id === selectedPayroll?.id) ||
          payrollsResponse.items[0] ||
          null;

        const nextEntry =
          entriesResponse.items.find((item) => item.id === selectedEntry?.id) ||
          entriesResponse.items[0] ||
          null;

        setSelectedEmployee(nextEmployee);
        setSelectedPayroll(nextPayroll);
        setSelectedEntry(nextEntry);

        if (mode === 'employees') {
          await loadAudits(resolvedCompanyId, 'employees', nextEmployee?.id);
        }

        if (mode === 'payrolls') {
          await loadAudits(resolvedCompanyId, 'payrolls', nextPayroll?.id);
        }

        if (mode === 'payroll-entries') {
          await loadAudits(resolvedCompanyId, 'payroll-entries', nextEntry?.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao carregar Payroll Enterprise',
          description:
            error instanceof Error ? error.message : 'Não foi possível carregar dados de folha.',
        });
      } finally {
        setLoading(false);
      }
    },
    [
      companyId,
      mode,
      search,
      regimeFilter,
      activeFilter,
      monthFilter,
      yearFilter,
      isEmployees,
      isPayrolls,
      isEntries,
      selectedEmployee?.id,
      selectedPayroll?.id,
      selectedEntry?.id,
      entryForm.employeeId,
      entryForm.payrollId,
      loadAudits,
    ],
  );

  useEffect(() => {
    load();
  }, [load]);

  const submitEmployee = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!companyId || !employeeCanSubmit) return;

      setActionLoading('create-employee');
      setMessage(null);

      try {
        const payload: CreateEmployeePayload = {
          name: employeeForm.name.trim(),
          cpf: employeeForm.cpf.trim(),
          pis: employeeForm.pis.trim() || undefined,
          admissionAt: toIsoDate(employeeForm.admissionAt),
          role: employeeForm.role.trim(),
          baseSalary: Number(employeeForm.baseSalary),
          active: employeeForm.active,
          regime: employeeForm.regime,
        };

        const response = await payrollEnterpriseApi.createEmployee(companyId, payload);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Colaborador criado.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Operação concluída, mas a auditoria retornou alerta.',
        });

        setEmployeeForm(DEFAULT_EMPLOYEE_FORM);
        await load({ silent: true });

        if (response.item) {
          setSelectedEmployee(response.item);
          await loadAudits(companyId, 'employees', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao criar colaborador',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, employeeCanSubmit, employeeForm, load, loadAudits],
  );

  const deactivateEmployee = useCallback(
    async (employee: EmployeeEnterpriseRecord) => {
      if (!companyId) return;

      setActionLoading(`deactivate:${employee.id}`);
      setMessage(null);

      try {
        const response = await payrollEnterpriseApi.deactivateEmployee(companyId, employee.id);

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Colaborador desativado.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Operação concluída, mas a auditoria retornou alerta.',
        });

        await load({ silent: true });

        if (response.item) {
          setSelectedEmployee(response.item);
          await loadAudits(companyId, 'employees', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao desativar colaborador',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load, loadAudits],
  );

  const generatePayroll = useCallback(async () => {
    if (!companyId) return;

    setActionLoading('generate-payroll');
    setMessage(null);

    try {
      const response = await payrollEnterpriseApi.generatePayroll(companyId, {
        month: Number(payrollForm.month),
        year: Number(payrollForm.year),
        force: payrollForm.force,
        createFinancialEvent: payrollForm.createFinancialEvent,
        createAccountingEntry: payrollForm.createAccountingEntry,
      });

      setMessage({
        type: response.audit?.recorded ? 'success' : 'warning',
        title: response.message || 'Folha gerada.',
        description: `Funcionários: ${response.totals?.employees ?? 0} | Eventos: ${response.totals?.entries ?? 0} | Total: ${formatMoney(
          Number(response.totals?.totalAmount || 0),
        )}`,
      });

      await load({ silent: true });

      if (response.item) {
        setSelectedPayroll(response.item);
        await loadAudits(companyId, 'payrolls', response.item.id);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        title: 'Falha ao gerar folha',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    } finally {
      setActionLoading(null);
    }
  }, [companyId, payrollForm, load, loadAudits]);

  const submitEntry = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!companyId || !entryCanSubmit) return;

      setActionLoading('create-entry');
      setMessage(null);

      try {
        const employee = employees.find((item) => item.id === entryForm.employeeId);

        const response = await payrollEnterpriseApi.createPayrollEntry(companyId, {
          payrollId: entryForm.payrollId,
          employeeId: entryForm.employeeId,
          baseSalary: entryForm.baseSalary ? Number(entryForm.baseSalary) : employee?.baseSalary,
          otherBenefits: Number(entryForm.otherBenefits || 0),
          otherDeductions: Number(entryForm.otherDeductions || 0),
        });

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Evento de folha criado.',
          description: response.audit?.recorded
            ? 'Evento registrado em AuditLog.'
            : 'Operação concluída, mas a auditoria retornou alerta.',
        });

        setEntryForm((current) => ({
          ...DEFAULT_ENTRY_FORM,
          payrollId: current.payrollId,
          employeeId: current.employeeId,
        }));

        await load({ silent: true });

        if (response.item) {
          setSelectedEntry(response.item);
          await loadAudits(companyId, 'payroll-entries', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao criar evento de folha',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, entryCanSubmit, entryForm, employees, load, loadAudits],
  );

  const updateEntry = useCallback(
    async (entry: PayrollEntryEnterpriseRecord) => {
      if (!companyId) return;

      const benefits = window.prompt(
        'Informe outros benefícios:',
        String(entry.otherBenefits ?? 0),
      );

      if (benefits === null) return;

      const deductions = window.prompt(
        'Informe outros descontos:',
        String(entry.otherDeductions ?? 0),
      );

      if (deductions === null) return;

      setActionLoading(`update-entry:${entry.id}`);
      setMessage(null);

      try {
        const response = await payrollEnterpriseApi.updatePayrollEntry(companyId, entry.id, {
          otherBenefits: Number(benefits || 0),
          otherDeductions: Number(deductions || 0),
        });

        setMessage({
          type: response.audit?.recorded ? 'success' : 'warning',
          title: response.message || 'Evento de folha atualizado.',
          description: response.payroll
            ? `Novo total da folha: ${formatMoney(response.payroll.totalAmount)}`
            : 'Evento atualizado.',
        });

        await load({ silent: true });

        if (response.item) {
          setSelectedEntry(response.item);
          await loadAudits(companyId, 'payroll-entries', response.item.id);
        }
      } catch (error) {
        setMessage({
          type: 'error',
          title: 'Falha ao atualizar evento de folha',
          description: error instanceof Error ? error.message : 'Erro inesperado.',
        });
      } finally {
        setActionLoading(null);
      }
    },
    [companyId, load, loadAudits],
  );

  const selectEmployee = useCallback(
    async (employee: EmployeeEnterpriseRecord) => {
      setSelectedEmployee(employee);
      await loadAudits(companyId, 'employees', employee.id);
    },
    [companyId, loadAudits],
  );

  const selectPayroll = useCallback(
    async (payroll: PayrollEnterpriseRecord) => {
      setSelectedPayroll(payroll);
      await loadAudits(companyId, 'payrolls', payroll.id);
    },
    [companyId, loadAudits],
  );

  const selectEntry = useCallback(
    async (entry: PayrollEntryEnterpriseRecord) => {
      setSelectedEntry(entry);
      await loadAudits(companyId, 'payroll-entries', entry.id);
    },
    [companyId, loadAudits],
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <UsersRound className="h-4 w-4" />
                Payroll Intelligence Layer
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {isEmployees
                  ? 'Colaboradores'
                  : isPayrolls
                    ? 'Folhas de Pagamento'
                    : 'Eventos de Folha'}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {isEmployees
                  ? 'Gestão enterprise de colaboradores, vínculos, regimes e salários base.'
                  : isPayrolls
                    ? 'Geração de folha por competência com FinancialEvent e AccountingEntry automáticos.'
                    : 'Controle de INSS, FGTS, IRRF, benefícios, descontos e salário líquido por colaborador.'}
              </p>

              <div className="mt-3 text-xs text-slate-500">
                Empresa ativa:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {companyId || 'carregando...'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isPayrolls && (
                <Button
                  onClick={generatePayroll}
                  disabled={actionLoading === 'generate-payroll'}
                  variant="success"
                >
                  {actionLoading === 'generate-payroll' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4" />
                  )}
                  Gerar folha
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
            label="Colaboradores"
            value={summary?.employees.count ?? 0}
            tone="blue"
            icon={<UsersRound className="h-5 w-5" />}
          />
          <KpiCard
            label="Ativos"
            value={summary?.employees.active ?? 0}
            tone="emerald"
            icon={<BadgeCheck className="h-5 w-5" />}
          />
          <KpiCard
            label="Salário base"
            value={formatMoney(summary?.entries.baseSalary ?? 0)}
            tone="slate"
            icon={<WalletCards className="h-5 w-5" />}
          />
          <KpiCard
            label="Salário líquido"
            value={formatMoney(summary?.entries.netSalary ?? 0)}
            tone="purple"
            icon={<FileSpreadsheet className="h-5 w-5" />}
          />
          <KpiCard
            label="Custo empregador"
            value={formatMoney(summary?.entries.employerCost ?? 0)}
            tone="amber"
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
          <section className="flex flex-col gap-6">
            {isEmployees && (
              <EmployeeForm
                form={employeeForm}
                setForm={setEmployeeForm}
                canSubmit={employeeCanSubmit}
                loading={actionLoading === 'create-employee'}
                onSubmit={submitEmployee}
              />
            )}

            {isPayrolls && (
              <PayrollGeneratePanel
                form={payrollForm}
                setForm={setPayrollForm}
                loading={actionLoading === 'generate-payroll'}
                onGenerate={generatePayroll}
              />
            )}

            {isEntries && (
              <EntryForm
                form={entryForm}
                setForm={setEntryForm}
                employees={employees}
                payrolls={payrolls}
                canSubmit={entryCanSubmit}
                loading={actionLoading === 'create-entry'}
                onSubmit={submitEntry}
              />
            )}

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      {isEmployees
                        ? 'Colaboradores cadastrados'
                        : isPayrolls
                          ? 'Folhas geradas'
                          : 'Eventos de folha'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Dados operacionais com auditoria e visão executiva.
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

                    {isEmployees && (
                      <>
                        <select
                          value={regimeFilter}
                          onChange={(event) => setRegimeFilter(event.target.value)}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                        >
                          <option value="ALL">Todos regimes</option>
                          <option value="CLT">CLT</option>
                          <option value="PJ">PJ</option>
                          <option value="ESTAGIO">ESTAGIO</option>
                          <option value="AUTONOMO">AUTONOMO</option>
                          <option value="SOCIO_ADMINISTRADOR">SOCIO_ADMINISTRADOR</option>
                        </select>

                        <select
                          value={activeFilter}
                          onChange={(event) => setActiveFilter(event.target.value)}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                        >
                          <option value="ALL">Todos status</option>
                          <option value="true">Ativos</option>
                          <option value="false">Inativos</option>
                        </select>
                      </>
                    )}

                    {(isPayrolls || isEntries) && (
                      <>
                        <select
                          value={monthFilter}
                          onChange={(event) => setMonthFilter(event.target.value)}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                        >
                          {Array.from({ length: 12 }).map((_, index) => (
                            <option key={index + 1} value={String(index + 1)}>
                              {String(index + 1).padStart(2, '0')}
                            </option>
                          ))}
                        </select>

                        <input
                          value={yearFilter}
                          onChange={(event) => setYearFilter(event.target.value)}
                          className="w-24 rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
                        />
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
                ) : isEmployees ? (
                  employees.length === 0 ? (
                    <EmptyState mode={mode} />
                  ) : (
                    employees.map((employee) => (
                      <EmployeeRow
                        key={employee.id}
                        employee={employee}
                        selected={selectedEmployee?.id === employee.id}
                        actionLoading={actionLoading}
                        onSelect={selectEmployee}
                        onDeactivate={deactivateEmployee}
                      />
                    ))
                  )
                ) : isPayrolls ? (
                  payrolls.length === 0 ? (
                    <EmptyState mode={mode} />
                  ) : (
                    payrolls.map((payroll) => (
                      <PayrollRow
                        key={payroll.id}
                        payroll={payroll}
                        selected={selectedPayroll?.id === payroll.id}
                        onSelect={selectPayroll}
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
                      onUpdate={updateEntry}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Detalhe técnico</h2>
              <p className="mt-1 text-sm text-slate-500">
                Evidência operacional para suporte e auditoria.
              </p>

              {isEmployees ? (
                selectedEmployee ? (
                  <DetailJson value={selectedEmployee} />
                ) : (
                  <DetailEmpty />
                )
              ) : isPayrolls ? (
                selectedPayroll ? (
                  <DetailJson value={selectedPayroll} />
                ) : (
                  <DetailEmpty />
                )
              ) : selectedEntry ? (
                <DetailJson value={selectedEntry} />
              ) : (
                <DetailEmpty />
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

function EmployeeForm({
  form,
  setForm,
  canSubmit,
  loading,
  onSubmit,
}: {
  form: EmployeeFormState;
  setForm: React.Dispatch<React.SetStateAction<EmployeeFormState>>;
  canSubmit: boolean;
  loading: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Cadastrar colaborador</h2>
      <p className="mt-1 text-sm text-slate-500">
        Cadastro operacional compatível com o schema atual.
      </p>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <Field
            label="Nome"
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="Colaborador bCost"
            span={2}
          />
          <Field
            label="CPF"
            value={form.cpf}
            onChange={(value) => setForm((current) => ({ ...current, cpf: value }))}
            placeholder="99999999999"
          />
          <Field
            label="PIS"
            value={form.pis}
            onChange={(value) => setForm((current) => ({ ...current, pis: value }))}
            placeholder="Opcional"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Field
            label="Cargo"
            value={form.role}
            onChange={(value) => setForm((current) => ({ ...current, role: value }))}
            placeholder="Analista Fiscal"
            span={2}
          />

          <Field
            label="Salário base"
            value={form.baseSalary}
            onChange={(value) => setForm((current) => ({ ...current, baseSalary: value }))}
            type="number"
            step="0.01"
          />

          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-700">Regime</span>
            <select
              value={form.regime}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  regime: event.target.value as EmployeeRegime,
                }))
              }
              className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
            >
              <option value="CLT">CLT</option>
              <option value="PJ">PJ</option>
              <option value="ESTAGIO">ESTAGIO</option>
              <option value="AUTONOMO">AUTONOMO</option>
              <option value="SOCIO_ADMINISTRADOR">SOCIO_ADMINISTRADOR</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-700">Admissão</span>
            <input
              type="date"
              value={form.admissionAt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  admissionAt: event.target.value,
                }))
              }
              className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  active: event.target.checked,
                }))
              }
            />
            Colaborador ativo
          </label>

          <Button type="submit" variant="success" disabled={!canSubmit || loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Cadastrar
          </Button>
        </div>
      </form>
    </div>
  );
}

function PayrollGeneratePanel({
  form,
  setForm,
  loading,
  onGenerate,
}: {
  form: PayrollFormState;
  setForm: React.Dispatch<React.SetStateAction<PayrollFormState>>;
  loading: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Gerar folha</h2>
      <p className="mt-1 text-sm text-slate-500">
        Gera folha da competência com eventos por colaborador e integrações opcionais.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-700">Mês</span>
          <select
            value={form.month}
            onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))}
            className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
          >
            {Array.from({ length: 12 }).map((_, index) => (
              <option key={index + 1} value={String(index + 1)}>
                {String(index + 1).padStart(2, '0')}
              </option>
            ))}
          </select>
        </label>

        <Field
          label="Ano"
          value={form.year}
          onChange={(value) => setForm((current) => ({ ...current, year: value }))}
        />

        <label className="inline-flex items-center gap-2 pt-8 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.force}
            onChange={(event) =>
              setForm((current) => ({ ...current, force: event.target.checked }))
            }
          />
          Force
        </label>

        <label className="inline-flex items-center gap-2 pt-8 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.createFinancialEvent}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                createFinancialEvent: event.target.checked,
              }))
            }
          />
          FinancialEvent
        </label>

        <label className="inline-flex items-center gap-2 pt-8 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.createAccountingEntry}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                createAccountingEntry: event.target.checked,
              }))
            }
          />
          AccountingEntry
        </label>
      </div>

      <div className="mt-4">
        <Button variant="success" disabled={loading} onClick={onGenerate}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4" />
          )}
          Gerar folha
        </Button>
      </div>
    </div>
  );
}

function EntryForm({
  form,
  setForm,
  employees,
  payrolls,
  canSubmit,
  loading,
  onSubmit,
}: {
  form: EntryFormState;
  setForm: React.Dispatch<React.SetStateAction<EntryFormState>>;
  employees: EmployeeEnterpriseRecord[];
  payrolls: PayrollEnterpriseRecord[];
  canSubmit: boolean;
  loading: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Criar evento de folha</h2>
      <p className="mt-1 text-sm text-slate-500">
        Use para adicionar evento manual quando necessário.
      </p>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-5">
          <label className="grid gap-2 text-sm lg:col-span-2">
            <span className="font-semibold text-slate-700">Folha</span>
            <select
              value={form.payrollId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  payrollId: event.target.value,
                }))
              }
              className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
            >
              <option value="">Selecione...</option>
              {payrolls.map((payroll) => (
                <option key={payroll.id} value={payroll.id}>
                  {payroll.periodLabel || `${payroll.month}/${payroll.year}`} —{' '}
                  {formatMoney(payroll.totalAmount)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm lg:col-span-3">
            <span className="font-semibold text-slate-700">Colaborador</span>
            <select
              value={form.employeeId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  employeeId: event.target.value,
                }))
              }
              className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
            >
              <option value="">Selecione...</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} — {employee.role} — {formatMoney(employee.baseSalary)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <Field
            label="Salário base opcional"
            value={form.baseSalary}
            onChange={(value) => setForm((current) => ({ ...current, baseSalary: value }))}
            type="number"
            step="0.01"
          />
          <Field
            label="Benefícios"
            value={form.otherBenefits}
            onChange={(value) => setForm((current) => ({ ...current, otherBenefits: value }))}
            type="number"
            step="0.01"
          />
          <Field
            label="Descontos"
            value={form.otherDeductions}
            onChange={(value) => setForm((current) => ({ ...current, otherDeductions: value }))}
            type="number"
            step="0.01"
          />

          <div className="flex items-end">
            <Button type="submit" variant="success" disabled={!canSubmit || loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Criar evento
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  step,
  span,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
  span?: number;
}) {
  return (
    <label className={`grid gap-2 text-sm ${span === 2 ? 'lg:col-span-2' : ''}`}>
      <span className="font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-emerald-100 transition focus:border-emerald-400 focus:ring-4"
      />
    </label>
  );
}

function EmptyState({ mode }: { mode: WorkspaceMode }) {
  return (
    <div className="p-10 text-center">
      <UsersRound className="mx-auto h-10 w-10 text-slate-300" />
      <div className="mt-3 text-sm font-semibold text-slate-700">Nenhum registro encontrado.</div>
      <div className="mt-1 text-sm text-slate-500">
        {mode === 'employees'
          ? 'Cadastre o primeiro colaborador enterprise.'
          : mode === 'payrolls'
            ? 'Gere a primeira folha da competência.'
            : 'Nenhum evento de folha encontrado.'}
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

function EmployeeRow({
  employee,
  selected,
  actionLoading,
  onSelect,
  onDeactivate,
}: {
  employee: EmployeeEnterpriseRecord;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (employee: EmployeeEnterpriseRecord) => void;
  onDeactivate: (employee: EmployeeEnterpriseRecord) => void;
}) {
  const busy = actionLoading === `deactivate:${employee.id}`;

  return (
    <article className={`p-5 transition ${selected ? 'bg-emerald-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <button
          type="button"
          onClick={() => onSelect(employee)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(employee.operationalStatus || String(employee.active))}`}
            >
              {employee.operationalStatus || (employee.active ? 'ACTIVE' : 'INACTIVE')}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(employee.regime)}`}
            >
              {employee.regime}
            </span>
          </div>

          <h3 className="mt-3 truncate text-base font-bold text-slate-950">{employee.name}</h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-4">
            <span>Cargo: {employee.role}</span>
            <span>CPF: {employee.cpf}</span>
            <span>Salário: {formatMoney(employee.baseSalary)}</span>
            <span>Admissão: {formatDate(employee.admissionAt)}</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={busy || !employee.active}
            onClick={() => onDeactivate(employee)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Desativar
          </Button>
        </div>
      </div>
    </article>
  );
}

function PayrollRow({
  payroll,
  selected,
  onSelect,
}: {
  payroll: PayrollEnterpriseRecord;
  selected: boolean;
  onSelect: (payroll: PayrollEnterpriseRecord) => void;
}) {
  return (
    <article className={`p-5 transition ${selected ? 'bg-emerald-50/50' : 'bg-white'}`}>
      <button type="button" onClick={() => onSelect(payroll)} className="w-full min-w-0 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            {payroll.periodLabel || `${payroll.month}/${payroll.year}`}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            {formatMoney(payroll.totalAmount)}
          </span>
        </div>

        <h3 className="mt-3 truncate text-base font-bold text-slate-950">
          Folha {payroll.periodLabel || `${payroll.month}/${payroll.year}`}
        </h3>

        <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-4">
          <span>Salários: {formatMoney(payroll.salariesAmount)}</span>
          <span>Pró-labore: {formatMoney(payroll.proLaboreAmount)}</span>
          <span>Total: {formatMoney(payroll.totalAmount)}</span>
          <span>Criada em: {formatDate(payroll.createdAt)}</span>
        </div>
      </button>
    </article>
  );
}

function EntryRow({
  entry,
  selected,
  actionLoading,
  onSelect,
  onUpdate,
}: {
  entry: PayrollEntryEnterpriseRecord;
  selected: boolean;
  actionLoading: string | null;
  onSelect: (entry: PayrollEntryEnterpriseRecord) => void;
  onUpdate: (entry: PayrollEntryEnterpriseRecord) => void;
}) {
  const busy = actionLoading === `update-entry:${entry.id}`;

  return (
    <article className={`p-5 transition ${selected ? 'bg-emerald-50/50' : 'bg-white'}`}>
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <button type="button" onClick={() => onSelect(entry)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
              {entry.employee?.name || entry.employeeId}
            </span>
            <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
              Líquido {formatMoney(entry.netSalary)}
            </span>
          </div>

          <h3 className="mt-3 truncate text-base font-bold text-slate-950">
            {entry.employee?.role || 'Evento de folha'}
          </h3>

          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-4">
            <span>Base: {formatMoney(entry.baseSalary)}</span>
            <span>INSS: {formatMoney(entry.inssEmployee)}</span>
            <span>FGTS: {formatMoney(entry.fgts)}</span>
            <span>IRRF: {formatMoney(entry.irrf)}</span>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => onUpdate(entry)}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <WalletCards className="h-4 w-4" />
            )}
            Editar valores
          </Button>
        </div>
      </div>
    </article>
  );
}

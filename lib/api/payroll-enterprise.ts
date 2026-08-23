'use strict';

import { api, isDemoSession } from '@/services/api';

export type EmployeeRegime = 'CLT' | 'PJ' | 'ESTAGIO' | 'AUTONOMO' | 'SOCIO_ADMINISTRADOR';

export type EmployeeEnterpriseRecord = {
  id: string;
  companyId: string;
  name: string;
  cpf: string;
  pis?: string | null;
  admissionAt: string;
  dismissalAt?: string | null;
  role: string;
  baseSalary: number;
  active: boolean;
  regime: EmployeeRegime;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  operationalStatus?: 'ACTIVE' | 'INACTIVE' | 'DELETED' | string;
  [key: string]: unknown;
};

export type PayrollEnterpriseRecord = {
  id: string;
  companyId: string;
  month: number;
  year: number;
  salariesAmount: number;
  proLaboreAmount: number;
  totalAmount: number;
  createdAt?: string | null;
  periodLabel?: string;
  entries?: PayrollEntryEnterpriseRecord[];
  [key: string]: unknown;
};

export type PayrollEntryEnterpriseRecord = {
  id: string;
  payrollId: string;
  employeeId: string;
  baseSalary: number;
  inssEmployee: number;
  inssEmployer: number;
  irrf: number;
  fgts: number;
  otherBenefits: number;
  otherDeductions: number;
  netSalary: number;
  createdAt?: string | null;
  employee?: EmployeeEnterpriseRecord;
  payroll?: PayrollEnterpriseRecord;
  [key: string]: unknown;
};

export type EmployeesSummary = {
  count: number;
  active: number;
  inactive: number;
  deleted: number;
  totalBaseSalary: number;
  averageBaseSalary: number;
  byRegime: Record<string, number>;
  byRole: Record<string, number>;
};

export type PayrollsSummary = {
  count: number;
  salariesAmount: number;
  proLaboreAmount: number;
  totalAmount: number;
  byPeriod: Record<string, number>;
};

export type PayrollEntriesSummary = {
  count: number;
  baseSalary: number;
  inssEmployee: number;
  inssEmployer: number;
  irrf: number;
  fgts: number;
  otherBenefits: number;
  otherDeductions: number;
  netSalary: number;
  employerCost: number;
  byRegime: Record<string, number>;
};

export type PayrollSummaryResponse = {
  status: string;
  module: 'payroll-enterprise-summary';
  companyId: string;
  employees: EmployeesSummary;
  payrolls: PayrollsSummary;
  entries: PayrollEntriesSummary;
  generatedAt: string;
};

export type EmployeesListResponse = {
  status: string;
  module: 'employees';
  model: 'Employee';
  companyId: string;
  items: EmployeeEnterpriseRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: EmployeesSummary;
  generatedAt: string;
};

export type PayrollsListResponse = {
  status: string;
  module: 'payrolls';
  model: 'Payroll';
  companyId: string;
  items: PayrollEnterpriseRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: PayrollsSummary;
  generatedAt: string;
};

export type PayrollEntriesListResponse = {
  status: string;
  module: 'payroll-entries';
  model: 'PayrollEntry';
  companyId: string;
  items: PayrollEntryEnterpriseRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: PayrollEntriesSummary;
  generatedAt: string;
};

export type CreateEmployeePayload = {
  name: string;
  cpf: string;
  pis?: string;
  admissionAt: string;
  dismissalAt?: string;
  role: string;
  baseSalary: number;
  active?: boolean;
  regime?: EmployeeRegime;
};

export type UpdateEmployeePayload = Partial<CreateEmployeePayload>;

export type CreatePayrollPayload = {
  month: number;
  year: number;
  salariesAmount?: number;
  proLaboreAmount?: number;
  totalAmount?: number;
};

export type GeneratePayrollPayload = {
  month: number;
  year: number;
  force?: boolean;
  createFinancialEvent?: boolean;
  createAccountingEntry?: boolean;
};

export type CreatePayrollEntryPayload = {
  payrollId: string;
  employeeId: string;
  baseSalary?: number;
  inssEmployee?: number;
  inssEmployer?: number;
  irrf?: number;
  fgts?: number;
  otherBenefits?: number;
  otherDeductions?: number;
  netSalary?: number;
};

export type UpdatePayrollEntryPayload = Partial<
  Omit<CreatePayrollEntryPayload, 'payrollId' | 'employeeId'>
>;

export type PayrollActionResponse<T> = {
  status: string;
  message: string;
  companyId: string;
  item?: T;
  payroll?: PayrollEnterpriseRecord;
  entries?: PayrollEntryEnterpriseRecord[];
  totals?: Record<string, unknown>;
  financialEvent?: {
    recorded: boolean;
    event?: Record<string, unknown>;
    error?: string;
    skipped?: boolean;
  };
  accountingEntry?: {
    recorded: boolean;
    entry?: Record<string, unknown>;
    error?: string;
    skipped?: boolean;
  };
  audit?: {
    recorded: boolean;
    error?: string;
  };
  generatedAt: string;
};

export type PayrollQuery = {
  limit?: number;
  offset?: number;
  search?: string;
  regime?: string;
  active?: string;
  employeeId?: string;
  payrollId?: string;
  from?: string;
  to?: string;
  month?: number | string;
  year?: number | string;
};

export type AuditLogRecord = {
  id: string;
  companyId: string;
  userId?: string | null;
  module?: string | null;
  action?: string | null;
  entity?: string | null;
  entityId?: string | null;
  payload?: unknown;
  createdAt?: string | null;
  [key: string]: unknown;
};

export type AuditLogListResponse = {
  items: AuditLogRecord[];
  total: number;
  limit: number;
  offset: number;
  generatedAt: string;
};

function buildQuery(params?: Record<string, unknown>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '' || value === 'ALL') {
      continue;
    }

    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

type DemoPayrollStore = {
  employees: EmployeeEnterpriseRecord[];
  payrolls: PayrollEnterpriseRecord[];
  entries: PayrollEntryEnterpriseRecord[];
  audits: AuditLogRecord[];
};

const DEMO_STORE_VERSION = 'v1';

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

function isDemoCompany(companyId: string): boolean {
  return companyId.toLowerCase().startsWith('demo-') || isDemoSession();
}

function roundMoney(value: number): number {
  return Number(Number(value || 0).toFixed(2));
}

function currentIso(): string {
  return new Date().toISOString();
}

function calculateEntryAmounts(baseSalary: number, benefits = 0, deductions = 0) {
  const inssEmployee = roundMoney(Math.min(baseSalary * 0.11, 908.85));
  const inssEmployer = roundMoney(baseSalary * 0.2);
  const irrf = roundMoney(Math.max(baseSalary - inssEmployee - 2259.2, 0) * 0.15);
  const fgts = roundMoney(baseSalary * 0.08);
  const netSalary = roundMoney(baseSalary + benefits - deductions - inssEmployee - irrf);

  return {
    inssEmployee,
    inssEmployer,
    irrf,
    fgts,
    netSalary,
  };
}

function makeDemoEmployees(companyId: string): EmployeeEnterpriseRecord[] {
  return [
    {
      id: 'demo-employee-001',
      companyId,
      name: 'Amanda Martins',
      cpf: '123.456.789-09',
      pis: '123.45678.90-1',
      admissionAt: '2025-01-06T00:00:00.000Z',
      role: 'Contadora responsavel',
      baseSalary: 8200,
      active: true,
      regime: 'CLT',
      operationalStatus: 'ACTIVE',
      createdAt: '2025-01-06T12:00:00.000Z',
    },
    {
      id: 'demo-employee-002',
      companyId,
      name: 'Bruno Oliveira',
      cpf: '987.654.321-00',
      pis: '987.65432.10-9',
      admissionAt: '2025-03-10T00:00:00.000Z',
      role: 'Analista fiscal',
      baseSalary: 5400,
      active: true,
      regime: 'CLT',
      operationalStatus: 'ACTIVE',
      createdAt: '2025-03-10T12:00:00.000Z',
    },
    {
      id: 'demo-employee-003',
      companyId,
      name: 'Carla Nascimento',
      cpf: '456.789.123-88',
      admissionAt: '2024-11-04T00:00:00.000Z',
      role: 'Socio administrador',
      baseSalary: 12000,
      active: true,
      regime: 'SOCIO_ADMINISTRADOR',
      operationalStatus: 'ACTIVE',
      createdAt: '2024-11-04T12:00:00.000Z',
    },
  ];
}

function makeDemoStore(companyId: string): DemoPayrollStore {
  const employees = makeDemoEmployees(companyId);
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const payroll: PayrollEnterpriseRecord = {
    id: 'demo-payroll-current',
    companyId,
    month,
    year,
    salariesAmount: roundMoney(
      employees
        .filter((item) => item.regime === 'CLT')
        .reduce((sum, item) => sum + item.baseSalary, 0),
    ),
    proLaboreAmount: roundMoney(
      employees
        .filter((item) => item.regime === 'SOCIO_ADMINISTRADOR')
        .reduce((sum, item) => sum + item.baseSalary, 0),
    ),
    totalAmount: roundMoney(employees.reduce((sum, item) => sum + item.baseSalary, 0)),
    periodLabel: `${String(month).padStart(2, '0')}/${year}`,
    createdAt: currentIso(),
  };

  const entries = employees.map((employee, index) => {
    const amounts = calculateEntryAmounts(employee.baseSalary);
    return {
      id: `demo-payroll-entry-${String(index + 1).padStart(3, '0')}`,
      payrollId: payroll.id,
      employeeId: employee.id,
      baseSalary: employee.baseSalary,
      otherBenefits: 0,
      otherDeductions: 0,
      ...amounts,
      employee,
      payroll,
      createdAt: currentIso(),
    };
  });

  return {
    employees,
    payrolls: [{ ...payroll, entries }],
    entries,
    audits: [
      {
        id: 'demo-audit-payroll-001',
        companyId,
        module: 'payrolls',
        action: 'DEMO_PAYROLL_READY',
        entity: 'Payroll',
        entityId: payroll.id,
        payload: { source: 'demo-store', mode: 'DEMO_OPERATIONAL' },
        createdAt: currentIso(),
      },
    ],
  };
}

function demoStoreKey(companyId: string): string {
  return `bcost:${DEMO_STORE_VERSION}:payroll-enterprise:${companyId}`;
}

function readDemoStore(companyId: string): DemoPayrollStore {
  if (!isBrowserRuntime()) return makeDemoStore(companyId);

  try {
    const raw = window.localStorage.getItem(demoStoreKey(companyId));
    if (raw) return JSON.parse(raw) as DemoPayrollStore;
  } catch {
    window.localStorage.removeItem(demoStoreKey(companyId));
  }

  const seeded = makeDemoStore(companyId);
  writeDemoStore(companyId, seeded);
  return seeded;
}

function writeDemoStore(companyId: string, store: DemoPayrollStore): void {
  if (!isBrowserRuntime()) return;
  window.localStorage.setItem(demoStoreKey(companyId), JSON.stringify(store));
}

function appendAudit(
  store: DemoPayrollStore,
  companyId: string,
  module: 'employees' | 'payrolls' | 'payroll-entries',
  action: string,
  entity: string,
  entityId?: string,
): void {
  store.audits.unshift({
    id: `demo-audit-${Date.now()}`,
    companyId,
    module,
    action,
    entity,
    entityId,
    payload: { source: 'demo-store', mode: 'DEMO_OPERATIONAL' },
    createdAt: currentIso(),
  });
}

function paginate<T>(items: T[], params: PayrollQuery): T[] {
  const offset = Number(params.offset || 0);
  const limit = Number(params.limit || 100);
  return items.slice(offset, offset + limit);
}

function employeesSummary(items: EmployeeEnterpriseRecord[]): EmployeesSummary {
  const byRegime: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  let active = 0;
  let inactive = 0;
  let deleted = 0;
  let totalBaseSalary = 0;

  for (const item of items) {
    if (item.deletedAt) deleted += 1;
    else if (item.active) active += 1;
    else inactive += 1;

    totalBaseSalary += item.baseSalary;
    byRegime[item.regime] = (byRegime[item.regime] || 0) + 1;
    byRole[item.role] = (byRole[item.role] || 0) + 1;
  }

  return {
    count: items.length,
    active,
    inactive,
    deleted,
    totalBaseSalary: roundMoney(totalBaseSalary),
    averageBaseSalary: roundMoney(items.length ? totalBaseSalary / items.length : 0),
    byRegime,
    byRole,
  };
}

function payrollsSummary(items: PayrollEnterpriseRecord[]): PayrollsSummary {
  const byPeriod: Record<string, number> = {};
  let salariesAmount = 0;
  let proLaboreAmount = 0;
  let totalAmount = 0;

  for (const item of items) {
    salariesAmount += item.salariesAmount;
    proLaboreAmount += item.proLaboreAmount;
    totalAmount += item.totalAmount;
    byPeriod[item.periodLabel || `${item.month}/${item.year}`] = item.totalAmount;
  }

  return {
    count: items.length,
    salariesAmount: roundMoney(salariesAmount),
    proLaboreAmount: roundMoney(proLaboreAmount),
    totalAmount: roundMoney(totalAmount),
    byPeriod,
  };
}

function entriesSummary(items: PayrollEntryEnterpriseRecord[]): PayrollEntriesSummary {
  const byRegime: Record<string, number> = {};
  const totals = items.reduce(
    (acc, item) => {
      acc.baseSalary += item.baseSalary;
      acc.inssEmployee += item.inssEmployee;
      acc.inssEmployer += item.inssEmployer;
      acc.irrf += item.irrf;
      acc.fgts += item.fgts;
      acc.otherBenefits += item.otherBenefits;
      acc.otherDeductions += item.otherDeductions;
      acc.netSalary += item.netSalary;
      acc.employerCost += item.baseSalary + item.inssEmployer + item.fgts;
      const regime = item.employee?.regime || 'NAO_INFORMADO';
      byRegime[regime] = (byRegime[regime] || 0) + 1;
      return acc;
    },
    {
      baseSalary: 0,
      inssEmployee: 0,
      inssEmployer: 0,
      irrf: 0,
      fgts: 0,
      otherBenefits: 0,
      otherDeductions: 0,
      netSalary: 0,
      employerCost: 0,
    },
  );

  return {
    count: items.length,
    baseSalary: roundMoney(totals.baseSalary),
    inssEmployee: roundMoney(totals.inssEmployee),
    inssEmployer: roundMoney(totals.inssEmployer),
    irrf: roundMoney(totals.irrf),
    fgts: roundMoney(totals.fgts),
    otherBenefits: roundMoney(totals.otherBenefits),
    otherDeductions: roundMoney(totals.otherDeductions),
    netSalary: roundMoney(totals.netSalary),
    employerCost: roundMoney(totals.employerCost),
    byRegime,
  };
}

function filterEmployees(items: EmployeeEnterpriseRecord[], params: PayrollQuery) {
  const search = String(params.search || '')
    .trim()
    .toLowerCase();
  return items.filter((item) => {
    if (params.regime && params.regime !== 'ALL' && item.regime !== params.regime) return false;
    if (params.active === 'true' && !item.active) return false;
    if (params.active === 'false' && item.active) return false;
    if (!search) return true;
    return `${item.name} ${item.cpf} ${item.role}`.toLowerCase().includes(search);
  });
}

function filterPayrolls(items: PayrollEnterpriseRecord[], params: PayrollQuery) {
  return items.filter((item) => {
    if (params.month && Number(params.month) !== item.month) return false;
    if (params.year && Number(params.year) !== item.year) return false;
    return true;
  });
}

function filterEntries(items: PayrollEntryEnterpriseRecord[], params: PayrollQuery) {
  const search = String(params.search || '')
    .trim()
    .toLowerCase();
  return items.filter((item) => {
    if (params.payrollId && item.payrollId !== params.payrollId) return false;
    if (params.employeeId && item.employeeId !== params.employeeId) return false;
    if (params.month && item.payroll?.month !== Number(params.month)) return false;
    if (params.year && item.payroll?.year !== Number(params.year)) return false;
    if (!search) return true;
    return `${item.employee?.name || ''} ${item.employee?.role || ''}`
      .toLowerCase()
      .includes(search);
  });
}

export const payrollEnterpriseApi = {
  summary: async (companyId: string): Promise<PayrollSummaryResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readDemoStore(companyId);
      return {
        status: 'success',
        module: 'payroll-enterprise-summary',
        companyId,
        employees: employeesSummary(store.employees),
        payrolls: payrollsSummary(store.payrolls),
        entries: entriesSummary(store.entries),
        generatedAt: currentIso(),
      };
    }

    const response = await api.get<PayrollSummaryResponse>(
      `/payroll/enterprise/summary/${companyId}`,
    );

    return response.data;
  },

  listEmployees: async (
    companyId: string,
    params: PayrollQuery = {},
  ): Promise<EmployeesListResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readDemoStore(companyId);
      const filtered = filterEmployees(store.employees, params);
      const items = paginate(filtered, params);

      return {
        status: 'success',
        module: 'employees',
        model: 'Employee',
        companyId,
        items,
        total: filtered.length,
        limit: Number(params.limit || 100),
        offset: Number(params.offset || 0),
        hasMore: Number(params.offset || 0) + items.length < filtered.length,
        summary: employeesSummary(filtered),
        generatedAt: currentIso(),
      };
    }

    const response = await api.get<EmployeesListResponse>(
      `/payroll/enterprise/employees/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createEmployee: async (
    companyId: string,
    payload: CreateEmployeePayload,
  ): Promise<PayrollActionResponse<EmployeeEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      const store = readDemoStore(companyId);
      const employee: EmployeeEnterpriseRecord = {
        id: `demo-employee-${Date.now()}`,
        companyId,
        name: payload.name,
        cpf: payload.cpf,
        pis: payload.pis || null,
        admissionAt: payload.admissionAt,
        dismissalAt: payload.dismissalAt || null,
        role: payload.role,
        baseSalary: roundMoney(payload.baseSalary),
        active: payload.active ?? true,
        regime: payload.regime || 'CLT',
        operationalStatus: payload.active === false ? 'INACTIVE' : 'ACTIVE',
        createdAt: currentIso(),
      };

      store.employees.unshift(employee);
      appendAudit(store, companyId, 'employees', 'DEMO_EMPLOYEE_CREATED', 'Employee', employee.id);
      writeDemoStore(companyId, store);

      return {
        status: 'success',
        message: 'Colaborador criado na sessão demo.',
        companyId,
        item: employee,
        audit: { recorded: true },
        generatedAt: currentIso(),
      };
    }

    const response = await api.post<PayrollActionResponse<EmployeeEnterpriseRecord>>(
      `/payroll/enterprise/employees/${companyId}`,
      payload,
    );

    return response.data;
  },

  updateEmployee: async (
    companyId: string,
    employeeId: string,
    payload: UpdateEmployeePayload,
  ): Promise<PayrollActionResponse<EmployeeEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      const store = readDemoStore(companyId);
      const index = store.employees.findIndex((item) => item.id === employeeId);
      const current = store.employees[index];

      if (!current) {
        throw new Error(`Colaborador demo não encontrado: ${employeeId}`);
      }

      const updated: EmployeeEnterpriseRecord = {
        ...current,
        ...payload,
        pis: payload.pis ?? current.pis,
        dismissalAt: payload.dismissalAt ?? current.dismissalAt,
        baseSalary:
          payload.baseSalary === undefined ? current.baseSalary : roundMoney(payload.baseSalary),
        regime: payload.regime || current.regime,
        active: payload.active ?? current.active,
        updatedAt: currentIso(),
      };
      store.employees[index] = updated;
      store.entries = store.entries.map((entry) =>
        entry.employeeId === employeeId ? { ...entry, employee: updated } : entry,
      );
      appendAudit(store, companyId, 'employees', 'DEMO_EMPLOYEE_UPDATED', 'Employee', employeeId);
      writeDemoStore(companyId, store);

      return {
        status: 'success',
        message: 'Colaborador atualizado na sessão demo.',
        companyId,
        item: updated,
        audit: { recorded: true },
        generatedAt: currentIso(),
      };
    }

    const response = await api.patch<PayrollActionResponse<EmployeeEnterpriseRecord>>(
      `/payroll/enterprise/employees/${companyId}/${employeeId}`,
      payload,
    );

    return response.data;
  },

  deactivateEmployee: async (
    companyId: string,
    employeeId: string,
  ): Promise<PayrollActionResponse<EmployeeEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      return payrollEnterpriseApi.updateEmployee(companyId, employeeId, {
        active: false,
        dismissalAt: currentIso(),
      });
    }

    const response = await api.post<PayrollActionResponse<EmployeeEnterpriseRecord>>(
      `/payroll/enterprise/employees/${companyId}/${employeeId}/deactivate`,
    );

    return response.data;
  },

  listPayrolls: async (
    companyId: string,
    params: PayrollQuery = {},
  ): Promise<PayrollsListResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readDemoStore(companyId);
      const filtered = filterPayrolls(store.payrolls, params);
      const items = paginate(filtered, params);

      return {
        status: 'success',
        module: 'payrolls',
        model: 'Payroll',
        companyId,
        items,
        total: filtered.length,
        limit: Number(params.limit || 100),
        offset: Number(params.offset || 0),
        hasMore: Number(params.offset || 0) + items.length < filtered.length,
        summary: payrollsSummary(filtered),
        generatedAt: currentIso(),
      };
    }

    const response = await api.get<PayrollsListResponse>(
      `/payroll/enterprise/payrolls/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createPayroll: async (
    companyId: string,
    payload: CreatePayrollPayload,
  ): Promise<PayrollActionResponse<PayrollEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      const store = readDemoStore(companyId);
      const payroll: PayrollEnterpriseRecord = {
        id: `demo-payroll-${payload.year}-${payload.month}-${Date.now()}`,
        companyId,
        month: Number(payload.month),
        year: Number(payload.year),
        salariesAmount: roundMoney(payload.salariesAmount || 0),
        proLaboreAmount: roundMoney(payload.proLaboreAmount || 0),
        totalAmount: roundMoney(payload.totalAmount || payload.salariesAmount || 0),
        periodLabel: `${String(payload.month).padStart(2, '0')}/${payload.year}`,
        createdAt: currentIso(),
      };

      store.payrolls.unshift(payroll);
      appendAudit(store, companyId, 'payrolls', 'DEMO_PAYROLL_CREATED', 'Payroll', payroll.id);
      writeDemoStore(companyId, store);

      return {
        status: 'success',
        message: 'Folha criada na sessão demo.',
        companyId,
        item: payroll,
        payroll,
        audit: { recorded: true },
        generatedAt: currentIso(),
      };
    }

    const response = await api.post<PayrollActionResponse<PayrollEnterpriseRecord>>(
      `/payroll/enterprise/payrolls/${companyId}`,
      payload,
    );

    return response.data;
  },

  generatePayroll: async (
    companyId: string,
    payload: GeneratePayrollPayload,
  ): Promise<PayrollActionResponse<PayrollEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      const store = readDemoStore(companyId);
      const activeEmployees = store.employees.filter(
        (employee) => employee.active && !employee.deletedAt,
      );
      const salariesAmount = roundMoney(
        activeEmployees
          .filter((item) => item.regime === 'CLT')
          .reduce((sum, item) => sum + item.baseSalary, 0),
      );
      const proLaboreAmount = roundMoney(
        activeEmployees
          .filter((item) => item.regime === 'SOCIO_ADMINISTRADOR')
          .reduce((sum, item) => sum + item.baseSalary, 0),
      );
      const payroll: PayrollEnterpriseRecord = {
        id: `demo-payroll-${payload.year}-${payload.month}`,
        companyId,
        month: Number(payload.month),
        year: Number(payload.year),
        salariesAmount,
        proLaboreAmount,
        totalAmount: roundMoney(salariesAmount + proLaboreAmount),
        periodLabel: `${String(payload.month).padStart(2, '0')}/${payload.year}`,
        createdAt: currentIso(),
      };

      const entries = activeEmployees.map((employee, index) => {
        const amounts = calculateEntryAmounts(employee.baseSalary);
        return {
          id: `demo-entry-${payload.year}-${payload.month}-${index + 1}`,
          payrollId: payroll.id,
          employeeId: employee.id,
          baseSalary: employee.baseSalary,
          otherBenefits: 0,
          otherDeductions: 0,
          ...amounts,
          employee,
          payroll,
          createdAt: currentIso(),
        };
      });

      store.payrolls = [
        payroll,
        ...store.payrolls.filter(
          (item) => !(item.month === payroll.month && item.year === payroll.year),
        ),
      ];
      store.entries = [
        ...entries,
        ...store.entries.filter((item) => item.payrollId !== payroll.id),
      ];
      appendAudit(store, companyId, 'payrolls', 'DEMO_PAYROLL_GENERATED', 'Payroll', payroll.id);
      writeDemoStore(companyId, store);

      return {
        status: 'success',
        message: 'Folha gerada na sessão demo.',
        companyId,
        item: payroll,
        payroll,
        entries,
        totals: entriesSummary(entries),
        financialEvent: {
          recorded: Boolean(payload.createFinancialEvent),
          skipped: !payload.createFinancialEvent,
        },
        accountingEntry: {
          recorded: Boolean(payload.createAccountingEntry),
          skipped: !payload.createAccountingEntry,
        },
        audit: { recorded: true },
        generatedAt: currentIso(),
      };
    }

    const response = await api.post<PayrollActionResponse<PayrollEnterpriseRecord>>(
      `/payroll/enterprise/payrolls/${companyId}/generate`,
      payload,
    );

    return response.data;
  },

  listPayrollEntries: async (
    companyId: string,
    params: PayrollQuery = {},
  ): Promise<PayrollEntriesListResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readDemoStore(companyId);
      const filtered = filterEntries(store.entries, params);
      const items = paginate(filtered, params);

      return {
        status: 'success',
        module: 'payroll-entries',
        model: 'PayrollEntry',
        companyId,
        items,
        total: filtered.length,
        limit: Number(params.limit || 100),
        offset: Number(params.offset || 0),
        hasMore: Number(params.offset || 0) + items.length < filtered.length,
        summary: entriesSummary(filtered),
        generatedAt: currentIso(),
      };
    }

    const response = await api.get<PayrollEntriesListResponse>(
      `/payroll/enterprise/entries/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createPayrollEntry: async (
    companyId: string,
    payload: CreatePayrollEntryPayload,
  ): Promise<PayrollActionResponse<PayrollEntryEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      const store = readDemoStore(companyId);
      const employee = store.employees.find((item) => item.id === payload.employeeId);
      const payroll = store.payrolls.find((item) => item.id === payload.payrollId);

      if (!employee || !payroll) {
        throw new Error('Colaborador ou folha demo não encontrado.');
      }

      const baseSalary = roundMoney(payload.baseSalary || employee.baseSalary);
      const benefits = roundMoney(payload.otherBenefits || 0);
      const deductions = roundMoney(payload.otherDeductions || 0);
      const entry: PayrollEntryEnterpriseRecord = {
        id: `demo-payroll-entry-${Date.now()}`,
        payrollId: payload.payrollId,
        employeeId: payload.employeeId,
        baseSalary,
        otherBenefits: benefits,
        otherDeductions: deductions,
        ...calculateEntryAmounts(baseSalary, benefits, deductions),
        employee,
        payroll,
        createdAt: currentIso(),
      };

      store.entries.unshift(entry);
      appendAudit(
        store,
        companyId,
        'payroll-entries',
        'DEMO_PAYROLL_ENTRY_CREATED',
        'PayrollEntry',
        entry.id,
      );
      writeDemoStore(companyId, store);

      return {
        status: 'success',
        message: 'Lancamento de folha criado na sessão demo.',
        companyId,
        item: entry,
        audit: { recorded: true },
        generatedAt: currentIso(),
      };
    }

    const response = await api.post<PayrollActionResponse<PayrollEntryEnterpriseRecord>>(
      `/payroll/enterprise/entries/${companyId}`,
      payload,
    );

    return response.data;
  },

  updatePayrollEntry: async (
    companyId: string,
    payrollEntryId: string,
    payload: UpdatePayrollEntryPayload,
  ): Promise<PayrollActionResponse<PayrollEntryEnterpriseRecord>> => {
    if (isDemoCompany(companyId)) {
      const store = readDemoStore(companyId);
      const index = store.entries.findIndex((item) => item.id === payrollEntryId);
      const current = store.entries[index];

      if (!current) {
        throw new Error(`Lancamento de folha demo não encontrado: ${payrollEntryId}`);
      }

      const baseSalary = roundMoney(payload.baseSalary ?? current.baseSalary);
      const otherBenefits = roundMoney(payload.otherBenefits ?? current.otherBenefits);
      const otherDeductions = roundMoney(payload.otherDeductions ?? current.otherDeductions);
      const updated: PayrollEntryEnterpriseRecord = {
        ...current,
        ...payload,
        baseSalary,
        otherBenefits,
        otherDeductions,
        ...calculateEntryAmounts(baseSalary, otherBenefits, otherDeductions),
      };
      store.entries[index] = updated;
      appendAudit(
        store,
        companyId,
        'payroll-entries',
        'DEMO_PAYROLL_ENTRY_UPDATED',
        'PayrollEntry',
        payrollEntryId,
      );
      writeDemoStore(companyId, store);

      return {
        status: 'success',
        message: 'Lancamento de folha atualizado na sessão demo.',
        companyId,
        item: updated,
        audit: { recorded: true },
        generatedAt: currentIso(),
      };
    }

    const response = await api.patch<PayrollActionResponse<PayrollEntryEnterpriseRecord>>(
      `/payroll/enterprise/entries/${companyId}/${payrollEntryId}`,
      payload,
    );

    return response.data;
  },

  audit: async (
    companyId: string,
    module: 'employees' | 'payrolls' | 'payroll-entries',
    params: Record<string, unknown> = {},
  ): Promise<AuditLogListResponse> => {
    if (isDemoCompany(companyId)) {
      const store = readDemoStore(companyId);
      const filtered = store.audits.filter((item) => item.module === module);
      const limit = Number(params.limit || 30);
      const offset = Number(params.offset || 0);

      return {
        items: filtered.slice(offset, offset + limit),
        total: filtered.length,
        limit,
        offset,
        generatedAt: currentIso(),
      };
    }

    const response = await api.get<AuditLogListResponse>(
      `/audit/${companyId}${buildQuery({
        limit: 30,
        module,
        ...params,
      })}`,
    );

    return response.data;
  },
};

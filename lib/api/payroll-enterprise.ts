'use strict';

import { api } from '@/services/api';

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

export const payrollEnterpriseApi = {
  summary: async (companyId: string): Promise<PayrollSummaryResponse> => {
    const response = await api.get<PayrollSummaryResponse>(
      `/payroll/enterprise/summary/${companyId}`,
    );

    return response.data;
  },

  listEmployees: async (
    companyId: string,
    params: PayrollQuery = {},
  ): Promise<EmployeesListResponse> => {
    const response = await api.get<EmployeesListResponse>(
      `/payroll/enterprise/employees/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createEmployee: async (
    companyId: string,
    payload: CreateEmployeePayload,
  ): Promise<PayrollActionResponse<EmployeeEnterpriseRecord>> => {
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
    const response = await api.post<PayrollActionResponse<EmployeeEnterpriseRecord>>(
      `/payroll/enterprise/employees/${companyId}/${employeeId}/deactivate`,
    );

    return response.data;
  },

  listPayrolls: async (
    companyId: string,
    params: PayrollQuery = {},
  ): Promise<PayrollsListResponse> => {
    const response = await api.get<PayrollsListResponse>(
      `/payroll/enterprise/payrolls/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createPayroll: async (
    companyId: string,
    payload: CreatePayrollPayload,
  ): Promise<PayrollActionResponse<PayrollEnterpriseRecord>> => {
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
    const response = await api.get<PayrollEntriesListResponse>(
      `/payroll/enterprise/entries/${companyId}${buildQuery(params)}`,
    );

    return response.data;
  },

  createPayrollEntry: async (
    companyId: string,
    payload: CreatePayrollEntryPayload,
  ): Promise<PayrollActionResponse<PayrollEntryEnterpriseRecord>> => {
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

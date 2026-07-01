'use strict';

import { api, getActiveCompanyId, setActiveCompanyId } from '@/services/api';

export type EnterpriseModuleStatus = 'OK' | 'OK_WITH_FALLBACK' | 'ERROR' | 'EMPTY' | string;

export type EnterpriseModuleRecord = Record<string, unknown>;

export type EnterpriseModuleResponse = {
  slug: string;
  model: string;
  label: string;
  companyId: string;
  status: EnterpriseModuleStatus;
  items: EnterpriseModuleRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: Record<string, unknown>;
  generatedAt: string;
};

export type EnterpriseCatalogItem = {
  slug: string;
  model: string;
  label: string;
};

export type EnterpriseModuleViewState = {
  loading: boolean;
  error: string | null;
  data: EnterpriseModuleResponse | null;
};

export const ENTERPRISE_MODULE_LABELS: Record<string, string> = {
  users: 'Usuários',
  companies: 'Empresas',
  sessions: 'Sessões',
  'company-users': 'Usuários por Empresa',
  notifications: 'Notificações',
  invoices: 'Notas Fiscais',
  'sefaz-events': 'Eventos SEFAZ',
  'tax-obligations': 'Obrigações Tributárias',
  'tax-calculations': 'Cálculos Tributários',
  'fiscal-obligations': 'Obrigações Fiscais',
  'bank-accounts': 'Contas Bancárias',
  'bank-transactions': 'Transações Bancárias',
  'balance-locks': 'Travas de Competência',
  customers: 'Clientes',
  contracts: 'Contratos',
  'financial-events': 'Eventos Financeiros',
  'financial-snapshots': 'Snapshots Financeiros',
  'cash-flow-projections': 'Projeção de Caixa',
  'account-plan': 'Plano de Contas',
  'accounting-entries': 'Lançamentos Contábeis',
  employees: 'Funcionários',
  payrolls: 'Folha Mensal',
  'payroll-entries': 'Lançamentos de Folha',
  'compliance-checks': 'Compliance Fiscal',
  'automation-jobs': 'Automações',
  'business-rules': 'Regras de Negócio',
  'digital-certificates': 'Certificados Digitais',
  webhooks: 'Webhooks',
  'audit-logs': 'Auditoria',
};

export const ENTERPRISE_MODULE_MODELS: Record<string, string> = {
  users: 'User',
  companies: 'Company',
  sessions: 'UserSession',
  'company-users': 'CompanyUser',
  notifications: 'NotificationLog',
  invoices: 'Invoice',
  'sefaz-events': 'InvoiceSefazEvent',
  'tax-obligations': 'TaxObligation',
  'tax-calculations': 'TaxCalculation',
  'fiscal-obligations': 'FiscalObligation',
  'bank-accounts': 'BankAccount',
  'bank-transactions': 'BankTransaction',
  'balance-locks': 'BalanceLock',
  customers: 'Customer',
  contracts: 'Contract',
  'financial-events': 'FinancialEvent',
  'financial-snapshots': 'FinancialSnapshot',
  'cash-flow-projections': 'CashFlowProjection',
  'account-plan': 'AccountPlan',
  'accounting-entries': 'AccountingEntry',
  employees: 'Employee',
  payrolls: 'Payroll',
  'payroll-entries': 'PayrollEntry',
  'compliance-checks': 'ComplianceCheck',
  'automation-jobs': 'AutomationJob',
  'business-rules': 'BusinessRule',
  'digital-certificates': 'DigitalCertificate',
  webhooks: 'WebhookConfig',
  'audit-logs': 'AuditLog',
};

export function getEnterpriseModuleLabel(slug: string): string {
  return ENTERPRISE_MODULE_LABELS[slug] || slug;
}

export function getEnterpriseModuleModel(slug: string): string {
  return ENTERPRISE_MODULE_MODELS[slug] || slug;
}

export function getStoredCompanyId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const keys = ['bcost_active_company', 'bcost_company_id', 'companyId', 'activeCompanyId'];

  for (const key of keys) {
    const value = window.localStorage.getItem(key);

    if (value && value !== 'null' && value !== 'undefined' && value !== 'ID_DA_EMPRESA') {
      return value;
    }
  }

  return getActiveCompanyId?.() || null;
}

export async function resolveEnterpriseCompanyId(): Promise<string | null> {
  const stored = getStoredCompanyId();

  if (stored) {
    return stored;
  }

  try {
    const me = await api.get('/auth/me');
    const companyId = me.data?.companyId;

    if (companyId) {
      setActiveCompanyId?.(companyId);
      return companyId;
    }
  } catch {
    // segue para fallback
  }

  try {
    const companies = await api.get('/company');
    const firstCompany = Array.isArray(companies.data) ? companies.data[0] : null;

    if (firstCompany?.id) {
      setActiveCompanyId?.(firstCompany.id);
      return firstCompany.id;
    }
  } catch {
    // sem fallback disponível
  }

  return null;
}

export const enterpriseUniversalApi = {
  async catalog(): Promise<EnterpriseCatalogItem[]> {
    const response = await api.get('/enterprise/modules');
    return Array.isArray(response.data) ? response.data : [];
  },

  async getModule(
    slug: string,
    companyId: string,
    params?: {
      limit?: number;
      offset?: number;
      search?: string;
      status?: string;
      from?: string;
      to?: string;
    },
  ): Promise<EnterpriseModuleResponse> {
    try {
      const response = await api.get(`/enterprise/modules/${slug}/${companyId}`, {
        params: {
          limit: params?.limit ?? 100,
          offset: params?.offset ?? 0,
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.from ? { from: params.from } : {}),
          ...(params?.to ? { to: params.to } : {}),
        },
      });

      const data = response.data || {};

      return {
        slug: data.slug || slug,
        model: data.model || getEnterpriseModuleModel(slug),
        label: data.label || getEnterpriseModuleLabel(slug),
        companyId: data.companyId || companyId,
        status: data.status || 'OK',
        items: Array.isArray(data.items) ? data.items : [],
        total: Number(data.total || 0),
        limit: Number(data.limit || params?.limit || 100),
        offset: Number(data.offset || params?.offset || 0),
        hasMore: Boolean(data.hasMore),
        summary: data.summary && typeof data.summary === 'object' ? data.summary : {},
        generatedAt: data.generatedAt || new Date().toISOString(),
      };
    } catch (error) {
      const status =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      return {
        slug,
        model: getEnterpriseModuleModel(slug),
        label: getEnterpriseModuleLabel(slug),
        companyId,
        status: status === 404 || status === 0 ? 'OK_WITH_FALLBACK' : 'ERROR',
        items: [],
        total: 0,
        limit: params?.limit ?? 100,
        offset: params?.offset ?? 0,
        hasMore: false,
        summary: {
          fallback: true,
          errorStatus: status ?? null,
          message: 'Endpoint enterprise indisponível; exibindo estado seguro.',
        },
        generatedAt: new Date().toISOString(),
      };
    }
  },

  async summary(slug: string, companyId: string) {
    const response = await api.get(`/enterprise/modules/${slug}/${companyId}/summary`);
    return response.data;
  },

  async health(slug: string, companyId: string) {
    const response = await api.get(`/enterprise/modules/${slug}/${companyId}/health`);
    return response.data;
  },
};

export default enterpriseUniversalApi;

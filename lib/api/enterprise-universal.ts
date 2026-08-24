'use strict';

import {
  api,
  getActiveCompanyId,
  getToken,
  isDemoSession,
  setActiveCompanyId,
} from '@/services/api';
import { safeLocalStorageGet } from '@/lib/utils/runtime-guards';
import { trackEvent } from '@/lib/utils/telemetry';
import { getSchemaModuleBySlug } from '@/lib/product/schema-modules';
import {
  createDemoEnterpriseCatalog,
  createDemoEnterpriseResponse,
  getDemoEnterpriseCompanyId,
} from '@/lib/api/enterprise-demo';
import {
  assertOperationalDemoFallbackEnabled,
  isDemoEntityId,
  isOperationalDemoFallbackEnabled,
} from '@/lib/config/demo-policy';

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
  persistence?: 'PRISMA' | 'ROADMAP';
  endpoint?: string;
  area?: string;
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  canonicalOwner?: string;
  automationBoundary?: 'SOFTWARE_ONLY' | 'ASSISTED_AUTOMATION' | 'CRC_VALIDATED' | 'HUMAN_LED';
  operationalGuardrails?: string[];
};

export type EnterpriseCatalogOptions = {
  forceRefresh?: boolean;
};

export type EnterpriseModuleViewState = {
  loading: boolean;
  error: string | null;
  data: EnterpriseModuleResponse | null;
};

type EnterpriseCatalogCache = {
  items: EnterpriseCatalogItem[];
  expiresAt: number;
};

const ENTERPRISE_CATALOG_CACHE_TTL_MS = 60_000;

let enterpriseCatalogCache: EnterpriseCatalogCache | null = null;
let enterpriseCatalogRequest: Promise<EnterpriseCatalogItem[]> | null = null;

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
  return ENTERPRISE_MODULE_LABELS[slug] || getSchemaModuleBySlug(slug)?.title || slug;
}

export function getEnterpriseModuleModel(slug: string): string {
  return ENTERPRISE_MODULE_MODELS[slug] || getSchemaModuleBySlug(slug)?.model || slug;
}

export function getStoredCompanyId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const keys = ['bcost_active_company', 'bcost_company_id', 'companyId', 'activeCompanyId'];

  for (const key of keys) {
    const value = safeLocalStorageGet(key);

    if (value && value !== 'null' && value !== 'undefined' && value !== 'ID_DA_EMPRESA') {
      return value;
    }
  }

  return getActiveCompanyId?.() || null;
}

function hasRealAuthToken(): boolean {
  const token = getToken?.();
  return Boolean(token && token !== 'demo-token-local');
}

export async function resolveEnterpriseCompanyId(): Promise<string | null> {
  if (isDemoSession()) {
    const demoCompanyId = getDemoEnterpriseCompanyId();
    setActiveCompanyId?.(demoCompanyId);
    return demoCompanyId;
  }

  try {
    const me = await api.get('/auth/me');
    const companies = Array.isArray(me.data?.companies) ? me.data.companies : [];
    const companyId =
      me.data?.activeCompanyId ||
      me.data?.companyId ||
      companies.find((company: { id?: string }) => company.id === getStoredCompanyId())?.id ||
      companies[0]?.id;

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

  const stored = getStoredCompanyId();

  if (stored && (!isDemoEntityId(stored) || !hasRealAuthToken())) {
    return stored;
  }

  assertOperationalDemoFallbackEnabled(
    'Nenhuma empresa real ativa foi encontrada. Cadastre ou selecione uma empresa antes de abrir modulos enterprise.',
  );

  const fallbackCompanyId = getDemoEnterpriseCompanyId();
  setActiveCompanyId?.(fallbackCompanyId);
  return fallbackCompanyId;
}

export const enterpriseUniversalApi = {
  async catalog(options: EnterpriseCatalogOptions = {}): Promise<EnterpriseCatalogItem[]> {
    const now = Date.now();

    if (
      !options.forceRefresh &&
      enterpriseCatalogCache &&
      enterpriseCatalogCache.expiresAt > now
    ) {
      return enterpriseCatalogCache.items;
    }

    if (!options.forceRefresh && enterpriseCatalogRequest) {
      return enterpriseCatalogRequest;
    }

    enterpriseCatalogRequest = (async () => {
      try {
        const response = await api.get('/enterprise/modules');
        const items = Array.isArray(response.data)
          ? (response.data as EnterpriseCatalogItem[])
          : createDemoEnterpriseCatalog();

        enterpriseCatalogCache = {
          items,
          expiresAt: Date.now() + ENTERPRISE_CATALOG_CACHE_TTL_MS,
        };

        return items;
      } catch (error) {
        assertOperationalDemoFallbackEnabled(
          'Catalogo enterprise indisponivel e fallback demonstrativo desabilitado neste ambiente.',
        );

        const status =
          typeof error === 'object' && error !== null && 'response' in error
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;

        trackEvent('enterprise_catalog_fallback', { status });
        return createDemoEnterpriseCatalog();
      } finally {
        enterpriseCatalogRequest = null;
      }
    })();

    return enterpriseCatalogRequest;
  },

  clearCatalogCache(): void {
    enterpriseCatalogCache = null;
    enterpriseCatalogRequest = null;
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
    if (isDemoEntityId(companyId)) {
      return createDemoEnterpriseResponse(slug, companyId, params);
    }

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
      assertOperationalDemoFallbackEnabled(
        'Modulo enterprise indisponivel e fallback demonstrativo desabilitado neste ambiente.',
      );

      const status =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      trackEvent('enterprise_module_fallback', { slug, companyId, status });

      return createDemoEnterpriseResponse(slug, companyId, params);
    }
  },

  async summary(slug: string, companyId: string) {
    if (isDemoEntityId(companyId)) {
      return createDemoEnterpriseResponse(slug, companyId).summary;
    }

    try {
      const response = await api.get(`/enterprise/modules/${slug}/${companyId}/summary`);
      return response.data;
    } catch {
      assertOperationalDemoFallbackEnabled(
        'Resumo enterprise indisponivel e fallback demonstrativo desabilitado neste ambiente.',
      );

      return createDemoEnterpriseResponse(slug, companyId).summary;
    }
  },

  async health(slug: string, companyId: string) {
    if (isDemoEntityId(companyId)) {
      return {
        slug,
        companyId,
        status: 'OK_WITH_FALLBACK',
        generatedAt: new Date().toISOString(),
      };
    }

    try {
      const response = await api.get(`/enterprise/modules/${slug}/${companyId}/health`);
      return response.data;
    } catch {
      assertOperationalDemoFallbackEnabled(
        'Health enterprise indisponivel e fallback demonstrativo desabilitado neste ambiente.',
      );

      return {
        slug,
        companyId,
        status: 'OK_WITH_FALLBACK',
        generatedAt: new Date().toISOString(),
      };
    }
  },
};

export default enterpriseUniversalApi;

'use strict';

import { api, getActiveCompanyId, setActiveCompanyId } from '@/services/api';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';
import { safeLocalStorageGet } from '@/lib/utils/runtime-guards';
import { trackEvent } from '@/lib/utils/telemetry';
import { getSchemaModuleBySlug } from '@/lib/product/schema-modules';
import type { BcostMarketReadiness } from '@/lib/product/schema-modules';
import {
  createDemoEnterpriseCatalog,
  createDemoEnterpriseResponse,
} from '@/lib/api/enterprise-demo';
import { assertOperationalDemoFallbackEnabled, isDemoEntityId } from '@/lib/config/demo-policy';

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
  marketReadiness?: BcostMarketReadiness;
  canonicalOwner?: string;
  automationBoundary?: 'SOFTWARE_ONLY' | 'ASSISTED_AUTOMATION' | 'CRC_VALIDATED' | 'HUMAN_LED';
  operationalGuardrails?: string[];
};

export type EnterpriseAutomationBoundary = NonNullable<
  EnterpriseCatalogItem['automationBoundary']
>;

export type EnterpriseCommercialLaneId =
  | 'direct-sale'
  | 'assisted-validation'
  | 'blocked-roadmap';

export type EnterpriseCommercialLane = {
  id: EnterpriseCommercialLaneId;
  title: string;
  description: string;
  marketReadiness: BcostMarketReadiness;
  automationBoundaries: EnterpriseAutomationBoundary[];
  modules: EnterpriseCatalogItem[];
  primaryAction: string;
  operationalGate: string;
};

export type EnterpriseCatalogOptions = {
  forceRefresh?: boolean;
};

export type EnterpriseModuleViewState = {
  loading: boolean;
  error: string | null;
  data: EnterpriseModuleResponse | null;
};

type EnterpriseApiErrorPayload = {
  status?: string;
  message?: string;
  feature?: string;
  planLevel?: string;
  requiredPlan?: string;
};

type EnterpriseApiError = {
  response?: {
    status?: number;
    data?: EnterpriseApiErrorPayload;
  };
};

type EnterpriseCatalogCache = {
  items: EnterpriseCatalogItem[];
  expiresAt: number;
};

const ENTERPRISE_CATALOG_CACHE_TTL_MS = 60_000;

let enterpriseCatalogCache: EnterpriseCatalogCache | null = null;
let enterpriseCatalogRequest: Promise<EnterpriseCatalogItem[]> | null = null;

type EnterpriseCommercialLanesCache = {
  lanes: EnterpriseCommercialLane[];
  expiresAt: number;
};

let enterpriseCommercialLanesCache: EnterpriseCommercialLanesCache | null = null;
let enterpriseCommercialLanesRequest: Promise<EnterpriseCommercialLane[]> | null = null;

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

function assertEnterpriseModuleDemoAllowed(companyId: string, message: string): void {
  if (!isDemoEntityId(companyId)) {
    throw new Error(message);
  }

  assertOperationalDemoFallbackEnabled(message);
}

function toEnterpriseApiError(error: unknown): EnterpriseApiError {
  return error && typeof error === 'object' && 'response' in error
    ? (error as EnterpriseApiError)
    : {};
}

function throwFeatureLockedError(error: unknown): void {
  const apiError = toEnterpriseApiError(error);
  const payload = apiError.response?.data;

  if (apiError.response?.status !== 403 || payload?.status !== 'FEATURE_LOCKED') {
    return;
  }

  const feature = payload.feature ? ` (${payload.feature})` : '';
  const requiredPlan = payload.requiredPlan ? ` Exige plano ${payload.requiredPlan}.` : '';
  const message =
    payload.message || `Feature bloqueada para o plano atual${feature}.${requiredPlan}`;

  throw new Error(message);
}

function hasAutomationBoundary(
  item: EnterpriseCatalogItem,
  boundaries: EnterpriseAutomationBoundary[],
): boolean {
  return item.automationBoundary ? boundaries.includes(item.automationBoundary) : false;
}

export function createEnterpriseCommercialLanesFromCatalog(
  catalog: EnterpriseCatalogItem[],
): EnterpriseCommercialLane[] {
  const assistedBoundaries: EnterpriseAutomationBoundary[] = [
    'ASSISTED_AUTOMATION',
    'CRC_VALIDATED',
  ];
  const blockedBoundaries: EnterpriseAutomationBoundary[] = ['SOFTWARE_ONLY', 'HUMAN_LED'];

  return [
    {
      id: 'direct-sale',
      title: 'Venda direta',
      description:
        'Módulos persistidos, autenticados e aptos para proposta comercial com cliente real.',
      marketReadiness: 'SELLABLE',
      automationBoundaries: ['SOFTWARE_ONLY'],
      modules: catalog.filter((item) => item.marketReadiness === 'SELLABLE'),
      primaryAction: 'Abrir módulo',
      operationalGate:
        'Exige plano ativo, empresa autorizada, tenant validado e endpoint produtivo.',
    },
    {
      id: 'assisted-validation',
      title: 'Validação assistida',
      description:
        'Módulos de roadmap que podem ser discutidos com escopo, evidência e validação humana.',
      marketReadiness: 'ROADMAP_LOCKED',
      automationBoundaries: assistedBoundaries,
      modules: catalog.filter(
        (item) =>
          item.marketReadiness === 'ASSISTED_BETA' ||
          (item.marketReadiness === 'ROADMAP_LOCKED' &&
            hasAutomationBoundary(item, assistedBoundaries)),
      ),
      primaryAction: 'Validar escopo assistido',
      operationalGate:
        'Exige SLA interno, evidência fiscal, aceite explícito e validação de contador responsável.',
    },
    {
      id: 'blocked-roadmap',
      title: 'Roadmap bloqueado',
      description:
        'Serviços que não devem ser vendidos como automação pronta até fechar arquitetura e compliance.',
      marketReadiness: 'ROADMAP_LOCKED',
      automationBoundaries: blockedBoundaries,
      modules: catalog.filter(
        (item) =>
          item.marketReadiness === 'ROADMAP_LOCKED' &&
          !hasAutomationBoundary(item, assistedBoundaries) &&
          hasAutomationBoundary(item, blockedBoundaries),
      ),
      primaryAction: 'Planejar entrega',
      operationalGate:
        'Exige endpoint oficial, integração homologada, teste de compliance e roteiro operacional.',
    },
  ];
}

export async function resolveEnterpriseCompanyId(): Promise<string | null> {
  const companyId = await resolveEnterpriseCompanyIdWithFallback();
  setActiveCompanyId?.(companyId);
  return companyId;
}

export const enterpriseUniversalApi = {
  async catalog(options: EnterpriseCatalogOptions = {}): Promise<EnterpriseCatalogItem[]> {
    const now = Date.now();

    if (!options.forceRefresh && enterpriseCatalogCache && enterpriseCatalogCache.expiresAt > now) {
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
    enterpriseCommercialLanesCache = null;
    enterpriseCommercialLanesRequest = null;
  },

  async commercialLanes(
    options: EnterpriseCatalogOptions = {},
  ): Promise<EnterpriseCommercialLane[]> {
    const now = Date.now();

    if (
      !options.forceRefresh &&
      enterpriseCommercialLanesCache &&
      enterpriseCommercialLanesCache.expiresAt > now
    ) {
      return enterpriseCommercialLanesCache.lanes;
    }

    if (!options.forceRefresh && enterpriseCommercialLanesRequest) {
      return enterpriseCommercialLanesRequest;
    }

    enterpriseCommercialLanesRequest = (async () => {
      try {
        const response = await api.get('/enterprise/modules/commercial-lanes');
        const lanes = Array.isArray(response.data)
          ? (response.data as EnterpriseCommercialLane[])
          : createEnterpriseCommercialLanesFromCatalog(createDemoEnterpriseCatalog());

        enterpriseCommercialLanesCache = {
          lanes,
          expiresAt: Date.now() + ENTERPRISE_CATALOG_CACHE_TTL_MS,
        };

        return lanes;
      } catch (error) {
        assertOperationalDemoFallbackEnabled(
          'Trilhas comerciais enterprise indisponiveis e fallback demonstrativo desabilitado neste ambiente.',
        );

        const status = toEnterpriseApiError(error).response?.status;
        trackEvent('enterprise_commercial_lanes_fallback', { status });

        return createEnterpriseCommercialLanesFromCatalog(createDemoEnterpriseCatalog());
      } finally {
        enterpriseCommercialLanesRequest = null;
      }
    })();

    return enterpriseCommercialLanesRequest;
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
      throwFeatureLockedError(error);

      assertEnterpriseModuleDemoAllowed(
        companyId,
        'Modulo enterprise indisponivel e fallback demonstrativo desabilitado neste ambiente.',
      );

      const status = toEnterpriseApiError(error).response?.status;

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
      assertEnterpriseModuleDemoAllowed(
        companyId,
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
      assertEnterpriseModuleDemoAllowed(
        companyId,
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

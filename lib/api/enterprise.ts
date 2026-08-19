'use strict';

import { api } from '@/services/api';
import {
  BcostSchemaModule,
  BcostModuleStatus,
  getSchemaModuleBySlug,
} from '@/lib/product/schema-modules';
import { createDemoEnterprisePayload } from '@/lib/api/enterprise-demo';

export type EnterpriseEndpointStrategy = {
  slug: string;
  label: string;
  method: 'GET' | 'POST';
  path: string;
  enabled: boolean;
  expectsCompanyId: boolean;
};

export type EnterpriseModulePayload = {
  slug: string;
  title: string;
  status: BcostModuleStatus;
  endpoint: string | null;
  connected: boolean;
  records: unknown[];
  summary: Record<string, unknown>;
  raw: unknown;
  message: string;
  generatedAt: string;
};

function readActiveCompanyIdFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    localStorage.getItem('bcost_company_id') ||
    localStorage.getItem('bcost_active_company') ||
    localStorage.getItem('companyId') ||
    null
  );
}

function resolveCompanyId(input?: string | null): string | null {
  if (input && input !== 'ID_DA_EMPRESA') {
    return input;
  }

  const storedCompanyId = readActiveCompanyIdFromStorage();

  if (storedCompanyId && storedCompanyId !== 'ID_DA_EMPRESA') {
    return storedCompanyId;
  }

  return null;
}

function replaceCompanyId(path: string, companyId: string | null): string {
  if (!path.includes(':companyId')) {
    return path;
  }

  if (!companyId) {
    throw new Error('Empresa ativa não encontrada para consultar este módulo.');
  }

  return path.replace(':companyId', companyId);
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const payload = value as Record<string, unknown>;

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.latest)) {
    return payload.latest;
  }

  if (
    payload.invoicesSummary &&
    typeof payload.invoicesSummary === 'object' &&
    Array.isArray((payload.invoicesSummary as Record<string, unknown>).latest)
  ) {
    return (payload.invoicesSummary as Record<string, unknown>).latest as unknown[];
  }

  if (Array.isArray(payload.accounts)) {
    return payload.accounts;
  }

  if (Array.isArray(payload.records)) {
    return payload.records;
  }

  return [value];
}

function summarize(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const payload = value as Record<string, unknown>;

  const summaryKeys = [
    'companyId',
    'status',
    'connected',
    'provider',
    'balance',
    'totalCredits',
    'totalDebits',
    'totalTransactions',
    'reconciledTransactions',
    'pendingTransactions',
    'reconciliationRate',
    'healthScore',
    'revenue',
    'taxPaid',
    'taxSaved',
    'rbt12',
    'usagePercent',
    'currentFactor',
    'requiredPayroll',
    'actualPayroll',
    'missingPayroll',
    'potentialSaving',
    'total',
    'active',
    'generatedAt',
  ];

  const summary: Record<string, unknown> = {};

  for (const key of summaryKeys) {
    if (payload[key] !== undefined) {
      summary[key] = payload[key];
    }
  }

  if (payload.summary && typeof payload.summary === 'object') {
    summary.summary = payload.summary;
  }

  if (payload.health && typeof payload.health === 'object') {
    summary.health = payload.health;
  }

  if (payload.factorR && typeof payload.factorR === 'object') {
    summary.factorR = payload.factorR;
  }

  if (payload.compliance && typeof payload.compliance === 'object') {
    summary.compliance = payload.compliance;
  }

  return summary;
}

/**
 * Estratégias seguras por módulo.
 *
 * Regras:
 * - Só habilita endpoints já existentes/compatíveis.
 * - Módulos planejados não fazem chamada automática para evitar 404.
 * - À medida que criarmos novos endpoints, adicionamos o slug aqui.
 */
export const enterpriseEndpointStrategies: EnterpriseEndpointStrategy[] = [
  {
    slug: 'companies',
    label: 'Empresas',
    method: 'GET',
    path: '/company',
    enabled: true,
    expectsCompanyId: false,
  },
  {
    slug: 'invoices',
    label: 'Notas fiscais',
    method: 'GET',
    path: '/fiscal/invoices/:companyId',
    enabled: true,
    expectsCompanyId: true,
  },
  {
    slug: 'tax-calculations',
    label: 'Inteligência fiscal',
    method: 'GET',
    path: '/fiscal/diagnostics/:companyId',
    enabled: true,
    expectsCompanyId: true,
  },
  {
    slug: 'payrolls',
    label: 'Folha / Fator R',
    method: 'GET',
    path: '/fiscal/payroll/:companyId',
    enabled: true,
    expectsCompanyId: true,
  },
  {
    slug: 'bank-transactions',
    label: 'Transações bancárias',
    method: 'GET',
    path: '/banking/enterprise/transactions/:companyId',
    enabled: true,
    expectsCompanyId: true,
  },
  {
    slug: 'bank-accounts',
    label: 'Contas bancárias',
    method: 'GET',
    path: '/banking/enterprise/accounts/:companyId',
    enabled: true,
    expectsCompanyId: true,
  },
  {
    slug: 'compliance-checks',
    label: 'Compliance fiscal',
    method: 'GET',
    path: '/fiscal/diagnostics/:companyId',
    enabled: true,
    expectsCompanyId: true,
  },
  {
    slug: 'financial-snapshots',
    label: 'Snapshots financeiros',
    method: 'GET',
    path: '/fiscal/diagnostics/:companyId',
    enabled: true,
    expectsCompanyId: true,
  },
  {
    slug: 'audit-logs',
    label: 'Auditoria Enterprise',
    method: 'GET',
    path: '/audit/:companyId',
    enabled: true,
    expectsCompanyId: true,
  },
  {
    slug: 'notifications',
    label: 'Notificações',
    method: 'GET',
    path: '/notifications',
    enabled: false,
    expectsCompanyId: false,
  },
];

export function getEnterpriseEndpointStrategy(slug: string): EnterpriseEndpointStrategy | null {
  return enterpriseEndpointStrategies.find((item) => item.slug === slug) ?? null;
}

async function callStrategy(
  strategy: EnterpriseEndpointStrategy,
  companyId: string | null,
): Promise<unknown> {
  const endpoint = replaceCompanyId(strategy.path, companyId);

  if (strategy.method === 'GET') {
    const response = await api.get(endpoint);
    return response.data;
  }

  const response = await api.post(endpoint);
  return response.data;
}

export const enterpriseApi = {
  getModuleData: async (
    moduleOrSlug: BcostSchemaModule | string,
    companyId?: string | null,
  ): Promise<EnterpriseModulePayload> => {
    const moduleInfo =
      typeof moduleOrSlug === 'string' ? getSchemaModuleBySlug(moduleOrSlug) : moduleOrSlug;

    if (!moduleInfo) {
      throw new Error('Módulo enterprise não encontrado.');
    }

    const strategy = getEnterpriseEndpointStrategy(moduleInfo.slug);

    if (!strategy || !strategy.enabled) {
      return createDemoEnterprisePayload(moduleInfo, strategy?.path ?? moduleInfo.apiBase ?? null);
    }

    try {
      const resolvedCompanyId = resolveCompanyId(companyId);
      const endpoint = replaceCompanyId(strategy.path, resolvedCompanyId);
      const raw = await callStrategy(strategy, resolvedCompanyId);
      const records = asArray(raw);

      return {
        slug: moduleInfo.slug,
        title: moduleInfo.title,
        status: moduleInfo.status,
        endpoint,
        connected: true,
        records,
        summary: summarize(raw),
        raw,
        message: 'Módulo integrado com a API.',
        generatedAt: new Date().toISOString(),
      };
    } catch {
      return createDemoEnterprisePayload(moduleInfo, strategy.path);
    }
  },

  refreshModuleData: async (
    slug: string,
    companyId?: string | null,
  ): Promise<EnterpriseModulePayload> => {
    return enterpriseApi.getModuleData(slug, companyId);
  },
};

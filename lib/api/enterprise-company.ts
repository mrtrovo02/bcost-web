'use strict';

import { getDemoEnterpriseCompanyId } from '@/lib/api/enterprise-demo';
import { api, isDemoSession } from '@/services/api';
import { normalizeCompanyPayload } from '@/services/company-normalizer';

type AuthMeResponse = {
  id: string;
  email: string;
  companyId?: string;
  activeCompanyId?: string;
  company_id?: string;
  company?: { id?: string } | Record<string, unknown>;
  companies?: Array<{ id?: string } | Record<string, unknown>>;
  role?: string;
  user?: AuthMeResponse;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function isDemoCompanyId(value: string | null): boolean {
  return Boolean(value && value.toLowerCase().startsWith('demo-'));
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function clearStoredEnterpriseCompanyContext(): void {
  if (!isBrowser()) return;

  for (const key of [
    'bcost_active_company',
    'bcost_company_id',
    'companyId',
    'activeCompanyId',
    'bcost_active_company_data',
    'bcost_companies',
    'companies',
  ]) {
    localStorage.removeItem(key);
  }
}

function persistEnterpriseCompanyId(companyId: string): void {
  if (!isBrowser()) return;

  localStorage.setItem('bcost_active_company', companyId);
  localStorage.setItem('bcost_company_id', companyId);
  localStorage.setItem('companyId', companyId);
  localStorage.setItem('activeCompanyId', companyId);
}

function createRealCompanyContextError(): Error {
  const error = new Error(
    'Nenhuma empresa real ativa foi encontrada. Cadastre ou selecione uma empresa antes de abrir modulos de producao.',
  );

  Object.assign(error, { code: 'REAL_COMPANY_CONTEXT_REQUIRED' });

  return error;
}

export function readStoredEnterpriseCompanyId(): string | null {
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
      const companies = normalizeCompanyPayload(parsed);
      const companyId = firstString(
        parsed.companyId,
        parsed.activeCompanyId,
        parsed.company_id,
        companies[0]?.id,
      );

      if (companyId) {
        return companyId;
      }
    }
  } catch {
    // segue para a lista de empresas persistida abaixo
  }

  try {
    const rawCompanies = localStorage.getItem('bcost_companies') || localStorage.getItem('companies');
    if (rawCompanies) {
      const companies = normalizeCompanyPayload(JSON.parse(rawCompanies));
      return companies[0]?.id ?? null;
    }
  } catch {
    return null;
  }

  return null;
}

export async function resolveEnterpriseCompanyIdWithFallback(): Promise<string> {
  if (isDemoSession()) {
    const demoCompanyId = getDemoEnterpriseCompanyId();

    persistEnterpriseCompanyId(demoCompanyId);

    return demoCompanyId;
  }

  const stored = readStoredEnterpriseCompanyId();

  if (stored && isDemoCompanyId(stored) && isBrowser()) {
    clearStoredEnterpriseCompanyContext();
  }

  try {
    const response = await api.get<AuthMeResponse>('/auth/me');
    const user = response.data.user ?? response.data;
    const companies = normalizeCompanyPayload(user.companies ?? response.data.companies ?? user);
    const companyId = firstString(
      user.companyId,
      user.activeCompanyId,
      user.company_id,
      user.company?.id,
      response.data.companyId,
      response.data.activeCompanyId,
      response.data.company_id,
      response.data.company?.id,
      companies.find((company) => company.id === stored)?.id,
      companies[0]?.id,
    );

    if (companyId) {
      clearStoredEnterpriseCompanyContext();
      persistEnterpriseCompanyId(companyId);

      return companyId;
    }
  } catch {
    // segue para fallback operacional
  }

  if (stored && !isDemoCompanyId(stored)) return stored;

  throw createRealCompanyContextError();
}

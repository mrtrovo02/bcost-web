'use strict';

import { getDemoEnterpriseCompanyId } from '@/lib/api/enterprise-demo';
import { assertOperationalDemoFallbackEnabled } from '@/lib/config/demo-policy';
import { api, isDemoSession } from '@/services/api';

type AuthMeResponse = {
  id: string;
  email: string;
  companyId?: string;
  role?: string;
};

function isBrowser() {
  return typeof window !== 'undefined';
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
      const companyId = parsed.companyId || parsed.activeCompanyId || parsed.company_id;

      if (typeof companyId === 'string' && companyId) {
        return companyId;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function resolveEnterpriseCompanyIdWithFallback(): Promise<string> {
  if (isDemoSession()) {
    const demoCompanyId = getDemoEnterpriseCompanyId();

    if (isBrowser()) {
      localStorage.setItem('bcost_active_company', demoCompanyId);
    }

    return demoCompanyId;
  }

  const stored = readStoredEnterpriseCompanyId();

  if (stored) return stored;

  try {
    const response = await api.get<AuthMeResponse>('/auth/me');
    const companyId = response.data.companyId;

    if (companyId) {
      if (isBrowser()) {
        localStorage.setItem('bcost_active_company', companyId);
      }

      return companyId;
    }
  } catch {
    // segue para fallback operacional
  }

  assertOperationalDemoFallbackEnabled(
    'Nenhuma empresa real ativa foi encontrada. Cadastre ou selecione uma empresa antes de abrir modulos de producao.',
  );

  const fallbackCompanyId = getDemoEnterpriseCompanyId();

  if (isBrowser()) {
    localStorage.setItem('bcost_active_company', fallbackCompanyId);
  }

  return fallbackCompanyId;
}

'use client';

import { useEffect } from 'react';

type CompanyLike = {
  id: string;
  name?: string;
  cnpj?: string;
  role?: string;
  taxRegime?: string;
};

type AuthMeLike = {
  id?: string;
  email?: string;
  name?: string;
  companyId?: string;
  activeCompanyId?: string;
  company_id?: string;
  company?: CompanyLike;
  companies?: CompanyLike[];
  user?: AuthMeLike;
};

const TOKEN_KEYS = ['bcost_token', 'bcost_access_token', 'access_token', 'accessToken', 'token'];

const COMPANY_ID_KEYS = [
  'bcost_active_company',
  'bcost_company_id',
  'companyId',
  'activeCompanyId',
];

const COMPANY_LIST_KEYS = ['bcost_companies', 'companies'];
const DEMO_TOKEN = 'demo-token-local';

function isDemoCompanyId(value?: string | null) {
  return typeof value === 'string' && value.toLowerCase().startsWith('demo-');
}

function shouldUseLocalDemo() {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname.toLowerCase();
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isBcostProductionHost = hostname === 'bcost.com.br' || hostname.endsWith('.bcost.com.br');

  if (process.env.NODE_ENV === 'development' || isLocalHost) return true;

  return process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' && !isBcostProductionHost;
}

function resolveApiBase() {
  const configuredBase =
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || null;

  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return configuredBase || 'http://localhost:5000/api/v1';
  }

  return (
    configuredBase ||
    (process.env.NODE_ENV === 'development'
      ? 'http://localhost:5000/api/v1'
      : 'https://api.bcost.com.br/api/v1')
  );
}

function readLocalStorage(keys: string[]): string | null {
  if (typeof window === 'undefined') return null;

  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const row = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`));

  if (!row) return null;

  const value = decodeURIComponent(row.split('=').slice(1).join('=') || '');
  return value.trim().length > 0 ? value.trim() : null;
}

function resolveToken(): string | null {
  // Prioriza a leitura de cookies conforme a nova arquitetura do api.ts
  const cookieToken = readCookie('bcost_token') || readCookie('bcost_access_token');
  if (cookieToken) return cookieToken;

  // Fallback e migração de tokens legados encontrados no localStorage
  const legacyToken = readLocalStorage(TOKEN_KEYS);
  if (legacyToken && typeof window !== 'undefined') {
    document.cookie = `bcost_token=${encodeURIComponent(legacyToken)}; path=/; SameSite=Lax`;
    return legacyToken;
  }
  return null;
}

function parseJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token || !token.includes('.')) return null;

  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(
      normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '='),
    );
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function readCompaniesFromStorage(): CompanyLike[] {
  if (typeof window === 'undefined') return [];

  for (const key of COMPANY_LIST_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((company) => company?.id);
      }
    } catch {
      window.localStorage.removeItem(key);
    }
  }
  return [];
}

function removeDemoCompanies(companies: CompanyLike[]): CompanyLike[] {
  return companies.filter((company) => !isDemoCompanyId(company.id));
}

function normalizeCompanies(value: unknown): CompanyLike[] {
  if (!Array.isArray(value)) return [];

  return value.filter((company): company is CompanyLike => {
    return Boolean(company && typeof company === 'object' && 'id' in company);
  });
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function persistCompanyContext(companyId: string, companies: CompanyLike[]) {
  if (typeof window === 'undefined') return;

  const cleanCompanies =
    companies.length > 0
      ? companies
      : [
          {
            id: companyId,
            name: isDemoCompanyId(companyId) ? 'Empresa Demo' : 'Empresa vinculada',
            role: 'OWNER',
          },
        ];

  window.localStorage.setItem('bcost_active_company', companyId);
  window.localStorage.setItem('bcost_company_id', companyId);
  window.localStorage.setItem('companyId', companyId);
  window.localStorage.setItem('activeCompanyId', companyId);
  window.localStorage.setItem('bcost_companies', JSON.stringify(cleanCompanies));
  window.localStorage.setItem('companies', JSON.stringify(cleanCompanies));
  window.localStorage.setItem('bcost_active_company_data', JSON.stringify(cleanCompanies[0]));

  if (companyId.startsWith('demo-')) {
    window.localStorage.setItem('bcost_token', DEMO_TOKEN);
  }

  window.dispatchEvent(
    new CustomEvent('bcost:company-context-updated', {
      detail: {
        companyId,
        companies: cleanCompanies,
      },
    }),
  );
}

function clearCompanyContext() {
  if (typeof window === 'undefined') return;

  for (const key of [...COMPANY_ID_KEYS, ...COMPANY_LIST_KEYS, 'bcost_active_company_data']) {
    window.localStorage.removeItem(key);
  }
}

function companyContextAlreadyExists() {
  const companyId = readLocalStorage(COMPANY_ID_KEYS);
  const companies = readCompaniesFromStorage();
  return Boolean(companyId && companies.length > 0);
}

function readActiveCompanyId(): string | null {
  return readLocalStorage(COMPANY_ID_KEYS);
}

async function fetchAuthMe(token: string) {
  const apiBase = resolveApiBase();

  // Alinha a chamada removendo o prefixo /api/v1 redundante caso a URL base mude
  const endpoint = apiBase.endsWith('/') ? `${apiBase}auth/me` : `${apiBase}/auth/me`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Se a requisição de hidratação falhar por não estar autorizada, limpa traços antigos
      if (typeof window !== 'undefined') {
        for (const key of COMPANY_ID_KEYS) window.localStorage.removeItem(key);
      }
    }
    return null;
  }

  return response.json();
}

async function fetchCompanies(token: string): Promise<CompanyLike[]> {
  const apiBase = resolveApiBase();
  const endpoint = apiBase.endsWith('/') ? `${apiBase}company` : `${apiBase}/company`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) return [];

  const payload: unknown = await response.json();

  if (Array.isArray(payload)) return normalizeCompanies(payload);

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return normalizeCompanies((payload as { data?: unknown }).data);
  }

  return [];
}

export function CompanySessionHydrator() {
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (typeof window === 'undefined') return;

      const token = resolveToken();
      if (!token) {
        if (companyContextAlreadyExists()) return;
        if (shouldUseLocalDemo()) {
          persistCompanyContext('demo-001', readCompaniesFromStorage());
        }
        return;
      }

      if (token === DEMO_TOKEN) {
        const activeCompanyId = readActiveCompanyId();
        const companies = readCompaniesFromStorage();
        const hasValidDemoContext =
          activeCompanyId &&
          isDemoCompanyId(activeCompanyId) &&
          companies.some((company) => company.id === activeCompanyId);

        if (!hasValidDemoContext) {
          clearCompanyContext();
          persistCompanyContext(String('demo-001'), readCompaniesFromStorage());
        }
        return;
      }

      const payload = parseJwtPayload(token);
      const jwtCompanyId =
        payload?.companyId || payload?.activeCompanyId || payload?.company_id || null;

      const storedCompanies = removeDemoCompanies(readCompaniesFromStorage());

      if (
        jwtCompanyId &&
        storedCompanies.length > 0 &&
        storedCompanies.some((company) => company.id === String(jwtCompanyId)) &&
        !isDemoCompanyId(String(jwtCompanyId))
      ) {
        persistCompanyContext(String(jwtCompanyId), storedCompanies);
        return;
      }

      const authMe = (await fetchAuthMe(token).catch(() => null)) as AuthMeLike | null;
      if (cancelled) return;

      const user = authMe?.user || authMe || {};
      let authCompanies = normalizeCompanies(user?.companies || authMe?.companies);
      if (authCompanies.length === 0 && user?.company?.id) {
        authCompanies = [user.company];
      }

      if (authCompanies.length === 0) {
        authCompanies = await fetchCompanies(token).catch(() => []);
        if (cancelled) return;
      }

      const resolvedCompanyId = firstString(
        user?.companyId,
        user?.activeCompanyId,
        authMe?.companyId,
        authMe?.activeCompanyId,
        authCompanies[0]?.id,
        jwtCompanyId,
      );

      if (!resolvedCompanyId) {
        if (shouldUseLocalDemo()) {
          persistCompanyContext('demo-001', readCompaniesFromStorage());
        } else {
          clearCompanyContext();
        }
        return;
      }

      if (!isDemoCompanyId(String(resolvedCompanyId))) {
        clearCompanyContext();
      }

      persistCompanyContext(String(resolvedCompanyId), authCompanies);

      const reloadFlag = 'bcost_company_context_reloaded_once';
      if (!window.sessionStorage.getItem(reloadFlag)) {
        window.sessionStorage.setItem(reloadFlag, '1');
        window.location.reload();
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export default CompanySessionHydrator;

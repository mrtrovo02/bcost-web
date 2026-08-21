'use client';

import { useEffect } from 'react';

type CompanyLike = {
  id: string;
  name?: string;
  cnpj?: string;
  role?: string;
  taxRegime?: string;
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

  return (
    process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' ||
    process.env.NODE_ENV === 'development' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

function resolveApiBase() {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:5001/api/v1';
  }

  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:5001/api/v1' : 'https://api.bcost.com.br/api/v1')
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
    for (const key of TOKEN_KEYS) {
      window.localStorage.removeItem(key);
    }
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

function persistCompanyContext(companyId: string, companies: CompanyLike[]) {
  if (typeof window === 'undefined') return;

  const cleanCompanies =
    companies.length > 0
      ? companies
      : [
          {
            id: companyId,
            name: 'Empresa Teste SaaS',
            role: 'OWNER',
            taxRegime: 'SIMPLES_NACIONAL',
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
    document.cookie = `bcost_token=${encodeURIComponent(DEMO_TOKEN)}; path=/; SameSite=Lax`;
    document.cookie = `bcost_access_token=${encodeURIComponent(DEMO_TOKEN)}; path=/; SameSite=Lax`;
    document.cookie = `bcost_company_id=${encodeURIComponent(companyId)}; path=/; SameSite=Lax`;
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

  for (const key of [
    ...COMPANY_ID_KEYS,
    ...COMPANY_LIST_KEYS,
    'bcost_active_company_data',
  ]) {
    window.localStorage.removeItem(key);
  }
}

function companyContextAlreadyExists() {
  const companyId = readLocalStorage(COMPANY_ID_KEYS);
  const companies = readCompaniesFromStorage();
  return Boolean(companyId && companies.length > 0);
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
        if (!companyContextAlreadyExists()) {
          persistCompanyContext(String('demo-001'), readCompaniesFromStorage());
        }
        return;
      }

      const payload = parseJwtPayload(token);
      const jwtCompanyId =
        payload?.companyId || payload?.activeCompanyId || payload?.company_id || null;

      const storedCompanies = readCompaniesFromStorage();

      if (
        jwtCompanyId &&
        storedCompanies.length > 0 &&
        storedCompanies.some((company) => company.id === String(jwtCompanyId)) &&
        !isDemoCompanyId(String(jwtCompanyId))
      ) {
        persistCompanyContext(String(jwtCompanyId), storedCompanies);
        return;
      }

      const authMe = await fetchAuthMe(token).catch(() => null);
      if (cancelled) return;

      const user = authMe?.user || authMe || {};
      const authCompanies = user?.companies || authMe?.companies || [];

      const resolvedCompanyId =
        user?.companyId ||
        user?.activeCompanyId ||
        authMe?.companyId ||
        authMe?.activeCompanyId ||
        authCompanies?.[0]?.id ||
        jwtCompanyId;

      if (!resolvedCompanyId) {
        if (shouldUseLocalDemo()) {
          persistCompanyContext('demo-001', storedCompanies);
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

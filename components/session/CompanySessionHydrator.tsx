'use client';

import { useEffect } from 'react';
import { normalizeCompanyPayload } from '@/services/company-normalizer';
import { api, setStoredUser, type BcostCompany, type BcostUser } from '@/services/api';

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
  role?: string;
  active?: boolean;
  twoFactor?: boolean;
  companyId?: string;
  activeCompanyId?: string;
  company_id?: string;
  company?: CompanyLike;
  companies?: CompanyLike[];
  user?: AuthMeLike;
};

const TOKEN_KEYS = ['bcost_token', 'bcost_access_token', 'access_token', 'accessToken', 'token'];
const REFRESH_TOKEN_KEYS = ['bcost_refresh_token', 'refresh_token', 'refreshToken'];
const USER_KEYS = ['bcost_user', 'user', 'auth_user'];

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

  if (isBcostProductionHost) {
    return (
      process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' &&
      process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK === 'true' &&
      process.env.NEXT_PUBLIC_DEMO_ACCESS_MODE === 'controlled'
    );
  }

  if (process.env.NODE_ENV === 'development' || isLocalHost) return true;

  return process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true';
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

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function resolveToken(): string | null {
  // Prioriza a leitura de cookies conforme a nova arquitetura do api.ts
  const cookieToken = readCookie('bcost_token') || readCookie('bcost_access_token');
  if (cookieToken) {
    if (cookieToken === DEMO_TOKEN && !shouldUseLocalDemo()) {
      clearAuthContext();
      clearCompanyContext();
      return null;
    }

    return cookieToken;
  }

  // Fallback e migração de tokens legados encontrados no localStorage
  const legacyToken = readLocalStorage(TOKEN_KEYS);
  if (legacyToken && typeof window !== 'undefined') {
    if (legacyToken === DEMO_TOKEN && !shouldUseLocalDemo()) {
      clearAuthContext();
      clearCompanyContext();
      return null;
    }

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
      const companies = normalizeCompanies(parsed);
      if (companies.length > 0) {
        return companies;
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
  return normalizeCompanyPayload(value);
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
  const activeCompany = cleanCompanies.find((company) => company.id === companyId) ?? cleanCompanies[0];

  window.localStorage.setItem('bcost_active_company', companyId);
  window.localStorage.setItem('bcost_company_id', companyId);
  window.localStorage.setItem('companyId', companyId);
  window.localStorage.setItem('activeCompanyId', companyId);
  window.localStorage.setItem('bcost_companies', JSON.stringify(cleanCompanies));
  window.localStorage.setItem('companies', JSON.stringify(cleanCompanies));
  window.localStorage.setItem('bcost_active_company_data', JSON.stringify(activeCompany));

  if (companyId.startsWith('demo-') && shouldUseLocalDemo()) {
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

function persistRealCompanyContext(companyId: string, companies: CompanyLike[]) {
  persistCompanyContext(companyId, removeDemoCompanies(companies));
}

function toStoredCompanies(companies: CompanyLike[]): BcostCompany[] {
  return removeDemoCompanies(companies).map((company) => ({
    ...company,
    id: company.id,
    name: company.name || 'Empresa vinculada',
  }));
}

function persistAuthenticatedUser(authMe: AuthMeLike, companies: CompanyLike[]) {
  const user = authMe.user || authMe;
  if (!user.id || !user.email) return;

  const storedCompanies = toStoredCompanies(companies);
  const companyId = firstString(
    user.companyId,
    user.activeCompanyId,
    user.company_id,
    authMe.companyId,
    authMe.activeCompanyId,
    storedCompanies[0]?.id,
  );

  const storedUser: BcostUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    twoFactor: user.twoFactor,
    companyId: companyId ?? undefined,
    activeCompanyId: companyId ?? undefined,
    company: storedCompanies.find((company) => company.id === companyId) ?? storedCompanies[0],
    companies: storedCompanies,
  };

  setStoredUser(storedUser);
}

function clearCompanyContext() {
  if (typeof window === 'undefined') return;

  for (const key of [...COMPANY_ID_KEYS, ...COMPANY_LIST_KEYS, 'bcost_active_company_data']) {
    window.localStorage.removeItem(key);
  }
}

function clearAuthContext() {
  if (typeof window === 'undefined') return;

  for (const key of [...TOKEN_KEYS, ...REFRESH_TOKEN_KEYS, ...USER_KEYS]) {
    window.localStorage.removeItem(key);
  }

  for (const key of [...TOKEN_KEYS, ...REFRESH_TOKEN_KEYS]) {
    deleteCookie(key);
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

async function fetchAuthMe(): Promise<AuthMeLike | null> {
  const response = await api.get<AuthMeLike>('/auth/me');
  return response.data;
}

async function fetchCompanies(): Promise<CompanyLike[]> {
  const response = await api.get<unknown>('/company');
  return normalizeCompanies(response.data);
}

export function CompanySessionHydrator() {
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (typeof window === 'undefined') return;

      const token = resolveToken();
      if (!token) {
        if (companyContextAlreadyExists()) {
          if (shouldUseLocalDemo()) return;
          clearCompanyContext();
          return;
        }
        if (shouldUseLocalDemo()) {
          persistCompanyContext('demo-001', readCompaniesFromStorage());
        }
        return;
      }

      if (token === DEMO_TOKEN) {
        if (!shouldUseLocalDemo()) {
          clearAuthContext();
          clearCompanyContext();
          return;
        }

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
        persistRealCompanyContext(String(jwtCompanyId), storedCompanies);
      }

      const authMe = await fetchAuthMe().catch(() => null);
      if (cancelled) return;

      const user = authMe?.user || authMe || {};
      let authCompanies = normalizeCompanies(user?.companies || authMe?.companies);
      if (authCompanies.length === 0 && user?.company?.id) {
        authCompanies = [user.company];
      }

      const authCompanyId = firstString(
        user?.companyId,
        user?.activeCompanyId,
        authMe?.companyId,
        authMe?.activeCompanyId,
        jwtCompanyId,
      );

      if (authCompanies.length === 0 && authCompanyId && !isDemoCompanyId(authCompanyId)) {
        authCompanies = [
          {
            id: authCompanyId,
            name: 'Empresa vinculada',
            role: 'MEMBER',
          },
        ];
      }

      if (authCompanies.length === 0) {
        authCompanies = await fetchCompanies().catch(() => []);
        if (cancelled) return;
      }

      if (authMe) {
        persistAuthenticatedUser(authMe, authCompanies);
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

      persistRealCompanyContext(String(resolvedCompanyId), authCompanies);

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

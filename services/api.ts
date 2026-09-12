/**
 * services/api.ts
 * Camada de comunicacao HTTP do bCost Frontend.
 * Alinhado com as diretrizes de resiliencia e Clean Architecture.
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { normalizeCompanyPayload } from './company-normalizer';

// Helpers de ambiente
const isBrowser = (): boolean => typeof window !== 'undefined';
const isProductionHost = (): boolean =>
  isBrowser() &&
  !window.location.hostname.includes('localhost') &&
  !window.location.hostname.includes('127.0.0.1');
const isOfficialBcostHost = (): boolean =>
  isBrowser() &&
  (window.location.hostname === 'bcost.com.br' ||
    window.location.hostname.endsWith('.bcost.com.br'));
const isLocalBrowserHost = (): boolean =>
  isBrowser() &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const isValidValue = (v: unknown): v is string =>
  v !== undefined && v !== null && v !== '' && v !== 'null' && v !== 'undefined';

// Constantes
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const COOKIE_DOMAIN = '.bcost.com.br';
const DEMO_TOKEN = 'demo-token-local';
const TRACE_HEADER = 'x-bcost-trace-id';
const TRACE_SESSION_KEY = 'bcost_trace_id';
const TRACE_SESSION_EXPIRES_AT_KEY = 'bcost_trace_id_expires_at';
const TRACE_SESSION_TTL_MS = 15 * 60 * 1000;

const TOKEN_KEYS = ['bcost_token', 'bcost_access_token'] as const;
const REFRESH_KEYS = ['bcost_refresh_token'] as const;
const COMPANY_KEYS = [
  'bcost_company_id',
  'companyId',
  'bcost_active_company',
  'activeCompanyId',
] as const;
const USER_KEYS = ['bcost_user', 'user', 'auth_user'] as const;
const COMPANY_DATA_KEYS = [
  'bcost_active_company_data',
  'bcost_companies',
  'companies',
] as const;

const USER_ALLOWED_KEYS = new Set<string>([
  'id',
  'email',
  'name',
  'companyId',
  'activeCompanyId',
  'company_id',
  'role',
  'active',
  'twoFactor',
  'company',
  'companies',
]);

export type RequestAuthMetadata = {
  token: string | null;
  isDemoRequest: boolean;
};

function isControlledDemoAccessEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' &&
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK === 'true' &&
    process.env.NEXT_PUBLIC_DEMO_ACCESS_MODE === 'controlled'
  );
}

export function isDemoModeEnabled(): boolean {
  if (isOfficialBcostHost()) return isControlledDemoAccessEnabled();
  return process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' || process.env.NODE_ENV === 'development';
}

function isDemoTokenAllowed(): boolean {
  return isDemoModeEnabled();
}

function isDemoCompanyContext(): boolean {
  if (!isBrowser()) return false;

  const companyId = getActiveCompanyId();
  const storageCompanyId = window.localStorage.getItem('bcost_active_company') ?? window.localStorage.getItem('companyId');
  const candidate = companyId ?? storageCompanyId ?? '';
  return candidate.toLowerCase().startsWith('demo-');
}

export function isDemoSession(): boolean {
  if (!isBrowser()) return false;

  if (!isDemoModeEnabled()) return false;

  const token = getToken();
  const hasDemoToken = token === DEMO_TOKEN;
  const hasDemoCompanyContext = isDemoCompanyContext();

  if (isOfficialBcostHost()) {
    return hasDemoToken;
  }

  if (token && !hasDemoToken) return false;

  return hasDemoToken || hasDemoCompanyContext;
}

// Tipos publicos
export interface BcostCompany {
  id: string;
  name: string;
  cnpj?: string;
  [key: string]: unknown;
}

export interface BcostUser {
  id: string;
  email: string;
  name?: string;
  companyId?: string;
  role?: string;
  active?: boolean;
  twoFactor?: boolean;
  company?: BcostCompany;
  companies?: Array<BcostCompany | Record<string, unknown>>;
  [key: string]: unknown;
}

export interface AuthResponse {
  access_token?: string;
  accessToken?: string;
  token?: string;
  refresh_token?: string;
  refreshToken?: string;
  mfaRequired?: false;
  user?: BcostUser;
  companyId?: string;
  activeCompanyId?: string;
  companies?: Array<BcostCompany | Record<string, unknown>>;
}

export interface MfaRequiredResponse {
  access_token: null;
  mfaRequired: true;
  mfaSession: string;
  user: Pick<BcostUser, 'id' | 'email' | 'name'>;
}

export type LoginResponse = AuthResponse | MfaRequiredResponse;

export interface AuthMissingError extends Error {
  isAuthMissing: true;
  status: 0;
  config?: AxiosRequestConfig;
}

export interface BcostApiErrorMetadata {
  bcostTraceId?: string;
}

type HeaderReader = {
  get: (name: string) => unknown;
};

function isHeaderReader(value: unknown): value is HeaderReader {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as { get?: unknown }).get === 'function'
  );
}

function readHeaderValue(headers: unknown, name: string): string | null {
  if (!headers) return null;

  if (isHeaderReader(headers)) {
    const value = headers.get(name);
    if (Array.isArray(value)) {
      const first = value.find((item) => isValidValue(item));
      return first ?? null;
    }
    return isValidValue(value) ? value : null;
  }

  if (typeof headers !== 'object') return null;

  const normalizedName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (key.toLowerCase() !== normalizedName) continue;
    if (Array.isArray(value)) {
      const first = value.find((item) => isValidValue(item));
      return first ?? null;
    }
    return isValidValue(value) ? value : null;
  }

  return null;
}

function readTraceIdFromProblemDetails(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;

  const problem = data as Record<string, unknown>;
  const traceId = problem.traceId;
  if (isValidValue(traceId)) return traceId;

  const requestId = problem.requestId;
  if (isValidValue(requestId)) return requestId;

  return null;
}

export function getBcostTraceIdFromError(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;

  const enriched = error as BcostApiErrorMetadata;
  if (isValidValue(enriched.bcostTraceId)) {
    return enriched.bcostTraceId;
  }

  if (!axios.isAxiosError(error)) return null;

  return (
    readHeaderValue(error.response?.headers, TRACE_HEADER) ??
    readTraceIdFromProblemDetails(error.response?.data) ??
    readHeaderValue(error.config?.headers, TRACE_HEADER)
  );
}

function readProblemMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;

  const payload = data as Record<string, unknown>;
  const message = payload.message;
  if (isValidValue(message)) return message;

  const detail = payload.detail;
  if (isValidValue(detail)) return detail;

  const title = payload.title;
  if (isValidValue(title)) return title;

  return null;
}

export function formatBcostApiErrorMessage(error: unknown, fallback: string): string {
  const traceId = getBcostTraceIdFromError(error);
  const apiMessage = axios.isAxiosError(error) ? readProblemMessage(error.response?.data) : null;
  const errorMessage = error instanceof Error && isValidValue(error.message) ? error.message : null;
  const message = apiMessage ?? errorMessage ?? fallback;

  return traceId ? `${message} Código de suporte: ${traceId}` : message;
}

function enrichAxiosErrorWithTraceId(error: unknown): void {
  if (!axios.isAxiosError(error)) return;

  const traceId = getBcostTraceIdFromError(error);
  if (traceId) {
    (error as BcostApiErrorMetadata).bcostTraceId = traceId;
  }
}

// Cookie helpers
function cookieAttrs(maxAge: number): string {
  return isProductionHost()
    ? `path=/; max-age=${maxAge}; SameSite=None; Secure; domain=${COOKIE_DOMAIN}`
    : `path=/; max-age=${maxAge}; SameSite=Lax`;
}

function cookieDeleteAttrs(): string {
  const base = 'path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  return isProductionHost()
    ? `${base}; SameSite=None; Secure; domain=${COOKIE_DOMAIN}`
    : `${base}; SameSite=Lax`;
}

function hostCookieDeleteAttrs(): string {
  return 'path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
}

export function readCookie(name: string): string | null {
  if (!isBrowser() || !document.cookie) return null;
  for (const raw of document.cookie.split(';')) {
    const eq = raw.indexOf('=');
    if (eq === -1) continue;
    if (raw.slice(0, eq).trim() !== name) continue;
    const val = raw.slice(eq + 1).trim();
    if (!isValidValue(val)) return null;
    try {
      return decodeURIComponent(val);
    } catch {
      return val;
    }
  }
  return null;
}

export function writeCookie(name: string, value: string, maxAge = COOKIE_MAX_AGE): void {
  if (!isBrowser() || !isValidValue(value)) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; ${cookieAttrs(maxAge)}`;
}

export function deleteCookie(name: string): void {
  if (!isBrowser()) return;
  document.cookie = `${name}=; ${cookieDeleteAttrs()}`;
  document.cookie = `${name}=; ${hostCookieDeleteAttrs()}`;
}

// localStorage helpers
function lsGet(keys: readonly string[]): string | null {
  if (!isBrowser()) return null;
  for (const key of keys) {
    try {
      const v = window.localStorage.getItem(key);
      if (isValidValue(v)) return v!;
    } catch {
      /* empty */
    }
  }
  return null;
}

// Usado internamente no fluxo de salvamento de sessoes e fallbacks
function lsSet(keys: readonly string[], value: string): void {
  if (!isBrowser() || !isValidValue(value)) return;
  for (const key of keys) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* quota */
    }
  }
}

function lsRemove(keys: readonly string[]): void {
  if (!isBrowser()) return;
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* empty */
    }
  }
}

function removeReadableTokenStorage(): void {
  lsRemove(TOKEN_KEYS);
}

function hasStoredRealUser(): boolean {
  if (!isBrowser()) return false;

  for (const key of USER_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as Partial<BcostUser>;
      const email = typeof parsed.email === 'string' ? parsed.email.toLowerCase() : '';
      const id = typeof parsed.id === 'string' ? parsed.id.toLowerCase() : '';

      if (email && email !== 'demo@bcost.com.br') return true;
      if (id && !id.startsWith('demo-')) return true;
    } catch {
      window.localStorage.removeItem(key);
    }
  }

  return false;
}

function isDemoId(value?: string | null): boolean {
  return typeof value === 'string' && value.toLowerCase().startsWith('demo-');
}

export function resolveRequestAuthMetadata(
  token: string | null,
  companyId: string | null,
): RequestAuthMetadata {
  const hasRealToken = Boolean(token && token !== DEMO_TOKEN);
  const hasDemoToken = token === DEMO_TOKEN;
  const hasDemoCompanyWithoutRealToken = !hasRealToken && isDemoId(companyId);
  const isDemoRequest = isOfficialBcostHost()
    ? isDemoModeEnabled() && hasDemoToken
    : isDemoModeEnabled() && (hasDemoToken || hasDemoCompanyWithoutRealToken);

  return {
    token: isDemoRequest ? DEMO_TOKEN : token,
    isDemoRequest,
  };
}

export function resolveRequestCompanyId(
  token: string | null,
  companyId: string | null,
): string | null {
  if (!companyId) return null;

  if (isDemoId(companyId) && !isDemoModeEnabled()) return null;
  if (isOfficialBcostHost() && isDemoId(companyId) && token !== DEMO_TOKEN) return null;

  const hasRealToken = Boolean(token && token !== DEMO_TOKEN);
  const hasDemoToken = token === DEMO_TOKEN;

  if (hasRealToken && isDemoId(companyId)) return null;
  if (!hasRealToken && !hasDemoToken && !isDemoId(companyId)) return null;

  return companyId;
}

export function resolveRequestHeaders(
  token: string | null,
  companyId: string | null,
): Record<string, string> {
  const authMetadata = resolveRequestAuthMetadata(token, companyId);
  const requestCompanyId = resolveRequestCompanyId(token, companyId);
  const headers: Record<string, string> = {};

  if (authMetadata.token) {
    headers.Authorization = `Bearer ${authMetadata.token}`;
  }

  if (requestCompanyId) {
    headers['x-company-id'] = requestCompanyId;
  }

  return headers;
}

export function createBcostTraceId(): string {
  if (isBrowser()) {
    const storedTraceId = window.sessionStorage.getItem(TRACE_SESSION_KEY);
    const storedExpiresAt = Number(window.sessionStorage.getItem(TRACE_SESSION_EXPIRES_AT_KEY));

    if (storedTraceId?.startsWith('web-') && storedExpiresAt > Date.now()) {
      return storedTraceId;
    }
  }

  const randomUuid = globalThis.crypto?.randomUUID;
  let traceId: string;

  if (typeof randomUuid === 'function') {
    traceId = `web-${randomUuid.call(globalThis.crypto)}`;
  } else {
    const timestamp = Date.now().toString(36);
    const entropy = Math.random().toString(16).slice(2, 10);
    traceId = `web-${timestamp}-${entropy}`;
  }

  if (isBrowser()) {
    window.sessionStorage.setItem(TRACE_SESSION_KEY, traceId);
    window.sessionStorage.setItem(
      TRACE_SESSION_EXPIRES_AT_KEY,
      String(Date.now() + TRACE_SESSION_TTL_MS),
    );
  }

  return traceId;
}

function clearStoredCompanyData(): void {
  lsRemove([...COMPANY_KEYS, ...COMPANY_DATA_KEYS]);
  deleteCookie('bcost_company_id');
}

function dispatchCompanyContextUpdated(companyId?: string, companies?: BcostCompany[]): void {
  if (!isBrowser()) return;

  window.dispatchEvent(
    new CustomEvent('bcost:company-context-updated', {
      detail: {
        companyId,
        companies: Array.isArray(companies) ? companies : [],
      },
    }),
  );
}

function dispatchUserSessionUpdated(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent('bcost:user-session-updated'));
}

// User sanitization
function sanitizeUser(user: BcostUser): BcostUser {
  const out: BcostUser = { id: user.id, email: user.email };
  for (const [k, v] of Object.entries(user)) {
    if (!USER_ALLOWED_KEYS.has(k)) continue;
    const lower = k.toLowerCase();
    if (
      lower.includes('token') ||
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('cookie')
    )
      continue;
    out[k] = v;
  }
  return out;
}

// Token getters & setters
export function getToken(): string | null {
  if (!isBrowser()) return null;

  if (isOfficialBcostHost()) {
    for (const key of TOKEN_KEYS) {
      const value = readCookie(key);
      if (value === DEMO_TOKEN && isDemoTokenAllowed()) {
        if (hasStoredRealUser()) {
          clearToken();
          return null;
        }
        return DEMO_TOKEN;
      }
    }

    const legacy = lsGet(TOKEN_KEYS);
    if (legacy === DEMO_TOKEN && isDemoTokenAllowed()) {
      if (hasStoredRealUser()) {
        clearToken();
        return null;
      }
      return DEMO_TOKEN;
    }

    if (legacy) {
      removeReadableTokenStorage();
    }

    return null;
  }

  for (const key of TOKEN_KEYS) {
    const v = readCookie(key);
    if (isValidValue(v)) {
      if (v === DEMO_TOKEN && !isDemoTokenAllowed()) {
        clearToken();
        return null;
      }
      lsSet(TOKEN_KEYS, v!);
      return v!;
    }
  }
  const legacy = lsGet(TOKEN_KEYS);
  if (legacy) {
    if (legacy === DEMO_TOKEN && !isDemoTokenAllowed()) {
      clearToken();
      return null;
    }
    for (const key of TOKEN_KEYS) writeCookie(key, legacy);
    return legacy;
  }
  return null;
}

export function setToken(token: string): void {
  if (!isBrowser() || !isValidValue(token)) return;

  if (isOfficialBcostHost() && token !== DEMO_TOKEN) {
    removeReadableTokenStorage();
    for (const key of TOKEN_KEYS) deleteCookie(key);
    return;
  }

  for (const key of TOKEN_KEYS) deleteCookie(key);
  lsSet(TOKEN_KEYS, token);
  for (const key of TOKEN_KEYS) writeCookie(key, token);
}

export function clearToken(): void {
  if (!isBrowser()) return;
  lsRemove(TOKEN_KEYS);
  for (const key of TOKEN_KEYS) deleteCookie(key);
}

export const getStoredToken = getToken;
export const setStoredToken = setToken;
export const clearStoredToken = clearToken;

// Refresh token
export function getRefreshToken(): string | null {
  // O refresh token agora é HttpOnly e não pode ser lido pelo JavaScript.
  return null;
}

export function setRefreshToken(token?: string | null): void {
  if (!isBrowser() || typeof token !== 'string' || !isValidValue(token)) return;
  lsRemove(REFRESH_KEYS);
  deleteCookie('bcost_refresh_token');
}

export function clearRefreshToken(): void {
  if (!isBrowser()) return;
  lsRemove(REFRESH_KEYS);
  for (const key of REFRESH_KEYS) deleteCookie(key);
}

// Company ID
export function getActiveCompanyId(): string | null {
  const fromCookie = readCookie('bcost_company_id');
  if (isValidValue(fromCookie)) return fromCookie!;
  return lsGet(COMPANY_KEYS);
}

export function setActiveCompanyId(companyId: string): void {
  if (!isValidValue(companyId)) return;
  lsSet(COMPANY_KEYS, companyId);
  writeCookie('bcost_company_id', companyId);
}

export function clearActiveCompanyId(): void {
  lsRemove(COMPANY_KEYS);
  deleteCookie('bcost_company_id');
}

// User Profile
export function getStoredUser(): BcostUser | null {
  if (!isBrowser()) return null;
  for (const key of USER_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!isValidValue(raw)) continue;
      return JSON.parse(raw!) as BcostUser;
    } catch {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* empty */
      }
    }
  }
  return null;
}

export function setStoredUser(user?: BcostUser | null): void {
  if (!isBrowser() || !user) return;
  const safe = sanitizeUser(user);
  const isRealUser =
    safe.email?.toLowerCase() !== 'demo@bcost.com.br' &&
    !String(safe.id).toLowerCase().startsWith('demo-');
  const rawCompanies = normalizeCompanyPayload(safe.companies ?? safe);
  const normalizedCompanies = isRealUser
    ? rawCompanies.filter((company) => !isDemoId(company.id))
    : rawCompanies;
  const rawPreferredCompanyId =
    safe.companyId ??
    safe.activeCompanyId ??
    safe.company_id ??
    safe.company?.id;
  const preferredCompanyId =
    isRealUser && isDemoId(typeof rawPreferredCompanyId === 'string' ? rawPreferredCompanyId : null)
      ? undefined
      : rawPreferredCompanyId;

  if (isRealUser && isDemoId(safe.company?.id)) {
    delete safe.company;
  }

  if (normalizedCompanies.length > 0) {
    safe.companies = normalizedCompanies;
    safe.company =
      normalizedCompanies.find((company) => company.id === preferredCompanyId) ??
      normalizedCompanies[0];
  } else if (isRealUser) {
    delete safe.companies;
  }

  const companyId =
    preferredCompanyId ??
    safe.company?.id ??
    normalizedCompanies[0]?.id;
  if (typeof companyId === 'string' && (!isRealUser || !isDemoId(companyId))) {
    safe.companyId = companyId;
    safe.activeCompanyId = companyId;
    setActiveCompanyId(companyId);
  } else if (isRealUser) {
    delete safe.companyId;
    delete safe.activeCompanyId;
    delete safe.company_id;
    clearStoredCompanyData();
  }

  const json = JSON.stringify(safe);
  for (const key of USER_KEYS) {
    try {
      window.localStorage.setItem(key, json);
    } catch {
      /* empty */
    }
  }

  if (normalizedCompanies.length > 0) {
    try {
      window.localStorage.setItem('bcost_companies', JSON.stringify(normalizedCompanies));
      window.localStorage.setItem('companies', JSON.stringify(normalizedCompanies));
      window.localStorage.setItem('bcost_active_company_data', JSON.stringify(safe.company));
    } catch {
      /* empty */
    }
  }

  dispatchUserSessionUpdated();
}

export function clearStoredUser(): void {
  lsRemove(USER_KEYS);
  dispatchUserSessionUpdated();
}

// Session Validation
export function hasSession(): boolean {
  return Boolean(getToken() || isDemoSession());
}

export function clearSession(): void {
  clearToken();
  clearRefreshToken();
  clearStoredCompanyData();
  clearStoredUser();
  if (isBrowser()) {
    window.sessionStorage.removeItem(TRACE_SESSION_KEY);
    window.sessionStorage.removeItem(TRACE_SESSION_EXPIRES_AT_KEY);
    window.sessionStorage.removeItem('bcost_company_context_reloaded_once');
  }
  dispatchCompanyContextUpdated(undefined, []);
}

export const clearStorageSession = clearSession;

export function persistAuthResponse(data: AuthResponse): void {
  const token = data?.access_token ?? data?.accessToken ?? data?.token ?? null;
  const refreshToken = data?.refresh_token ?? data?.refreshToken ?? null;
  const isRealToken = Boolean(token && token !== DEMO_TOKEN);

  if (isRealToken) {
    clearStoredCompanyData();
  }

  if (token) setToken(token);
  if (refreshToken) setRefreshToken(refreshToken);

  const rawCompanies = normalizeCompanyPayload(data.companies ?? data.user?.companies ?? data.user);
  const companies = isRealToken
    ? rawCompanies.filter((company) => !isDemoId(company.id))
    : rawCompanies;
  const rawCompanyId =
    data.companyId ??
    data.activeCompanyId ??
    data.user?.companyId ??
    data.user?.activeCompanyId ??
    data.user?.company_id ??
    data.user?.company?.id ??
    companies[0]?.id;
  const companyId =
    typeof rawCompanyId === 'string' && (!isRealToken || !isDemoId(rawCompanyId))
      ? rawCompanyId
      : companies[0]?.id;
  if (typeof companyId === 'string' && (!isRealToken || !isDemoId(companyId))) {
    setActiveCompanyId(companyId);
  }

  if (data.user) {
    setStoredUser({
      ...data.user,
      companies,
      companyId,
      activeCompanyId: companyId,
      company: companies.find((company) => company.id === companyId) ?? companies[0],
    });
  }

  if (companies.length > 0) {
    const activeCompany =
      companies.find((company) => company.id === companyId) ?? companies[0];

    try {
      window.localStorage.setItem('bcost_companies', JSON.stringify(companies));
      window.localStorage.setItem('companies', JSON.stringify(companies));
      window.localStorage.setItem('bcost_active_company_data', JSON.stringify(activeCompany));
    } catch {
      /* empty */
    }
  }

  const hasDemoCompanyAfterLogin = typeof companyId === 'string' && isDemoId(companyId);
  if (!hasDemoCompanyAfterLogin) {
    dispatchCompanyContextUpdated(
      typeof companyId === 'string' ? companyId : undefined,
      Array.isArray(companies) ? companies : [],
    );
  }
}

export const setStorageSession = persistAuthResponse;

// Redirect Logic
function redirectToLogin(reason = 'expired'): void {
  if (!isBrowser()) return;
  if (window.location.pathname.startsWith('/login')) return;
  if (isDemoSession()) return;
  const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.replace(`/login?session=${reason}&redirect=${redirect}`);
}

export function isAuthMissingError(error: unknown): error is AuthMissingError {
  return (
    Boolean(error) &&
    typeof error === 'object' &&
    (error as AuthMissingError).isAuthMissing === true
  );
}

// Instancia Axios unificada
function resolveApiBase(): string {
  const configuredBase =
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || null;

  if (isLocalBrowserHost()) {
    return configuredBase || 'http://localhost:5000/api/v1';
  }

  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return configuredBase || 'http://localhost:5000/api/v1';
  }

  return (
    configuredBase ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:5000/api/v1' : '/api/v1')
  );
}

const API_BASE = resolveApiBase();

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 15000, // Timeout adicionado para evitar travamento de chunks no Next.js 16
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor de Requisicao (Injeção de Metadados e Tokens)
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const runtimeBase = resolveApiBase();
    if (runtimeBase && config.baseURL !== runtimeBase) {
      config.baseURL = runtimeBase;
    }

    const token = getToken();
    const companyId = getActiveCompanyId();
    const requestHeaders = resolveRequestHeaders(token, companyId);

    delete config.headers.Authorization;
    delete config.headers['x-company-id'];
    delete config.headers['x-demo-session'];
    delete config.headers[TRACE_HEADER];

    if (requestHeaders.Authorization) {
      config.headers.Authorization = requestHeaders.Authorization;
    }

    if (requestHeaders['x-company-id']) {
      config.headers['x-company-id'] = requestHeaders['x-company-id'];
    }

    config.headers[TRACE_HEADER] = createBcostTraceId();
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// Interceptor de Resposta (Tratamento Anti-Loop de Erro 401)
let isHandling401 = false;
let refreshRequest: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    enrichAxiosErrorWithTraceId(error);

    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const requestUrl = error.config?.url ?? 'unknown';
      console.warn('[API Interceptor] Requisicao nao autorizada (401) capturada em:', requestUrl);

      const requestConfig = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
      const isRefreshRequest = requestUrl.includes('/auth/refresh');

      if (!isRefreshRequest && requestConfig && !requestConfig._retry && !isDemoSession()) {
        requestConfig._retry = true;
        refreshRequest ??= api
          .post<AuthResponse>('/auth/refresh')
          .then(({ data }) => {
            persistAuthResponse(data);
            return data.access_token ?? data.accessToken ?? data.token ?? null;
          })
          .catch(() => null)
          .finally(() => {
            refreshRequest = null;
          });

        const refreshedToken = await refreshRequest;
        if (refreshedToken) {
          return api(requestConfig);
        }
      }

      if (!isHandling401) {
        isHandling401 = true;
        if (!isDemoSession()) {
          clearSession();
          redirectToLogin('expired');
        } else {
          console.info('[API Interceptor] Erro 401 ignorado por estar em uma Demo Session ativa.');
        }
        setTimeout(() => {
          isHandling401 = false;
        }, 500);
      }
    }
    return Promise.reject(error);
  },
);

// Atalhos HTTP Tipados Corporativos
export const apiGet = <T = unknown>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => api.get<T>(url, config);
export const apiPost = <T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => api.post<T>(url, data, config);
export const apiPut = <T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => api.put<T>(url, data, config);
export const apiPatch = <T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => api.patch<T>(url, data, config);
export const apiDelete = <T = unknown>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => api.delete<T>(url, config);

// Fluxo do Caso de Uso de Autenticação (Login)
export async function login(
  emailOrCredentials: string | Record<string, unknown>,
  password?: string,
): Promise<LoginResponse> {
  const payload: Record<string, unknown> =
    typeof emailOrCredentials === 'string' && password
      ? { email: emailOrCredentials, password }
      : (emailOrCredentials as Record<string, unknown>);

  const { data } = await apiPost<LoginResponse>('/auth/login', payload);
  if (!isMfaRequiredResponse(data)) {
    persistAuthResponse(data);
  }
  return data;
}

export function isMfaRequiredResponse(
  data: LoginResponse,
): data is MfaRequiredResponse {
  return data.mfaRequired === true && typeof data.mfaSession === 'string';
}

export async function verifyMfa(
  mfaSession: string,
  otpCode: string,
): Promise<AuthResponse> {
  const { data } = await apiPost<AuthResponse>('/auth/verify-mfa', {
    mfaSession,
    otpCode,
  });
  persistAuthResponse(data);
  return data;
}

export async function logout(): Promise<void> {
  await apiPost('/auth/logout').catch(() => undefined);
  clearSession();
}

export async function switchActiveCompany(companyId: string): Promise<AuthResponse> {
  const { data } = await apiPost<AuthResponse>('/auth/switch-company', { companyId });
  persistAuthResponse(data);
  return data;
}

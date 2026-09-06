'use strict';

const DEMO_ID_PREFIX = 'demo-';
const DEMO_TOKEN = 'demo-token-local';

function readBrowserToken(): string | null {
  if (typeof window === 'undefined') return null;

  const storageToken =
    window.localStorage.getItem('bcost_token') ?? window.localStorage.getItem('bcost_access_token');

  if (storageToken) return storageToken;

  if (typeof document === 'undefined' || !document.cookie) return null;

  const tokenCookie = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('bcost_token=') || cookie.startsWith('bcost_access_token='));

  if (!tokenCookie) return null;

  try {
    return decodeURIComponent(tokenCookie.split('=').slice(1).join('='));
  } catch {
    return tokenCookie.split('=').slice(1).join('=');
  }
}

function hasExplicitDemoSession(): boolean {
  return readBrowserToken() === DEMO_TOKEN;
}

function isOfficialBcostHost(): boolean {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname.toLowerCase();
  return hostname === 'bcost.com.br' || hostname.endsWith('.bcost.com.br');
}

export class DemoFallbackDisabledError extends Error {
  readonly code = 'DEMO_FALLBACK_DISABLED';

  constructor(message = 'Fallback demonstrativo desabilitado para este ambiente.') {
    super(message);
    this.name = 'DemoFallbackDisabledError';
  }
}

export function isOperationalDemoFallbackEnabled(): boolean {
  if (isOfficialBcostHost()) {
    return process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK === 'true';
  }

  if (hasExplicitDemoSession()) return true;

  const explicit = process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK;

  if (explicit === 'true') return true;
  if (explicit === 'false') return false;

  return process.env.NODE_ENV === 'development';
}

export function assertOperationalDemoFallbackEnabled(message?: string): void {
  if (!isOperationalDemoFallbackEnabled()) {
    throw new DemoFallbackDisabledError(message);
  }
}

export function isDemoEntityId(value?: string | null): boolean {
  return typeof value === 'string' && value.toLowerCase().startsWith(DEMO_ID_PREFIX);
}

export function isDemoFallbackDisabledError(error: unknown): error is DemoFallbackDisabledError {
  return (
    error instanceof DemoFallbackDisabledError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { code?: unknown }).code === 'DEMO_FALLBACK_DISABLED')
  );
}

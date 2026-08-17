'use strict';

const DEMO_ID_PREFIX = 'demo-';

export class DemoFallbackDisabledError extends Error {
  readonly code = 'DEMO_FALLBACK_DISABLED';

  constructor(message = 'Fallback demonstrativo desabilitado para este ambiente.') {
    super(message);
    this.name = 'DemoFallbackDisabledError';
  }
}

export function isOperationalDemoFallbackEnabled(): boolean {
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

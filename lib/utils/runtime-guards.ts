export function safeJsonParse<T = unknown>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // noop: storage unavailable
  }
}

export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // noop: storage unavailable
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function getErrorMessage(error: unknown, fallback = 'Erro inesperado'): string {
  if (error instanceof Error && error.message) return error.message;

  if (isRecord(error) && typeof error.message === 'string') return error.message;

  if (typeof error === 'string') return error;

  return fallback;
}

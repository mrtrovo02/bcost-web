import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertOperationalDemoFallbackEnabled,
  isOperationalDemoFallbackEnabled,
} from '../demo-policy';

function setLocation(hostname: string): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      hostname,
      pathname: '/dashboard',
      search: '',
      replace: vi.fn(),
    },
  });
}

describe('demo-policy', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
    document.cookie = 'bcost_token=; path=/; max-age=0';
    document.cookie = 'bcost_access_token=; path=/; max-age=0';
  });

  it('blocks operational demo fallback on official domains when production env disables it', () => {
    setLocation('app.bcost.com.br');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'false');
    window.localStorage.setItem('bcost_token', 'demo-token-local');

    expect(isOperationalDemoFallbackEnabled()).toBe(false);
    expect(() => assertOperationalDemoFallbackEnabled()).toThrow(
      'Fallback demonstrativo desabilitado para este ambiente.',
    );
  });

  it('allows operational demo fallback on official domains only when explicitly enabled', () => {
    setLocation('app.bcost.com.br');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'true');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'true');
    vi.stubEnv('NEXT_PUBLIC_DEMO_ACCESS_MODE', 'controlled');

    expect(isOperationalDemoFallbackEnabled()).toBe(true);
  });

  it('blocks official demo fallback when access mode is not controlled', () => {
    setLocation('app.bcost.com.br');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'true');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'true');

    expect(isOperationalDemoFallbackEnabled()).toBe(false);
  });

  it('keeps local development fallback available outside official domains', () => {
    setLocation('localhost');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'false');
    window.localStorage.setItem('bcost_token', 'demo-token-local');

    expect(isOperationalDemoFallbackEnabled()).toBe(true);
  });
});

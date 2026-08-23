import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isDemoSession } from '../api';

describe('isDemoSession', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'true');
  });

  it('does not treat missing auth as a demo session', () => {
    expect(isDemoSession()).toBe(false);
  });

  it('detects an explicit demo token as a demo session', () => {
    localStorage.setItem('bcost_token', 'demo-token-local');

    expect(isDemoSession()).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isDemoSession } from '../api';

describe('isDemoSession', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'true');
  });

  it('treats missing auth as a demo session in development', () => {
    expect(isDemoSession()).toBe(true);
  });
});

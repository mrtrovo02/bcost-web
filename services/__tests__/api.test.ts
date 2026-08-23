import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isDemoSession, resolveRequestAuthMetadata } from '../api';

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

  it('adds demo auth metadata for demo company context without a real token', () => {
    expect(resolveRequestAuthMetadata(null, 'demo-001')).toEqual({
      token: 'demo-token-local',
      isDemoRequest: true,
    });
  });

  it('does not downgrade a real token to demo auth even with stale demo company context', () => {
    expect(resolveRequestAuthMetadata('real-jwt-token', 'demo-001')).toEqual({
      token: 'real-jwt-token',
      isDemoRequest: false,
    });
  });
});

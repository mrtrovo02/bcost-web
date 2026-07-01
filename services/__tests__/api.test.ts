import { beforeEach, describe, expect, it } from 'vitest';
import { isDemoSession } from '../api';

describe('isDemoSession', () => {
  beforeEach(() => {
    localStorage.clear();
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_ENABLE_DEMO = 'true';
  });

  it('treats missing auth as a demo session in development', () => {
    expect(isDemoSession()).toBe(true);
  });
});

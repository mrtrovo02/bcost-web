import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import enterpriseUniversalApi from '../enterprise-universal';
import { api } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
  getActiveCompanyId: vi.fn(() => null),
  setActiveCompanyId: vi.fn(),
}));

const apiGetMock = vi.mocked(api.get);

describe('enterpriseUniversalApi', () => {
  const originalDemoFallback = process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
  });

  afterEach(() => {
    if (originalDemoFallback === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = originalDemoFallback;
    }
  });

  it('returns an operational demo fallback when the enterprise module endpoint is unavailable', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 404 } });

    const response = await enterpriseUniversalApi.getModule('users', 'company-123');

    expect(response.status).toBe('OK_WITH_FALLBACK');
    expect(response.items.length).toBeGreaterThan(0);
    expect(response.total).toBeGreaterThan(0);
    expect(response.summary).toMatchObject({ fallback: true, mode: 'DEMO_OPERATIONAL' });
  });

  it('blocks operational demo fallback when the environment disables it', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';
    apiGetMock.mockRejectedValueOnce({ response: { status: 404 } });

    await expect(enterpriseUniversalApi.getModule('users', 'company-123')).rejects.toMatchObject({
      code: 'DEMO_FALLBACK_DISABLED',
    });
  });
});

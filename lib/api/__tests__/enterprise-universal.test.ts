import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a fallback response when the enterprise module endpoint is unavailable', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 404 } });

    const response = await enterpriseUniversalApi.getModule('users', 'company-123');

    expect(response.status).toBe('OK_WITH_FALLBACK');
    expect(response.items).toEqual([]);
    expect(response.total).toBe(0);
    expect(response.summary).toMatchObject({ fallback: true });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enterpriseApi } from '../enterprise';
import { api, isDemoSession } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  isDemoSession: vi.fn(() => false),
}));

const apiGetMock = vi.mocked(api.get);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('enterpriseApi legacy module resolver', () => {
  const originalDemoFallback = process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';
    isDemoSessionMock.mockReturnValue(false);
  });

  afterEach(() => {
    if (originalDemoFallback === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = originalDemoFallback;
    }
  });

  it('blocks silent demo payloads for real sessions when endpoint fails', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 404 } });

    await expect(enterpriseApi.getModuleData('companies', 'company-real-001')).rejects.toMatchObject({
      code: 'DEMO_FALLBACK_DISABLED',
    });
  });

  it('keeps explicit demo company modules local when endpoint fails', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 404 } });

    const payload = await enterpriseApi.getModuleData('companies', 'demo-001');

    expect(payload.connected).toBe(false);
    expect(payload.raw).toMatchObject({ fallback: true });
    expect(payload.records.length).toBeGreaterThan(0);
  });

  it('allows operational fallback when explicitly enabled', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
    apiGetMock.mockRejectedValueOnce({ response: { status: 503 } });

    const payload = await enterpriseApi.getModuleData('companies', 'company-real-001');

    expect(payload.connected).toBe(false);
    expect(payload.raw).toMatchObject({ fallback: true });
  });

  it('returns real API payloads without fallback when the endpoint responds', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: [{ id: 'company-real-001', name: 'Amel Contabilidade Digital LTDA' }],
    });

    const payload = await enterpriseApi.getModuleData('companies', 'company-real-001');

    expect(payload.connected).toBe(true);
    expect(payload.records).toHaveLength(1);
    expect(payload.records[0]).toMatchObject({ id: 'company-real-001' });
  });
});

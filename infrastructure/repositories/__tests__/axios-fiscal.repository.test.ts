import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosFiscalRepository } from '../axios-fiscal.repository';

vi.mock('@/services/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  isDemoSession: vi.fn(),
}));

vi.mock('@/lib/config/demo-policy', () => ({
  assertOperationalDemoFallbackEnabled: vi.fn(),
  isDemoEntityId: (value?: string | null) =>
    typeof value === 'string' && value.toLowerCase().startsWith('demo-'),
}));

const { apiGet, isDemoSession } = await import('@/services/api');
const { assertOperationalDemoFallbackEnabled } = await import('@/lib/config/demo-policy');

const apiGetMock = vi.mocked(apiGet);
const isDemoSessionMock = vi.mocked(isDemoSession);
const assertOperationalDemoFallbackEnabledMock = vi.mocked(assertOperationalDemoFallbackEnabled);

function createAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {
      headers: {},
    } as InternalAxiosRequestConfig,
  };
}

describe('AxiosFiscalRepository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    isDemoSessionMock.mockReturnValue(true);
  });

  it('returns demo fiscal data when the backend endpoint is unavailable in demo mode', async () => {
    apiGetMock.mockRejectedValueOnce({ status: 404 });

    const repository = new AxiosFiscalRepository();
    const entity = await repository.getTaxDataByCompany('demo-001');

    expect(assertOperationalDemoFallbackEnabledMock).toHaveBeenCalled();
    expect(apiGetMock).not.toHaveBeenCalled();
    expect(entity.toJSON()).toMatchObject({
      totalRevenue: expect.any(Number),
      estimatedTax: expect.any(Number),
      netRevenue: expect.any(Number),
      fatorR: expect.any(String),
      totalInvoices: expect.any(Number),
    });
  });

  it('sends the active company id header for real fiscal data requests', async () => {
    isDemoSessionMock.mockReturnValue(false);
    apiGetMock.mockResolvedValueOnce(
      createAxiosResponse({
        totalRevenue: 100000,
        estimatedTax: 10000,
        netRevenue: 90000,
        fatorR: '28.00%',
        totalInvoices: 12,
      }),
    );

    const repository = new AxiosFiscalRepository();
    await repository.getTaxDataByCompany('company-real');

    expect(apiGetMock).toHaveBeenCalledWith(
      '/modules/fiscal/tax-data?company_id=company-real',
      {
        headers: { 'x-company-id': 'company-real' },
      },
    );
  });

  it('does not return demo fiscal data when the backend endpoint fails for a real company', async () => {
    isDemoSessionMock.mockReturnValue(false);
    apiGetMock.mockRejectedValueOnce({ status: 404, message: 'Not Found' });

    const repository = new AxiosFiscalRepository();
    await expect(repository.getTaxDataByCompany('company-real')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('does not return demo fiscal data for a stale demo company id without explicit demo session', async () => {
    isDemoSessionMock.mockReturnValue(false);
    apiGetMock.mockRejectedValueOnce({ status: 401, message: 'Unauthorized' });

    const repository = new AxiosFiscalRepository();
    await expect(repository.getTaxDataByCompany('demo-001')).rejects.toMatchObject({
      status: 401,
    });
    expect(assertOperationalDemoFallbackEnabledMock).not.toHaveBeenCalled();
  });
});

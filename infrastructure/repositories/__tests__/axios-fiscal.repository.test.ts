import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosFiscalRepository } from '../axios-fiscal.repository';

vi.mock('@/services/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  isDemoSession: vi.fn(),
}));

const { apiGet, apiPost, isDemoSession } = await import('@/services/api');

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('AxiosFiscalRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoSessionMock.mockReturnValue(true);
  });

  it('returns demo fiscal data when the backend endpoint is unavailable in demo mode', async () => {
    apiGetMock.mockRejectedValueOnce({ status: 404 });

    const repository = new AxiosFiscalRepository();
    const entity = await repository.getTaxDataByCompany('demo-001');

    expect(entity.toJSON()).toMatchObject({
      totalRevenue: expect.any(Number),
      estimatedTax: expect.any(Number),
      netRevenue: expect.any(Number),
      fatorR: expect.any(String),
      totalInvoices: expect.any(Number),
    });
  });

  it('returns demo fiscal data when the backend endpoint returns 404 for a real company', async () => {
    isDemoSessionMock.mockReturnValue(false);
    apiGetMock.mockRejectedValueOnce({ status: 404, message: 'Not Found' });

    const repository = new AxiosFiscalRepository();
    const entity = await repository.getTaxDataByCompany('company-real');

    expect(entity.toJSON()).toMatchObject({
      totalRevenue: expect.any(Number),
      estimatedTax: expect.any(Number),
      netRevenue: expect.any(Number),
      fatorR: expect.any(String),
      totalInvoices: expect.any(Number),
    });
  });
});

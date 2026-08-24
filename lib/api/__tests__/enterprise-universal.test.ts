import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import enterpriseUniversalApi from '../enterprise-universal';
import { api } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
  getActiveCompanyId: vi.fn(() => null),
  getToken: vi.fn(() => null),
  isDemoSession: vi.fn(() => false),
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

  it('serves explicit demo company modules locally even when global fallback is disabled', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';

    const [module, summary, health] = await Promise.all([
      enterpriseUniversalApi.getModule('users', 'demo-001'),
      enterpriseUniversalApi.summary('users', 'demo-001'),
      enterpriseUniversalApi.health('users', 'demo-001'),
    ]);

    expect(module.status).toBe('OK_WITH_FALLBACK');
    expect(module.companyId).toBe('demo-001');
    expect(module.items.length).toBeGreaterThan(0);
    expect(summary).toMatchObject({ fallback: true, mode: 'DEMO_OPERATIONAL' });
    expect(health).toMatchObject({ slug: 'users', companyId: 'demo-001', status: 'OK_WITH_FALLBACK' });
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('serves regulated roadmap modules without fake operational records in demo mode', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';

    const [bankingProducts, balanceSheet] = await Promise.all([
      enterpriseUniversalApi.getModule('banking-products', 'demo-001'),
      enterpriseUniversalApi.getModule('balance-sheet', 'demo-001'),
    ]);

    expect(bankingProducts).toMatchObject({
      status: 'OK_ROADMAP',
      total: 0,
      items: [],
      summary: {
        roadmap: true,
        mode: 'DEMO_ROADMAP',
        endpoint: '/banking/enterprise/products',
        canonicalOwner: 'banking-enterprise',
        automationBoundary: 'ASSISTED_AUTOMATION',
        operationalGuardrails: expect.arrayContaining([
          expect.stringContaining('parceiro BaaS homologado'),
        ]),
      },
    });
    expect(balanceSheet).toMatchObject({
      status: 'OK_ROADMAP',
      total: 0,
      items: [],
      summary: {
        roadmap: true,
        mode: 'DEMO_ROADMAP',
        canonicalOwner: 'accounting-enterprise',
        automationBoundary: 'CRC_VALIDATED',
        operationalGuardrails: expect.arrayContaining([
          expect.stringContaining('demonstração contábil oficial'),
        ]),
      },
    });
    expect(apiGetMock).not.toHaveBeenCalled();
  });
});

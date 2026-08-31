import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { paymentsApi } from '../payments';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const apiGetMock = vi.mocked(api.get);
const apiPostMock = vi.mocked(api.post);

describe('paymentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates checkout sessions through the backend payments endpoint', async () => {
    apiPostMock.mockResolvedValueOnce({
      data: {
        status: 'OK',
        provider: 'STRIPE',
        companyId: 'company-001',
        planLevel: 'PRO',
        checkoutSession: {
          id: 'checkout-local-id',
          providerCheckoutSessionId: 'cs_test_123',
          checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123',
          status: 'OPEN',
          expiresAt: null,
        },
        generatedAt: '2026-08-31T00:00:00.000Z',
      },
    });

    const response = await paymentsApi.createCheckoutSession('company-001', {
      planLevel: 'PRO',
      successUrl: 'https://app.bcost.com.br/dashboard/settings?billing=success',
      cancelUrl: 'https://app.bcost.com.br/dashboard/settings?billing=cancel',
    });

    expect(response.checkoutSession.providerCheckoutSessionId).toBe('cs_test_123');
    expect(apiPostMock).toHaveBeenCalledWith('/payments/checkout/company-001', {
      planLevel: 'PRO',
      successUrl: 'https://app.bcost.com.br/dashboard/settings?billing=success',
      cancelUrl: 'https://app.bcost.com.br/dashboard/settings?billing=cancel',
    });
  });

  it('loads subscription status with entitlements for the active company', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        status: 'OK',
        companyId: 'company-001',
        subscription: null,
        entitlements: {
          status: 'OK',
          companyId: 'company-001',
          planLevel: 'FREE',
        },
        generatedAt: '2026-08-31T00:00:00.000Z',
      },
    });

    const response = await paymentsApi.subscription('company-001');

    expect(response.companyId).toBe('company-001');
    expect(apiGetMock).toHaveBeenCalledWith('/payments/subscription/company-001');
  });
});

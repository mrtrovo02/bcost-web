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

  it('surfaces active subscription checkout blocks as commercial guidance', async () => {
    apiPostMock.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          status: 'ACTIVE_SUBSCRIPTION_EXISTS',
          message:
            'Empresa já possui assinatura ativa. Use o portal de cobrança para alterar o plano.',
          currentPlanLevel: 'PRO',
          subscriptionStatus: 'ACTIVE',
        },
      },
    });

    await expect(
      paymentsApi.createCheckoutSession('company-001', {
        planLevel: 'ENTERPRISE',
        successUrl: 'https://app.bcost.com.br/dashboard/settings?billing=success',
        cancelUrl: 'https://app.bcost.com.br/dashboard/settings?billing=cancel',
      }),
    ).rejects.toThrow(
      'Empresa já possui assinatura ativa. Use o portal de cobrança para alterar o plano. Plano atual: PRO. Status: ACTIVE.',
    );
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

  it('creates billing portal sessions through the backend payments endpoint', async () => {
    apiPostMock.mockResolvedValueOnce({
      data: {
        status: 'OK',
        provider: 'STRIPE',
        companyId: 'company-001',
        portalSession: {
          providerPortalSessionId: 'bps_123',
          portalUrl: 'https://billing.stripe.com/p/session/bps_123',
        },
        generatedAt: '2026-08-31T00:00:00.000Z',
      },
    });

    const response = await paymentsApi.createBillingPortalSession('company-001', {
      returnUrl: 'https://app.bcost.com.br/dashboard/settings?billing=portal',
    });

    expect(response.portalSession.providerPortalSessionId).toBe('bps_123');
    expect(apiPostMock).toHaveBeenCalledWith('/payments/portal/company-001', {
      returnUrl: 'https://app.bcost.com.br/dashboard/settings?billing=portal',
    });
  });

  it('loads payment webhook events for operational audit', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        status: 'OK',
        companyId: 'company-001',
        events: [
          {
            id: 'event-local-id',
            provider: 'STRIPE',
            providerEventId: 'evt_123',
            eventType: 'checkout.session.completed',
            status: 'PROCESSED',
            processedAt: '2026-08-31T00:00:01.000Z',
            errorMessage: null,
            createdAt: '2026-08-31T00:00:00.000Z',
            updatedAt: '2026-08-31T00:00:01.000Z',
          },
        ],
        generatedAt: '2026-08-31T00:00:02.000Z',
      },
    });

    const response = await paymentsApi.webhookEvents('company-001', {
      status: 'FAILED',
      limit: 25,
    });

    expect(response.events).toHaveLength(1);
    expect(response.events[0]?.providerEventId).toBe('evt_123');
    expect(apiGetMock).toHaveBeenCalledWith('/payments/webhook-events/company-001', {
      params: {
        status: 'FAILED',
        limit: 25,
      },
    });
  });
});

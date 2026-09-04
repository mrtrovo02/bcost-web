import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BillingPlansWidget from '../BillingPlansWidget';
import { billingApi } from '@/lib/api/billing';
import { paymentsApi } from '@/lib/api/payments';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';
import { getToken } from '@/services/api';

vi.mock('@/lib/api/billing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/billing')>();

  return {
    ...actual,
    billingApi: {
      plans: vi.fn(),
      entitlements: vi.fn(),
      updatePlan: vi.fn(),
    },
  };
});

vi.mock('@/lib/api/payments', () => ({
  paymentsApi: {
    subscription: vi.fn(),
    createCheckoutSession: vi.fn(),
    createBillingPortalSession: vi.fn(),
  },
}));

vi.mock('@/lib/api/enterprise-company', () => ({
  resolveEnterpriseCompanyIdWithFallback: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  getToken: vi.fn(),
}));

const billingPlansMock = vi.mocked(billingApi.plans);
const billingEntitlementsMock = vi.mocked(billingApi.entitlements);
const paymentsSubscriptionMock = vi.mocked(paymentsApi.subscription);
const createCheckoutSessionMock = vi.mocked(paymentsApi.createCheckoutSession);
const createBillingPortalSessionMock = vi.mocked(paymentsApi.createBillingPortalSession);
const resolveCompanyIdMock = vi.mocked(resolveEnterpriseCompanyIdWithFallback);
const getTokenMock = vi.mocked(getToken);

const company = {
  id: 'company-001',
  name: 'Empresa Real LTDA',
  cnpj: '12.345.678/0001-90',
  active: true,
};

const plansResponse = {
  status: 'OK',
  plans: [
    {
      level: 'FREE' as const,
      label: 'Free',
      description: 'Plano inicial.',
      limits: {
        companies: 1,
        users: 2,
        invoicesPerMonth: 30,
        bankTransactionsPerMonth: 100,
        automationJobsPerMonth: 20,
        auditRetentionDays: 30,
        aiQuestionsPerMonth: 0,
      },
    },
    {
      level: 'PRO' as const,
      label: 'Pro',
      description: 'Plano profissional.',
      limits: {
        companies: 3,
        users: 10,
        invoicesPerMonth: 500,
        bankTransactionsPerMonth: 2000,
        automationJobsPerMonth: 300,
        auditRetentionDays: 180,
        aiQuestionsPerMonth: 500,
      },
    },
    {
      level: 'ENTERPRISE' as const,
      label: 'Enterprise',
      description: 'Plano enterprise.',
      limits: {
        companies: 999,
        users: 999,
        invoicesPerMonth: 999999,
        bankTransactionsPerMonth: 999999,
        automationJobsPerMonth: 999999,
        auditRetentionDays: 3650,
        aiQuestionsPerMonth: 999999,
      },
    },
  ],
  features: [],
  generatedAt: '2026-09-04T00:00:00.000Z',
};

const freeEntitlementsResponse = {
  status: 'OK',
  companyId: company.id,
  company,
  plan: plansResponse.plans[0],
  planLevel: 'FREE' as const,
  features: [],
  enabledFeatures: [],
  lockedFeatures: [],
  limits: plansResponse.plans[0].limits,
  commercial: {
    canUpgrade: true,
    recommendedPlan: 'PRO' as const,
    upgradeReasons: ['Mais notas mensais.'],
  },
  generatedAt: '2026-09-04T00:00:00.000Z',
};

describe('BillingPlansWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCompanyIdMock.mockResolvedValue(company.id);
    getTokenMock.mockReturnValue('real-jwt-token');
    billingPlansMock.mockResolvedValue(plansResponse);
    billingEntitlementsMock.mockResolvedValue(freeEntitlementsResponse);
  });

  it('routes paid plan changes to the billing portal when the company already has a billable subscription', async () => {
    paymentsSubscriptionMock.mockResolvedValue({
      status: 'OK',
      companyId: company.id,
      subscription: {
        id: 'subscription-001',
        provider: 'STRIPE',
        providerSubscriptionId: 'sub_123',
        providerCustomerId: 'cus_123',
        planLevel: 'PRO',
        status: 'ACTIVE',
        currentPeriodStart: '2026-09-01T00:00:00.000Z',
        currentPeriodEnd: '2026-10-01T00:00:00.000Z',
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEndsAt: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      entitlements: freeEntitlementsResponse,
      generatedAt: '2026-09-04T00:00:00.000Z',
    });
    createBillingPortalSessionMock.mockResolvedValue({
      status: 'OK',
      provider: 'STRIPE',
      companyId: company.id,
      portalSession: {
        providerPortalSessionId: 'bps_123',
        portalUrl: 'https://billing.stripe.com/p/session/bps_123',
      },
      generatedAt: '2026-09-04T00:00:00.000Z',
    });

    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'https://app.bcost.com.br',
        assign: assignMock,
      },
    });

    render(<BillingPlansWidget />);

    const enterpriseButton = await screen.findByRole('button', {
      name: /gerenciar enterprise/i,
    });

    fireEvent.click(enterpriseButton);

    await waitFor(() => {
      expect(createBillingPortalSessionMock).toHaveBeenCalledWith(company.id, {
        returnUrl: 'https://app.bcost.com.br/dashboard/settings?billing=portal',
      });
    });

    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
    expect(assignMock).toHaveBeenCalledWith('https://billing.stripe.com/p/session/bps_123');
  });

  it('starts checkout when there is no billable subscription for the real company', async () => {
    paymentsSubscriptionMock.mockResolvedValue({
      status: 'OK',
      companyId: company.id,
      subscription: null,
      entitlements: freeEntitlementsResponse,
      generatedAt: '2026-09-04T00:00:00.000Z',
    });
    createCheckoutSessionMock.mockResolvedValue({
      status: 'OK',
      provider: 'STRIPE',
      companyId: company.id,
      planLevel: 'PRO',
      checkoutSession: {
        id: 'checkout-001',
        providerCheckoutSessionId: 'cs_123',
        checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_123',
        status: 'OPEN',
        expiresAt: null,
      },
      generatedAt: '2026-09-04T00:00:00.000Z',
    });

    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'https://app.bcost.com.br',
        assign: assignMock,
      },
    });

    render(<BillingPlansWidget />);

    const proButton = await screen.findByRole('button', { name: /ativar pro/i });

    fireEvent.click(proButton);

    await waitFor(() => {
      expect(createCheckoutSessionMock).toHaveBeenCalledWith(company.id, {
        planLevel: 'PRO',
        successUrl: 'https://app.bcost.com.br/dashboard/settings?billing=success',
        cancelUrl: 'https://app.bcost.com.br/dashboard/settings?billing=cancel',
      });
    });

    expect(createBillingPortalSessionMock).not.toHaveBeenCalled();
    expect(assignMock).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_123');
  });
});

'use strict';

import { api } from '@/services/api';
import type { BillingEntitlementsResponse, PlanLevel } from './billing';

export type MonetizablePlanLevel = Exclude<PlanLevel, 'FREE'>;

export type CreateCheckoutSessionInput = {
  planLevel: MonetizablePlanLevel;
  successUrl?: string;
  cancelUrl?: string;
};

export type CreateBillingPortalSessionInput = {
  returnUrl?: string;
};

export type CheckoutSessionResponse = {
  status: string;
  provider: 'STRIPE';
  companyId: string;
  planLevel: MonetizablePlanLevel;
  checkoutSession: {
    id: string;
    providerCheckoutSessionId: string;
    checkoutUrl: string;
    status: string;
    expiresAt?: string | null;
  };
  generatedAt: string;
};

export type BillingPortalSessionResponse = {
  status: string;
  provider: 'STRIPE';
  companyId: string;
  portalSession: {
    providerPortalSessionId: string;
    portalUrl: string;
  };
  generatedAt: string;
};

export type PaymentSubscriptionResponse = {
  status: string;
  companyId: string;
  subscription: {
    id: string;
    provider: string;
    providerSubscriptionId: string;
    providerCustomerId?: string | null;
    planLevel: string;
    status: string;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd: boolean;
    canceledAt?: string | null;
    trialEndsAt?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  entitlements: BillingEntitlementsResponse;
  generatedAt: string;
};

export type PaymentWebhookDeliveryStatus =
  | 'RECEIVED'
  | 'PROCESSED'
  | 'IGNORED'
  | 'FAILED';

export type PaymentWebhookEvent = {
  id: string;
  provider: 'STRIPE' | 'PAGARME' | 'MERCADO_PAGO';
  providerEventId: string;
  eventType: string;
  status: PaymentWebhookDeliveryStatus;
  processedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentWebhookEventsResponse = {
  status: string;
  companyId: string;
  filters?: {
    status?: PaymentWebhookDeliveryStatus | null;
    limit: number;
  };
  events: PaymentWebhookEvent[];
  generatedAt: string;
};

export type PaymentWebhookEventsQuery = {
  status?: PaymentWebhookDeliveryStatus;
  limit?: number;
};

export const paymentsApi = {
  createCheckoutSession: async (
    companyId: string,
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSessionResponse> => {
    const response = await api.post<CheckoutSessionResponse>(
      `/payments/checkout/${companyId}`,
      input,
    );

    return response.data;
  },

  createBillingPortalSession: async (
    companyId: string,
    input: CreateBillingPortalSessionInput,
  ): Promise<BillingPortalSessionResponse> => {
    const response = await api.post<BillingPortalSessionResponse>(
      `/payments/portal/${companyId}`,
      input,
    );

    return response.data;
  },

  subscription: async (companyId: string): Promise<PaymentSubscriptionResponse> => {
    const response = await api.get<PaymentSubscriptionResponse>(
      `/payments/subscription/${companyId}`,
    );

    return response.data;
  },

  webhookEvents: async (
    companyId: string,
    query: PaymentWebhookEventsQuery = {},
  ): Promise<PaymentWebhookEventsResponse> => {
    const response = await api.get<PaymentWebhookEventsResponse>(
      `/payments/webhook-events/${companyId}`,
      { params: query },
    );

    return response.data;
  },
};

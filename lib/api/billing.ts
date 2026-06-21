'use strict';

import { api } from '@/services/api';

export type PlanLevel = 'FREE' | 'PRO' | 'ENTERPRISE';

export type BillingPlanLimits = {
  companies: number;
  users: number;
  invoicesPerMonth: number;
  bankTransactionsPerMonth: number;
  automationJobsPerMonth: number;
  auditRetentionDays: number;
  aiQuestionsPerMonth: number;
};

export type BillingPlan = {
  level: PlanLevel;
  label: string;
  description: string;
  limits: BillingPlanLimits;
};

export type BillingFeature = {
  key: string;
  label: string;
  description: string;
  minPlan: PlanLevel;
  enabled?: boolean;
  locked?: boolean;
};

export type BillingCommercialInfo = {
  canUpgrade: boolean;
  recommendedPlan: PlanLevel | null;
  upgradeReasons: string[];
};

export type BillingEntitlementsResponse = {
  status: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    cnpj: string;
    taxRegime?: string;
    active?: boolean;
  };
  plan: BillingPlan;
  planLevel: PlanLevel;
  features: BillingFeature[];
  enabledFeatures: string[];
  lockedFeatures: string[];
  limits: BillingPlanLimits;
  commercial: BillingCommercialInfo;
  generatedAt: string;
};

export type BillingPlansResponse = {
  status: string;
  plans: BillingPlan[];
  features: BillingFeature[];
  generatedAt: string;
};

export type BillingFeatureCheckResponse = {
  status: 'ALLOWED' | 'LOCKED' | 'UNKNOWN_FEATURE' | string;
  allowed: boolean;
  companyId: string;
  planLevel: PlanLevel;
  featureKey?: string;
  feature?: BillingFeature;
  message: string;
  generatedAt: string;
};

export type BillingUpdatePlanResponse = BillingEntitlementsResponse & {
  message: string;
  oldPlan: PlanLevel;
  newPlan: PlanLevel;
  audit: {
    recorded: boolean;
    error?: string;
  };
};

export const billingApi = {
  plans: async (): Promise<BillingPlansResponse> => {
    const response = await api.get<BillingPlansResponse>('/billing/plans');
    return response.data;
  },

  entitlements: async (companyId: string): Promise<BillingEntitlementsResponse> => {
    const response = await api.get<BillingEntitlementsResponse>(
      `/billing/entitlements/${companyId}`,
    );

    return response.data;
  },

  checkFeature: async (
    companyId: string,
    feature: string,
  ): Promise<BillingFeatureCheckResponse> => {
    const response = await api.get<BillingFeatureCheckResponse>(
      `/billing/features/${companyId}/check`,
      {
        params: {
          feature,
        },
      },
    );

    return response.data;
  },

  updatePlan: async (
    companyId: string,
    planLevel: PlanLevel,
    reason?: string,
  ): Promise<BillingUpdatePlanResponse> => {
    const response = await api.patch<BillingUpdatePlanResponse>(`/billing/plan/${companyId}`, {
      planLevel,
      reason: reason || `Alteração de plano solicitada via Dashboard Enterprise para ${planLevel}`,
    });

    return response.data;
  },
};

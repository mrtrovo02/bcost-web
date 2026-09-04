'use strict';

import { api, getToken, isDemoSession } from '@/services/api';
import { assertOperationalDemoFallbackEnabled, isDemoEntityId } from '@/lib/config/demo-policy';
import {
  getModuleMarketReadiness,
  getSchemaModuleBySlug,
  type BcostMarketReadiness,
} from '@/lib/product/schema-modules';

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
  moduleSlug?: string;
  marketReadiness?: BcostMarketReadiness;
  commercialGuardrail?: string;
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

function hasRealAuthToken(): boolean {
  const token = getToken();
  return Boolean(token && token !== 'demo-token-local');
}

function assertBillingDemoFallbackAllowed(message: string): void {
  if (hasRealAuthToken() && !isDemoSession()) {
    throw new Error(message);
  }

  assertOperationalDemoFallbackEnabled(message);
}

function assertBillingCompanyDemoFallbackAllowed(companyId: string, message: string): void {
  if (!isDemoEntityId(companyId)) {
    throw new Error(message);
  }

  assertBillingDemoFallbackAllowed(message);
}

function isDemoBillingCompany(companyId: string): boolean {
  return isDemoEntityId(companyId);
}

export const DEMO_BILLING_PLANS: BillingPlan[] = [
  {
    level: 'FREE',
    label: 'Free',
    description: 'Plano inicial para validação do produto.',
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
    level: 'PRO',
    label: 'Pro',
    description: 'Plano profissional para operação fiscal/financeira recorrente.',
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
    level: 'ENTERPRISE',
    label: 'Enterprise',
    description: 'Plano enterprise multiusuário, auditável e com automação avançada.',
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
];

export const DEMO_BILLING_FEATURES: BillingFeature[] = [
  {
    key: 'dashboard.enterprise',
    label: 'Dashboard Enterprise',
    description: 'Visão executiva consolidada com indicadores operacionais.',
    minPlan: 'FREE',
    moduleSlug: 'command-center',
  },
  {
    key: 'fiscal.diagnostics',
    label: 'Diagnóstico fiscal',
    description: 'Análise fiscal, saúde tributária e indicadores do Simples.',
    minPlan: 'FREE',
    moduleSlug: 'tax-scenarios',
  },
  {
    key: 'banking.reconciliation',
    label: 'Conciliação bancária',
    description: 'Motor de conciliação automática entre banco e documentos fiscais.',
    minPlan: 'PRO',
    moduleSlug: 'bank-transactions',
  },
  {
    key: 'accounting.entries',
    label: 'Lançamentos contábeis',
    description: 'Base contábil para fechamento e classificação.',
    minPlan: 'PRO',
    moduleSlug: 'accounting-entries',
  },
  {
    key: 'digital.certificates',
    label: 'Certificados digitais',
    description: 'Gestão de metadados, validade e alertas de vencimento de certificados.',
    minPlan: 'ENTERPRISE',
    moduleSlug: 'digital-certificates',
  },
  {
    key: 'ai.copilot',
    label: 'Copilot fiscal',
    description: 'Assistente fiscal/financeiro com IA e contexto da empresa.',
    minPlan: 'ENTERPRISE',
    marketReadiness: 'ROADMAP_LOCKED',
    commercialGuardrail:
      'Não vender como automação fiscal autônoma até existir módulo, trilha de auditoria e política de revisão humana.',
  },
];

function enrichBillingFeatureWithReadiness(feature: BillingFeature): BillingFeature {
  if (feature.marketReadiness) return feature;
  if (!feature.moduleSlug) return feature;

  const module = getSchemaModuleBySlug(feature.moduleSlug);
  const marketReadiness = module ? getModuleMarketReadiness(module.status) : 'ROADMAP_LOCKED';
  const commercialGuardrail =
    marketReadiness === 'SELLABLE'
      ? 'Feature pode ser oferecida conforme plano ativo, tenant válido e endpoint produtivo.'
      : marketReadiness === 'ASSISTED_BETA'
        ? 'Feature exige venda assistida, evidência operacional e aceite explícito de escopo.'
        : 'Feature não deve ser prometida como operação produtiva até o módulo sair do roadmap bloqueado.';

  return {
    ...feature,
    marketReadiness,
    commercialGuardrail,
  };
}

export function getDemoBillingEntitlements(
  company?: { id?: string; name?: string; cnpj?: string } | null,
  planLevel: PlanLevel = 'ENTERPRISE',
): BillingEntitlementsResponse {
  const plan = DEMO_BILLING_PLANS.find((item) => item.level === planLevel) ?? DEMO_BILLING_PLANS[0];
  const planOrder: Record<PlanLevel, number> = { FREE: 1, PRO: 2, ENTERPRISE: 3 };
  const features = DEMO_BILLING_FEATURES.map(enrichBillingFeatureWithReadiness).map((feature) => {
    const enabled = planOrder[planLevel] >= planOrder[feature.minPlan];

    return {
      ...feature,
      enabled,
      locked: !enabled,
    };
  });

  return {
    status: 'OK_DEMO',
    companyId: company?.id ?? 'demo-001',
    company: {
      id: company?.id ?? 'demo-001',
      name: company?.name ?? 'Empresa Demo',
      cnpj: company?.cnpj ?? '00.000.000/0001-91',
      active: true,
    },
    plan,
    planLevel,
    features,
    enabledFeatures: features.filter((feature) => feature.enabled).map((feature) => feature.key),
    lockedFeatures: features.filter((feature) => feature.locked).map((feature) => feature.key),
    limits: plan.limits,
    commercial: {
      canUpgrade: false,
      recommendedPlan: null,
      upgradeReasons: [],
    },
    generatedAt: new Date().toISOString(),
  };
}

export const billingApi = {
  plans: async (): Promise<BillingPlansResponse> => {
    try {
      const response = await api.get<BillingPlansResponse>('/billing/plans');
      return response.data;
    } catch {
      assertBillingDemoFallbackAllowed(
        'Planos comerciais indisponiveis e fallback demonstrativo desabilitado neste ambiente.',
      );

      return {
        status: 'OK_DEMO',
        plans: DEMO_BILLING_PLANS,
        features: DEMO_BILLING_FEATURES.map(enrichBillingFeatureWithReadiness),
        generatedAt: new Date().toISOString(),
      };
    }
  },

  entitlements: async (companyId: string): Promise<BillingEntitlementsResponse> => {
    if (isDemoBillingCompany(companyId)) {
      return getDemoBillingEntitlements({ id: companyId }, 'ENTERPRISE');
    }

    try {
      const response = await api.get<BillingEntitlementsResponse>(
        `/billing/entitlements/${companyId}`,
      );

      return response.data;
    } catch {
      assertBillingCompanyDemoFallbackAllowed(
        companyId,
        'Entitlements comerciais indisponiveis e fallback demonstrativo desabilitado neste ambiente.',
      );

      return getDemoBillingEntitlements({ id: companyId }, 'ENTERPRISE');
    }
  },

  checkFeature: async (
    companyId: string,
    feature: string,
  ): Promise<BillingFeatureCheckResponse> => {
    if (isDemoBillingCompany(companyId)) {
      const demo = getDemoBillingEntitlements({ id: companyId }, 'ENTERPRISE');
      const found = demo.features.find((item) => item.key === feature);

      return {
        status: found ? 'ALLOWED_DEMO' : 'UNKNOWN_FEATURE_DEMO',
        allowed: Boolean(found),
        companyId,
        planLevel: demo.planLevel,
        featureKey: feature,
        feature: found,
        message: found
          ? 'Feature liberada no modo demonstrativo.'
          : 'Feature não catalogada no modo demonstrativo.',
        generatedAt: new Date().toISOString(),
      };
    }

    try {
      const response = await api.get<BillingFeatureCheckResponse>(
        `/billing/features/${companyId}/check`,
        {
          params: {
            feature,
          },
        },
      );

      return response.data;
    } catch {
      assertBillingCompanyDemoFallbackAllowed(
        companyId,
        'Validacao de feature indisponivel e fallback demonstrativo desabilitado neste ambiente.',
      );

      const demo = getDemoBillingEntitlements({ id: companyId }, 'ENTERPRISE');
      const found = demo.features.find((item) => item.key === feature);

      return {
        status: found ? 'ALLOWED_DEMO' : 'UNKNOWN_FEATURE_DEMO',
        allowed: Boolean(found),
        companyId,
        planLevel: demo.planLevel,
        featureKey: feature,
        feature: found,
        message: found
          ? 'Feature liberada no modo demonstrativo.'
          : 'Feature não catalogada no modo demonstrativo.',
        generatedAt: new Date().toISOString(),
      };
    }
  },

  updatePlan: async (
    companyId: string,
    planLevel: PlanLevel,
    reason?: string,
  ): Promise<BillingUpdatePlanResponse> => {
    if (isDemoBillingCompany(companyId)) {
      return {
        ...getDemoBillingEntitlements({ id: companyId }, planLevel),
        message: `Plano simulado como ${planLevel}. Conecte a API para persistir a alteração.`,
        oldPlan: 'ENTERPRISE',
        newPlan: planLevel,
        audit: {
          recorded: true,
        },
      };
    }

    try {
      const response = await api.patch<BillingUpdatePlanResponse>(`/billing/plan/${companyId}`, {
        planLevel,
        reason:
          reason || `Alteração de plano solicitada via Dashboard Enterprise para ${planLevel}`,
      });

      return response.data;
    } catch {
      assertBillingCompanyDemoFallbackAllowed(
        companyId,
        'Alteracao de plano indisponivel e fallback demonstrativo desabilitado neste ambiente.',
      );

      return {
        ...getDemoBillingEntitlements({ id: companyId }, planLevel),
        message: `Plano simulado como ${planLevel}. Conecte a API para persistir a alteração.`,
        oldPlan: 'ENTERPRISE',
        newPlan: planLevel,
        audit: {
          recorded: false,
          error: 'Modo demonstrativo: alteração não persistida.',
        },
      };
    }
  },
};

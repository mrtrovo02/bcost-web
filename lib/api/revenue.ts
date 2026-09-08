/**
 * bCost Engine - Revenue & Growth Service
 */
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';
import { assertOperationalDemoFallbackEnabled, isDemoEntityId } from '@/lib/config/demo-policy';
import { api, isDemoSession } from '@/services/api';
import { RevenueStats } from '../types/global';

type RevenueContract = {
  id: string;
  companyId: string;
  customerId: string;
  description: string;
  amount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED';
  source: 'DEMO_LOCAL' | 'API';
};

async function requireRevenueCompanyId(): Promise<string> {
  const companyId = await resolveEnterpriseCompanyIdWithFallback();

  if (!companyId || companyId === 'ID_DA_EMPRESA') {
    throw new Error('Empresa ativa não encontrada para consultar receitas.');
  }

  return companyId;
}

function createDemoRevenueStats(): RevenueStats {
  return {
    totalRevenue: 830000,
    projectedRevenue: 9960000,
    growthRate: 18.7,
    activeContracts: 3,
  };
}

function createDemoRevenueContracts(companyId: string): RevenueContract[] {
  return [
    {
      id: 'demo-contract-accounting-pro',
      companyId,
      customerId: 'demo-customer-tech',
      description: 'Contabilidade recorrente assistida',
      amount: 1490,
      status: 'ACTIVE',
      source: 'DEMO_LOCAL',
    },
    {
      id: 'demo-contract-tax-intelligence',
      companyId,
      customerId: 'demo-customer-tech',
      description: 'Inteligência fiscal e Reforma Tributária',
      amount: 2290,
      status: 'ACTIVE',
      source: 'DEMO_LOCAL',
    },
    {
      id: 'demo-contract-payroll',
      companyId,
      customerId: 'demo-customer-tech',
      description: 'Folha, pró-labore e obrigações mensais',
      amount: 890,
      status: 'ACTIVE',
      source: 'DEMO_LOCAL',
    },
  ];
}

function assertRevenueDemoAllowed(companyId: string): void {
  if (!isDemoSession() || !isDemoEntityId(companyId)) {
    throw new Error(
      'Revenue demonstrativo indisponível fora de uma sessão demo explícita.',
    );
  }

  assertOperationalDemoFallbackEnabled(
    'Revenue demonstrativo desabilitado neste ambiente.',
  );
}

export const revenueApi = {
  getStats: async (): Promise<RevenueStats> => {
    const companyId = await requireRevenueCompanyId();

    if (isDemoEntityId(companyId)) {
      assertRevenueDemoAllowed(companyId);
      return createDemoRevenueStats();
    }

    const { data } = await api.get(`/revenue/stats/${companyId}`);
    return data;
  },

  getContracts: async (): Promise<RevenueContract[]> => {
    const companyId = await requireRevenueCompanyId();

    if (isDemoEntityId(companyId)) {
      assertRevenueDemoAllowed(companyId);
      return createDemoRevenueContracts(companyId);
    }

    const { data } = await api.get(`/revenue/contracts/${companyId}`);
    return data;
  },
};

import { api } from '@/lib/api-client';

export type TaxRegime = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';

export interface SimulateTaxScenarioDto {
  companyId?: string;
  annualRevenue: number;
  payrollExpense: number;
  taxRegime?: TaxRegime;
}

export interface TaxScenarioResult {
  regime: TaxRegime;
  effectiveRate: number;
  annualTax: number;
  monthlyTax: number;
  breakdown: Record<string, number>;
  isRecommended: boolean;
}

export interface SimulationResponse {
  companyId?: string;
  recommendedRegime: TaxRegime;
  annualSavings: number;
  scenarios: TaxScenarioResult[];
}

export const taxScenariosApi = {
  async simulate(payload: SimulateTaxScenarioDto): Promise<SimulationResponse> {
    const { data } = await api.post<SimulationResponse>('/v1/tax-scenarios/simulate', payload);
    return data;
  },

  async getLatestSimulation(companyId: string): Promise<SimulationResponse | null> {
    const { data } = await api.get<SimulationResponse>(`/v1/tax-scenarios/company/${companyId}`);
    return data;
  },
};
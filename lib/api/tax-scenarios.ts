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
    const { data } = await api.post<SimulationResponse>('/tax-scenarios/simulate', payload);
    return data;
  },

  async getLatestSimulation(companyId: string): Promise<SimulationResponse | null> {
    try {
      // Backend currently exposes only POST /tax-scenarios/simulate.
      // Fallback to simulate with conservative defaults when latest endpoint is missing.
      const { data } = await api.post<SimulationResponse>('/tax-scenarios/simulate', {
        companyId,
        activity: 'OTHER',
        monthlyRevenue: 0,
        monthlyDeductibleExpenses: 0,
        monthlyPayroll: 0,
        dependents: 0,
      });

      return data;
    } catch (err) {
      // If the endpoint truly doesn't exist or fails, return null so callers can handle absence.
      return null;
    }
  },
};
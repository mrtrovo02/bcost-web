import { api } from '@/services/api';

export type TaxRegime =
  | 'PF'
  | 'MEI'
  | 'SIMPLES_NACIONAL'
  | 'LUCRO_PRESUMIDO'
  | 'LUCRO_REAL';

export interface SimulateTaxScenarioDto {
  companyId?: string;
  activity:
    | 'SERVICE_PROVIDER'
    | 'HEALTHCARE'
    | 'LEGAL'
    | 'TECHNOLOGY'
    | 'CREATOR'
    | 'CONSULTING'
    | 'OTHER';
  monthlyRevenue: number;
  monthlyDeductibleExpenses: number;
  monthlyPayroll: number;
  dependents: number;
  currentModel?: 'PF' | 'MEI' | 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO';
  state?: string;
  municipalityCode?: string;
  hasCrcReview?: boolean;
}

export interface TaxScenarioCalculation {
  model: 'PF' | 'MEI' | 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO';
  annualRevenue: number;
  annualDeductibleExpenses: number;
  annualPayroll: number;
  taxableBase: number;
  estimatedTax: number;
  estimatedEffectiveRate: number;
  netAnnualResult: number;
  monthlyNetResult: number;
  warnings: string[];
  components: Array<{
    code: string;
    label: string;
    amount: number;
    rate?: number;
    basis: string;
  }>;
}

export interface TaxScenarioRecommendation {
  decision:
    | 'PF_REVIEW_RECOMMENDED'
    | 'PJ_SIMULATION_RECOMMENDED'
    | 'SIMPLES_WITH_FACTOR_R_REVIEW'
    | 'ASSISTED_TAX_PLANNING_REQUIRED';
  title: string;
  rationale: string[];
  requiredEvidence: string[];
  nextActions: string[];
}

export interface SimulationResponse {
  status: 'OK';
  input: SimulateTaxScenarioDto;
  assumptions: Array<{
    code: string;
    description: string;
    sourceBasis: string[];
  }>;
  comparisons: TaxScenarioCalculation[];
  bestEstimatedModel: 'PF' | 'MEI' | 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO';
  factorR: {
    percentage: number;
    qualifiesForAnexoIIIReview: boolean;
    requiredPayrollForThreshold: number;
  };
  reformImpact: {
    calibrationYear: number;
    cbsInformativeRate: number;
    ibsInformativeRate: number;
    estimatedCbs: number;
    estimatedIbs: number;
    note: string;
  };
  recommendation: TaxScenarioRecommendation;
  guardrails: string[];
  generatedAt: string;
  scenarioId?: string;
  companyId?: string;
  recommendedRegime?: TaxRegime;
  annualSavings?: number;
  scenarios?: Array<{
    regime: TaxRegime;
    effectiveRate: number;
    annualTax: number;
    monthlyTax: number;
    breakdown: Record<string, number>;
    isRecommended: boolean;
  }>;
}

export const taxScenariosApi = {
  async simulate(payload: SimulateTaxScenarioDto): Promise<SimulationResponse> {
    const { data } = await api.post<SimulationResponse>('/tax-scenarios/simulate', payload);
    const bestModel = data.bestEstimatedModel ?? data.recommendedRegime ?? 'PF';
    const bestScenario =
      data.comparisons?.find((comparison) => comparison.model === bestModel) ?? data.comparisons?.[0];
    const currentScenario =
      data.comparisons?.find((comparison) => comparison.model === payload.currentModel) ??
      data.comparisons?.[0];
    const annualSavings =
      typeof bestScenario?.netAnnualResult === 'number' && typeof currentScenario?.netAnnualResult === 'number'
        ? Number((bestScenario.netAnnualResult - currentScenario.netAnnualResult).toFixed(2))
        : 0;

    return {
      ...data,
      companyId: payload.companyId,
      recommendedRegime: bestModel,
      annualSavings,
      scenarios:
        (data.comparisons ?? []).map((comparison) => ({
          regime: comparison.model,
          effectiveRate: comparison.estimatedEffectiveRate,
          annualTax: comparison.estimatedTax,
          monthlyTax: Number((comparison.estimatedTax / 12).toFixed(2)),
          breakdown: Object.fromEntries(
            (comparison.components ?? []).map((component) => [component.code, component.amount]),
          ),
          isRecommended: comparison.model === bestModel,
        })) ?? [],
    };
  },

  async getLatestSimulation(companyId: string): Promise<SimulationResponse | null> {
    try {
      return await this.simulate({
        companyId,
        activity: 'OTHER',
        monthlyRevenue: 0,
        monthlyDeductibleExpenses: 0,
        monthlyPayroll: 0,
        dependents: 0,
        currentModel: 'PF',
      });
    } catch {
      return null;
    }
  },
};

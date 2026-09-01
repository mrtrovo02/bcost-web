import { describe, expect, it, vi, beforeEach } from 'vitest';
import { taxScenariosApi, type SimulationResponse } from '../tax-scenarios';
import { api, getActiveCompanyId } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn(),
  },
  getActiveCompanyId: vi.fn(),
}));

const apiPostMock = vi.mocked(api.post);
const getActiveCompanyIdMock = vi.mocked(getActiveCompanyId);

const API_RESPONSE: SimulationResponse = {
  status: 'OK',
  input: {
    activity: 'SERVICE_PROVIDER',
    monthlyRevenue: 220_000,
    monthlyDeductibleExpenses: 35_000,
    monthlyPayroll: 50_000,
    dependents: 1,
    currentModel: 'PF',
  },
  assumptions: [],
  comparisons: [
    {
      model: 'PF',
      annualRevenue: 2_640_000,
      annualDeductibleExpenses: 420_000,
      annualPayroll: 0,
      taxableBase: 2_217_724.92,
      estimatedTax: 600_000,
      estimatedEffectiveRate: 22.73,
      netAnnualResult: 1_620_000,
      monthlyNetResult: 135_000,
      warnings: [],
      components: [],
    },
    {
      model: 'SIMPLES_NACIONAL',
      annualRevenue: 2_640_000,
      annualDeductibleExpenses: 0,
      annualPayroll: 600_000,
      taxableBase: 2_640_000,
      estimatedTax: 409_200,
      estimatedEffectiveRate: 15.5,
      netAnnualResult: 2_230_800,
      monthlyNetResult: 185_900,
      warnings: [],
      components: [],
    },
  ],
  bestEstimatedModel: 'SIMPLES_NACIONAL',
  factorR: {
    percentage: 22.73,
    qualifiesForAnexoIIIReview: false,
    requiredPayrollForThreshold: 139_200,
  },
  reformImpact: {
    calibrationYear: 2026,
    cbsInformativeRate: 0.009,
    ibsInformativeRate: 0.001,
    estimatedCbs: 23_760,
    estimatedIbs: 2_640,
    note: 'Informativo.',
  },
  recommendation: {
    decision: 'SIMPLES_WITH_FACTOR_R_REVIEW',
    title: 'Revisar Fator R',
    rationale: [],
    requiredEvidence: [],
    nextActions: [],
  },
  guardrails: [],
  generatedAt: '2026-09-01T00:00:00.000Z',
};

describe('taxScenariosApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses active company ID when payload does not include companyId', async () => {
    getActiveCompanyIdMock.mockReturnValueOnce('demo-001');
    apiPostMock.mockResolvedValueOnce({ data: API_RESPONSE });

    const result = await taxScenariosApi.simulate({
      activity: 'SERVICE_PROVIDER',
      monthlyRevenue: 220_000,
      monthlyDeductibleExpenses: 35_000,
      monthlyPayroll: 50_000,
      dependents: 1,
      currentModel: 'PF',
    });

    expect(apiPostMock).toHaveBeenCalledWith('/tax-scenarios/simulate', {
      activity: 'SERVICE_PROVIDER',
      monthlyRevenue: 220_000,
      monthlyDeductibleExpenses: 35_000,
      monthlyPayroll: 50_000,
      dependents: 1,
      currentModel: 'PF',
      companyId: 'demo-001',
    });
    expect(result.companyId).toBe('demo-001');
    expect(result.recommendedRegime).toBe('SIMPLES_NACIONAL');
    expect(result.annualSavings).toBe(610_800);
  });
});

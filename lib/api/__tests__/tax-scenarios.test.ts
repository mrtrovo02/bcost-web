import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { taxScenariosApi, type SimulationResponse } from '../tax-scenarios';
import { api, getActiveCompanyId, isDemoSession } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn(),
  },
  getActiveCompanyId: vi.fn(),
  isDemoSession: vi.fn(),
}));

const apiPostMock = vi.mocked(api.post);
const getActiveCompanyIdMock = vi.mocked(getActiveCompanyId);
const isDemoSessionMock = vi.mocked(isDemoSession);

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
    isDemoSessionMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it('keeps demo simulator operational when the protected API rejects the request', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'true');
    getActiveCompanyIdMock.mockReturnValueOnce('demo-001');
    isDemoSessionMock.mockReturnValue(true);
    apiPostMock.mockRejectedValueOnce(new Error('Request failed with status code 401'));

    const result = await taxScenariosApi.simulate({
      activity: 'SERVICE_PROVIDER',
      monthlyRevenue: 220_000,
      monthlyDeductibleExpenses: 35_000,
      monthlyPayroll: 50_000,
      dependents: 1,
      currentModel: 'SIMPLES_NACIONAL',
    });

    expect(result.status).toBe('OK');
    expect(result.companyId).toBe('demo-001');
    expect(result.scenarioId).toBe('demo-local-tax-scenario');
    expect(result.comparisons).toHaveLength(4);
    expect(result.scenarios?.some((scenario) => scenario.isRecommended)).toBe(true);
    expect(result.guardrails.join(' ')).toContain('empresas reais continuam exigindo API autenticada');
  });

  it('blocks Simples Nacional in demo fallback when annualized revenue exceeds the legal limit', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'true');
    getActiveCompanyIdMock.mockReturnValueOnce('demo-001');
    isDemoSessionMock.mockReturnValue(true);
    apiPostMock.mockRejectedValueOnce(new Error('Request failed with status code 401'));

    const result = await taxScenariosApi.simulate({
      activity: 'SERVICE_PROVIDER',
      monthlyRevenue: 2_220_000,
      monthlyDeductibleExpenses: 35_000,
      monthlyPayroll: 550_000,
      dependents: 10,
      currentModel: 'SIMPLES_NACIONAL',
    });
    const simples = result.comparisons.find((comparison) => comparison.model === 'SIMPLES_NACIONAL');

    expect(result.bestEstimatedModel).not.toBe('SIMPLES_NACIONAL');
    expect(result.recommendation.title).toBe('Simples Nacional bloqueado pelo limite de receita');
    expect(simples?.eligibilityStatus).toBe('INELIGIBLE');
    expect(simples?.estimatedTax).toBe(-1);
    expect(result.guardrails.join(' ')).toContain('R$ 4,8 milhões');
  });

  it('blocks MEI recommendation in demo fallback when payroll requires operational validation', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'true');
    getActiveCompanyIdMock.mockReturnValueOnce('demo-001');
    isDemoSessionMock.mockReturnValue(true);
    apiPostMock.mockRejectedValueOnce(new Error('Request failed with status code 401'));

    const result = await taxScenariosApi.simulate({
      activity: 'TECHNOLOGY',
      monthlyRevenue: 5_000,
      monthlyDeductibleExpenses: 800,
      monthlyPayroll: 16_000,
      dependents: 3,
      currentModel: 'PF',
    });
    const mei = result.comparisons.find((comparison) => comparison.model === 'MEI');
    const simples = result.comparisons.find((comparison) => comparison.model === 'SIMPLES_NACIONAL');
    const lucroPresumido = result.comparisons.find((comparison) => comparison.model === 'LUCRO_PRESUMIDO');

    expect(result.factorR.percentage).toBe(320);
    expect(result.bestEstimatedModel).toBe('PF');
    expect(result.recommendation.decision).toBe('PF_REVIEW_RECOMMENDED');
    expect(result.recommendation.title).toBe('PF permanece melhor na simulação preliminar');
    expect(mei?.eligibilityStatus).toBe('REQUIRES_REVIEW');
    expect(mei?.estimatedTax).toBe(-1);
    expect(mei?.warnings.join(' ')).toContain('folha informada');
    expect(simples?.netAnnualResult).toBeLessThan(0);
    expect(lucroPresumido?.netAnnualResult).toBeLessThan(0);
  });

  it('does not report savings against an ineligible current model', async () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'true');
    getActiveCompanyIdMock.mockReturnValueOnce('demo-001');
    isDemoSessionMock.mockReturnValue(true);
    apiPostMock.mockRejectedValueOnce(new Error('Request failed with status code 401'));

    const result = await taxScenariosApi.simulate({
      activity: 'SERVICE_PROVIDER',
      monthlyRevenue: 220_000,
      monthlyDeductibleExpenses: 35_000,
      monthlyPayroll: 50_000,
      dependents: 1,
      currentModel: 'MEI',
    });

    expect(result.bestEstimatedModel).toBe('PF');
    expect(result.annualSavings).toBe(0);
    expect(result.recommendation.rationale.join(' ')).not.toContain('Ganho anual estimado');
  });

  it('does not use demo fallback for real authenticated company failures', async () => {
    getActiveCompanyIdMock.mockReturnValueOnce('6befc33e-95cd-4ef4-b8d4-9d5bf1e15f1b');
    isDemoSessionMock.mockReturnValue(false);
    apiPostMock.mockRejectedValueOnce(new Error('Request failed with status code 401'));

    await expect(
      taxScenariosApi.simulate({
        activity: 'SERVICE_PROVIDER',
        monthlyRevenue: 220_000,
        monthlyDeductibleExpenses: 35_000,
        monthlyPayroll: 50_000,
        dependents: 1,
        currentModel: 'SIMPLES_NACIONAL',
      }),
    ).rejects.toThrow('Request failed with status code 401');
  });
});

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
  complianceTrail: {
    version: 'tax-scenarios-compliance-2026.1',
    calculationMode: 'ESTIMATIVE_TRIAGE',
    officialAssessment: false,
    evaluatedAt: '2026-09-01T00:00:00.000Z',
    commercialDecision: {
      status: 'ASSISTED_REVIEW_REQUIRED',
      canGenerateProposal: false,
      requiresCrcReview: true,
      reasons: ['Fator R exige revisão assistida.'],
      blockedRuleCodes: [],
      reviewRuleCodes: ['FACTOR_R_THRESHOLD', 'OFFICIAL_ASSESSMENT_LOCK'],
    },
    rules: [
      {
        code: 'FACTOR_R_THRESHOLD',
        status: 'REQUIRES_REVIEW',
        severity: 'HIGH',
        title: 'Fator R',
        result: 'Fator R abaixo de 28%.',
        legalBasis: ['Lei Complementar 123/2006, art. 18.'],
        evidenceRequired: ['Folha e pró-labore dos últimos 12 meses', 'RBT12 oficial'],
        officialAssessment: false,
      },
    ],
    disclaimers: [],
  },
  serviceQualification: {
    stage: 'NEEDS_DISCOVERY',
    primaryOffer: {
      sku: 'TAX_REGIME_CRC_REVIEW',
      title: 'Revisão CRC de Fator R e regime tributário',
      checkoutMode: 'SALES_REVIEW_ONLY',
    },
    allowedActions: ['REQUEST_DOCUMENTS', 'SCHEDULE_CRC_REVIEW'],
    missingEvidence: ['Folha e pró-labore dos últimos 12 meses', 'RBT12 oficial'],
    salesWarnings: ['Não prometer enquadramento no Anexo III antes de validar folha.'],
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
    expect(result.preProposal).toMatchObject({
      status: 'NEEDS_DISCOVERY',
      riskLevel: 'HIGH',
      checkoutAllowed: false,
      serviceSku: 'TAX_REGIME_CRC_REVIEW',
    });
    expect(result.preProposal?.reviewReasons).toContain('FACTOR_R_THRESHOLD');
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
    expect(result.complianceTrail?.officialAssessment).toBe(false);
    expect(result.complianceTrail?.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MEI_ELIGIBILITY',
          status: 'REQUIRES_REVIEW',
          severity: 'HIGH',
        }),
        expect.objectContaining({
          code: 'OFFICIAL_ASSESSMENT_LOCK',
          status: 'REQUIRES_REVIEW',
        }),
      ]),
    );
    expect(result.complianceTrail?.commercialDecision).toMatchObject({
      status: 'ASSISTED_REVIEW_REQUIRED',
      canGenerateProposal: false,
      requiresCrcReview: true,
    });
    expect(result.calculationAudit?.version).toBe('tax-scenarios-calculation-audit-2026.1');
    expect(result.calculationAudit?.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FACTOR_R',
          formula: 'folha_12_meses / receita_bruta_12_meses * 100',
          result: 320,
        }),
      ]),
    );
    expect(result.serviceQualification).toMatchObject({
      stage: 'NEEDS_DISCOVERY',
      primaryOffer: {
        sku: 'PF_TAX_REVIEW',
        checkoutMode: 'SALES_REVIEW_ONLY',
      },
    });
    expect(result.preProposal).toMatchObject({
      status: 'NEEDS_DISCOVERY',
      riskLevel: 'HIGH',
      checkoutAllowed: false,
      serviceSku: 'PF_TAX_REVIEW',
      nextRoute: '/dashboard/modules/company-formation',
    });
    expect(result.preProposal?.readinessScore).toBeLessThan(80);
    expect(result.preProposal?.documentChecklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RBT12_AND_REVENUE_SEGREGATION',
          required: true,
        }),
      ]),
    );
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
    expect(result.complianceTrail?.commercialDecision.status).toBe('BLOCKED_BY_COMPLIANCE');
    expect(result.complianceTrail?.commercialDecision.canGenerateProposal).toBe(false);
    expect(result.serviceQualification?.stage).toBe('BLOCKED');
    expect(result.serviceQualification?.allowedActions).toContain('BLOCK_AUTOMATIC_CHECKOUT');
    expect(result.preProposal).toMatchObject({
      status: 'BLOCKED_BY_COMPLIANCE',
      riskLevel: 'CRITICAL',
      checkoutAllowed: false,
      serviceSku: 'COMPLIANCE_BLOCKER_REVIEW',
      nextRoute: '/dashboard/modules/audit-intelligence',
    });
    expect(result.preProposal?.readinessScore).toBeLessThan(50);
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

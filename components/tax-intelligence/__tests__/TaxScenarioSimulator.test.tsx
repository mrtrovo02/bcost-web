import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TaxScenarioSimulator from '../TaxScenarioSimulator';
import {
  taxScenariosApi,
  type SimulationResponse,
} from '@/lib/api/tax-scenarios';

vi.mock('@/app/context/CompanyContext', () => ({
  useCompany: () => ({
    selectedCompany: {
      id: 'company-001',
      name: 'Empresa Real LTDA',
      cnpj: '12.345.678/0001-90',
    },
  }),
}));

vi.mock('@/lib/api/tax-scenarios', () => ({
  taxScenariosApi: {
    simulate: vi.fn(),
  },
}));

const simulateMock = vi.mocked(taxScenariosApi.simulate);

const legacySimulationResponse: SimulationResponse = {
  status: 'OK',
  scenarioId: 'legacy-scenario-001',
  input: {
    companyId: 'company-001',
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
      estimatedTax: 598_969.59,
      estimatedEffectiveRate: 22.69,
      netAnnualResult: 1_621_030.41,
      monthlyNetResult: 135_085.87,
      warnings: [],
      components: [],
    },
    {
      model: 'SIMPLES_NACIONAL',
      annualRevenue: 2_640_000,
      annualDeductibleExpenses: 420_000,
      annualPayroll: 600_000,
      taxableBase: 2_640_000,
      estimatedTax: 545_100,
      estimatedEffectiveRate: 20.65,
      netAnnualResult: 1_074_900,
      monthlyNetResult: 89_575,
      warnings: [],
      components: [],
    },
  ],
  bestEstimatedModel: 'PF',
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
    decision: 'PF_REVIEW_RECOMMENDED',
    title: 'PF permanece melhor na simulação preliminar',
    rationale: ['Resultado legado sem gate jurídico-fiscal.'],
    requiredEvidence: [],
    nextActions: ['Submeter revisão CRC'],
  },
  guardrails: [],
  generatedAt: '2026-09-06T00:00:00.000Z',
  annualSavings: 1_621_030.41,
};

describe('TaxScenarioSimulator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloqueia publicidade de economia quando o gate jurídico-fiscal não vem da API', async () => {
    simulateMock.mockResolvedValueOnce(legacySimulationResponse);

    render(<TaxScenarioSimulator />);

    fireEvent.click(screen.getByRole('button', { name: /simular cenário/i }));

    await waitFor(() => {
      expect(screen.getByText('Sob revisão')).toBeInTheDocument();
    });

    expect(screen.getByText('Gate jurídico-fiscal indisponível')).toBeInTheDocument();
    expect(
      screen.getByText(/não use este resultado como proposta comercial/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Economia anual')).toBeInTheDocument();
  });

  it('exibe manifesto legal quando a API retorna rastreabilidade normativa', async () => {
    simulateMock.mockResolvedValueOnce({
      ...legacySimulationResponse,
      legalRiskAssessment: {
        version: 'tax-scenarios-legal-risk-2026.1',
        assessmentMode: 'CODE_BASED_SYSTEMIC_REVIEW',
        legalReliability: 'TRIAGE_ONLY',
        riskLevel: 'HIGH',
        canAdvertiseSavings: false,
        canUseAsOfficialAssessment: false,
        requiredDisclosures: [
          'Resultado gerencial para triagem e planejamento assistido.',
        ],
        evidenceGate: {
          status: 'OPEN',
          requiredEvidence: ['RBT12 oficial'],
          missingEvidence: ['RBT12 oficial'],
        },
        findings: [],
      },
      legalSourceManifest: {
        version: 'tax-scenarios-legal-sources-2026.1',
        jurisdiction: 'BR',
        calculationMode: 'ESTIMATIVE_TRIAGE',
        officialAssessment: false,
        sources: [
          {
            code: 'LC_123_2006',
            title: 'Simples Nacional, ME e EPP',
            sourceType: 'COMPLEMENTARY_LAW',
            citation: 'Lei Complementar 123/2006',
            calculationRole: 'Limites de receita, anexos e Fator R.',
          },
        ],
        revalidationTriggers: ['Alteração de CNAE, município ou RBT12.'],
        releaseGuardrails: ['Toda resposta deve manter officialAssessment=false.'],
      },
    });

    render(<TaxScenarioSimulator />);

    fireEvent.click(screen.getByRole('button', { name: /simular cenário/i }));

    await waitFor(() => {
      expect(screen.getByText('Manifesto legal do cálculo')).toBeInTheDocument();
    });

    expect(screen.getByText('tax-scenarios-legal-sources-2026.1')).toBeInTheDocument();
    expect(screen.getByText('Lei Complementar 123/2006')).toBeInTheDocument();
    expect(screen.queryByText('Gate jurídico-fiscal indisponível')).not.toBeInTheDocument();
  });
});

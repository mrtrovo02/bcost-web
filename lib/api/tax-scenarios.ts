import { assertOperationalDemoFallbackEnabled } from '@/lib/config/demo-policy';
import { api, getActiveCompanyId, isDemoSession } from '@/services/api';

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
  eligibilityStatus?: 'ELIGIBLE' | 'INELIGIBLE' | 'REQUIRES_REVIEW';
  legalBasis?: string[];
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

const MEI_ANNUAL_LIMIT = 81_000;
const SIMPLES_ANNUAL_LIMIT = 4_800_000;
const FACTOR_R_THRESHOLD = 28;
const CBS_INFORMATIVE_2026 = 0.009;
const IBS_INFORMATIVE_2026 = 0.001;

type SimplesBracket = {
  upperLimit: number;
  nominalRate: number;
  deduction: number;
};

const SIMPLES_ANNEX_III_BRACKETS: SimplesBracket[] = [
  { upperLimit: 180_000, nominalRate: 0.06, deduction: 0 },
  { upperLimit: 360_000, nominalRate: 0.112, deduction: 9_360 },
  { upperLimit: 720_000, nominalRate: 0.135, deduction: 17_640 },
  { upperLimit: 1_800_000, nominalRate: 0.16, deduction: 35_640 },
  { upperLimit: 3_600_000, nominalRate: 0.21, deduction: 125_640 },
  { upperLimit: 4_800_000, nominalRate: 0.33, deduction: 648_000 },
];

const SIMPLES_ANNEX_V_BRACKETS: SimplesBracket[] = [
  { upperLimit: 180_000, nominalRate: 0.155, deduction: 0 },
  { upperLimit: 360_000, nominalRate: 0.18, deduction: 4_500 },
  { upperLimit: 720_000, nominalRate: 0.195, deduction: 9_900 },
  { upperLimit: 1_800_000, nominalRate: 0.205, deduction: 17_100 },
  { upperLimit: 3_600_000, nominalRate: 0.23, deduction: 62_100 },
  { upperLimit: 4_800_000, nominalRate: 0.305, deduction: 540_000 },
];

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function money(value: number): number {
  return round(value, 2);
}

function progressiveIrpf(annualBase: number): number {
  if (annualBase <= 27_110.4) return 0;
  if (annualBase <= 33_919.8) return annualBase * 0.075 - 2_033.28;
  if (annualBase <= 45_012.6) return annualBase * 0.15 - 4_577.27;
  if (annualBase <= 55_976.16) return annualBase * 0.225 - 7_953.21;
  return annualBase * 0.275 - 10_752.02;
}

function resolveSimplesBracket(annualRevenue: number, brackets: SimplesBracket[]): SimplesBracket {
  return brackets.find((bracket) => annualRevenue <= bracket.upperLimit) ?? brackets[brackets.length - 1];
}

function buildCalculation(
  input: Omit<TaxScenarioCalculation, 'estimatedEffectiveRate' | 'netAnnualResult' | 'monthlyNetResult'>,
): TaxScenarioCalculation {
  const estimatedEffectiveRate =
    input.annualRevenue > 0 && input.estimatedTax >= 0
      ? round((input.estimatedTax / input.annualRevenue) * 100, 2)
      : 0;
  const netAnnualResult =
    input.estimatedTax >= 0
      ? money(input.annualRevenue - input.annualDeductibleExpenses - input.estimatedTax)
      : 0;

  return {
    ...input,
    taxableBase: money(input.taxableBase),
    estimatedTax: money(input.estimatedTax),
    estimatedEffectiveRate,
    netAnnualResult,
    monthlyNetResult: money(netAnnualResult / 12),
  };
}

function createDemoSimulation(input: SimulateTaxScenarioDto, companyId?: string): SimulationResponse {
  const annualRevenue = money(input.monthlyRevenue * 12);
  const annualDeductibleExpenses = money(input.monthlyDeductibleExpenses * 12);
  const annualPayroll = money(input.monthlyPayroll * 12);
  const factorRPercentage = annualRevenue > 0 ? round((annualPayroll / annualRevenue) * 100, 2) : 0;
  const serviceActivity = ['LEGAL', 'TECHNOLOGY', 'CONSULTING', 'SERVICE_PROVIDER'].includes(input.activity);
  const simplesAnnex =
    serviceActivity && factorRPercentage < FACTOR_R_THRESHOLD ? 'ANEXO_V' : 'ANEXO_III';
  const simplesBracket = resolveSimplesBracket(
    annualRevenue,
    simplesAnnex === 'ANEXO_III' ? SIMPLES_ANNEX_III_BRACKETS : SIMPLES_ANNEX_V_BRACKETS,
  );
  const simplesEffectiveRate =
    annualRevenue > 0
      ? Math.max(0, (annualRevenue * simplesBracket.nominalRate - simplesBracket.deduction) / annualRevenue)
      : 0;
  const presumedMargin = 0.32;
  const irCsll = annualRevenue * presumedMargin * 0.24;
  const pisCofins = annualRevenue * 0.0365;
  const iss = annualRevenue * 0.03;

  const comparisons: TaxScenarioCalculation[] = [
    buildCalculation({
      model: 'PF',
      annualRevenue,
      annualDeductibleExpenses,
      annualPayroll: 0,
      taxableBase: Math.max(0, annualRevenue - annualDeductibleExpenses - input.dependents * 2_275.08),
      estimatedTax: money(progressiveIrpf(Math.max(0, annualRevenue - annualDeductibleExpenses - input.dependents * 2_275.08))),
      warnings:
        annualRevenue > 120_000
          ? ['Receita anual elevada para PF: avaliar retenções, livro caixa e estrutura PJ.']
          : [],
      components: [
        {
          code: 'IRPF_PROGRESSIVE_ESTIMATE',
          label: 'IRPF progressivo estimado',
          amount: money(progressiveIrpf(Math.max(0, annualRevenue - annualDeductibleExpenses - input.dependents * 2_275.08))),
          basis: 'Tabela progressiva anual simplificada, sem substituir DIRPF.',
        },
      ],
    }),
    buildCalculation({
      model: 'MEI',
      annualRevenue,
      annualDeductibleExpenses: 0,
      annualPayroll: 0,
      taxableBase: annualRevenue,
      estimatedTax: annualRevenue > MEI_ANNUAL_LIMIT ? -1 : money(85 * 12),
      warnings:
        annualRevenue > MEI_ANNUAL_LIMIT
          ? ['Faturamento informado supera o limite anual usual do MEI; exige avaliação de desenquadramento.']
          : ['MEI depende de atividade permitida e demais limites legais.'],
      components: [
        {
          code: 'MEI_FIXED_MONTHLY_DAS_ESTIMATE',
          label: 'DAS mensal fixo estimado',
          amount: annualRevenue > MEI_ANNUAL_LIMIT ? 0 : money(85 * 12),
          basis: 'Estimativa orientativa; valor real depende da atividade e legislação vigente.',
        },
      ],
    }),
    buildCalculation({
      model: 'SIMPLES_NACIONAL',
      eligibilityStatus: annualRevenue > SIMPLES_ANNUAL_LIMIT ? 'INELIGIBLE' : 'ELIGIBLE',
      legalBasis: [
        annualRevenue > SIMPLES_ANNUAL_LIMIT
          ? 'Lei Complementar 123/2006, art. 3º, II: limite de receita bruta anual de R$ 4.800.000,00 para EPP.'
          : 'Lei Complementar 123/2006, art. 18 e Anexos III/V: alíquota efetiva conforme RBT12, anexo, alíquota nominal e parcela a deduzir.',
      ],
      annualRevenue,
      annualDeductibleExpenses: 0,
      annualPayroll,
      taxableBase: annualRevenue,
      estimatedTax:
        annualRevenue > SIMPLES_ANNUAL_LIMIT
          ? -1
          : money(annualRevenue * simplesEffectiveRate),
      warnings:
        annualRevenue > SIMPLES_ANNUAL_LIMIT
          ? [
              'Simples Nacional bloqueado: receita anualizada supera R$ 4.800.000,00. Use Lucro Presumido/Lucro Real ou valide RBT12 real com contador responsável.',
            ]
          : [
              'Alíquota efetiva do Simples depende de RBT12, anexo, parcela a deduzir, CNAE e segregação de receitas.',
              ...(serviceActivity && factorRPercentage < FACTOR_R_THRESHOLD
                ? ['Fator R abaixo de 28% pode deslocar serviços para carga maior; revisar pró-labore/folha.']
                : []),
            ],
      components: [
        {
          code:
            annualRevenue > SIMPLES_ANNUAL_LIMIT
              ? 'SIMPLES_REVENUE_LIMIT_BLOCKED'
              : simplesAnnex === 'ANEXO_III'
                ? 'SIMPLES_ANNEX_III_EFFECTIVE_RATE'
                : 'SIMPLES_ANNEX_V_EFFECTIVE_RATE',
          label:
            annualRevenue > SIMPLES_ANNUAL_LIMIT
              ? 'Limite anual do Simples Nacional excedido'
              : simplesAnnex === 'ANEXO_III'
                ? 'Simples Nacional estimado pelo Anexo III'
                : 'Simples Nacional estimado pelo Anexo V',
          amount:
            annualRevenue > SIMPLES_ANNUAL_LIMIT
              ? 0
              : money(annualRevenue * simplesEffectiveRate),
          rate: annualRevenue > SIMPLES_ANNUAL_LIMIT ? undefined : round(simplesEffectiveRate, 6),
          basis:
            annualRevenue > SIMPLES_ANNUAL_LIMIT
              ? 'LC 123/2006, art. 3º, II; motor não recomenda Simples quando a receita anualizada ultrapassa R$ 4,8 milhões.'
              : 'Estimativa com fórmula de alíquota efetiva da LC 123/2006, dependente de RBT12, anexo, alíquota nominal e parcela a deduzir.',
        },
      ],
    }),
    buildCalculation({
      model: 'LUCRO_PRESUMIDO',
      annualRevenue,
      annualDeductibleExpenses: 0,
      annualPayroll: 0,
      taxableBase: money(annualRevenue * presumedMargin),
      estimatedTax: money(irCsll + pisCofins + iss),
      warnings: ['ISS varia por município e serviço; retenções e adicional de IRPJ podem alterar o resultado.'],
      components: [
        {
          code: 'IRPJ_CSLL_PRESUMED',
          label: 'IRPJ/CSLL sobre base presumida',
          amount: money(irCsll),
          rate: 0.24,
          basis: 'Base presumida orientativa para serviços.',
        },
        {
          code: 'PIS_COFINS_CUMULATIVE',
          label: 'PIS/COFINS cumulativo',
          amount: money(pisCofins),
          rate: 0.0365,
          basis: 'Estimativa de regime cumulativo.',
        },
        {
          code: 'ISS_ESTIMATE',
          label: 'ISS municipal estimado',
          amount: money(iss),
          rate: 0.03,
          basis: 'Alíquota média orientativa; confirmar município.',
        },
      ],
    }),
  ];
  const viableComparisons = comparisons.filter((comparison) => comparison.estimatedTax >= 0);
  const best = [...viableComparisons].sort((a, b) => b.netAnnualResult - a.netAnnualResult)[0];
  const bestEstimatedModel = best?.model ?? 'PF';
  const currentResult = comparisons.find((comparison) => comparison.model === input.currentModel);
  const potentialGain = currentResult && best ? money(best.netAnnualResult - currentResult.netAnnualResult) : 0;

  return {
    status: 'OK',
    input,
    assumptions: [
      {
        code: 'DEMO_CONTINUITY_SIMULATION',
        description:
          'Simulação calculada localmente apenas para continuidade da sessão demonstrativa quando a API protegida não respondeu.',
        sourceBasis: ['EC 132/2023', 'LC 214/2025', 'Lei Complementar 123/2006'],
      },
      {
        code: 'CBS_IBS_2026_CALIBRATION',
        description:
          'CBS/IBS em 2026 tratados como destaque informativo e calibração operacional, sem premissa de recolhimento definitivo.',
        sourceBasis: ['LC 214/2025', 'Notas Técnicas NF-e/NFC-e RTC 2025/2026'],
      },
    ],
    comparisons,
    bestEstimatedModel,
    factorR: {
      percentage: factorRPercentage,
      qualifiesForAnexoIIIReview: factorRPercentage >= FACTOR_R_THRESHOLD,
      requiredPayrollForThreshold: money(Math.max(0, annualRevenue * (FACTOR_R_THRESHOLD / 100) - annualPayroll)),
    },
    reformImpact: {
      calibrationYear: 2026,
      cbsInformativeRate: CBS_INFORMATIVE_2026,
      ibsInformativeRate: IBS_INFORMATIVE_2026,
      estimatedCbs: money(annualRevenue * CBS_INFORMATIVE_2026),
      estimatedIbs: money(annualRevenue * IBS_INFORMATIVE_2026),
      note: 'Valores de CBS/IBS são informativos para 2026 e devem ser revisados conforme ato técnico, município, atividade e documento fiscal.',
    },
    recommendation: {
      decision:
        annualRevenue > SIMPLES_ANNUAL_LIMIT
          ? 'ASSISTED_TAX_PLANNING_REQUIRED'
          : factorRPercentage > 0 && factorRPercentage < FACTOR_R_THRESHOLD
          ? 'SIMPLES_WITH_FACTOR_R_REVIEW'
          : bestEstimatedModel === 'PF'
            ? 'ASSISTED_TAX_PLANNING_REQUIRED'
            : 'PJ_SIMULATION_RECOMMENDED',
      title:
        annualRevenue > SIMPLES_ANNUAL_LIMIT
          ? 'Simples Nacional bloqueado pelo limite de receita'
          : factorRPercentage > 0 && factorRPercentage < FACTOR_R_THRESHOLD
          ? 'Revisar Fator R antes de decidir o modelo'
          : bestEstimatedModel === 'PF'
            ? 'Planejamento tributário assistido recomendado'
            : 'Estrutura PJ merece análise assistida',
      rationale: [
        annualRevenue > SIMPLES_ANNUAL_LIMIT
          ? 'A receita anualizada supera R$ 4.800.000,00, limite geral de EPP para permanência no Simples Nacional.'
          : `Modelo com melhor resultado estimado: ${bestEstimatedModel}.`,
        potentialGain > 0
          ? `Ganho anual estimado contra o modelo atual: R$ ${potentialGain.toLocaleString('pt-BR')}.`
          : 'A comparação indica necessidade de detalhamento antes de decisão.',
      ],
      requiredEvidence: ['CNAE pretendido', 'Município de prestação', 'Notas/recibos recentes'],
      nextActions: ['Rodar onboarding de abertura/migração', 'Validar regime tributário', 'Submeter revisão CRC'],
    },
    guardrails: [
      'Fallback demonstrativo restrito a sessão demo; empresas reais continuam exigindo API autenticada e dados oficiais.',
      ...(annualRevenue > SIMPLES_ANNUAL_LIMIT
        ? [
            'Receita anualizada acima de R$ 4,8 milhões bloqueia recomendação automática de Simples Nacional; exigir RBT12 real e revisão contábil.',
          ]
        : []),
      'Não prometer economia tributária sem validar CNAE, município, regime, pró-labore, folha e documentos fiscais.',
      'Simulação PF x PJ não contempla todos os cenários de retenções, ISS fixo, benefícios fiscais, atividades reguladas ou regimes específicos.',
    ],
    generatedAt: new Date().toISOString(),
    scenarioId: 'demo-local-tax-scenario',
    companyId,
  };
}

function normalizeSimulationResponse(
  data: SimulationResponse,
  requestPayload: SimulateTaxScenarioDto,
  companyId?: string,
): SimulationResponse {
  const bestModel = data.bestEstimatedModel ?? data.recommendedRegime ?? 'PF';
  const bestScenario =
    data.comparisons?.find((comparison) => comparison.model === bestModel) ?? data.comparisons?.[0];
  const currentScenario =
    data.comparisons?.find((comparison) => comparison.model === requestPayload.currentModel) ??
    data.comparisons?.[0];
  const annualSavings =
    typeof bestScenario?.netAnnualResult === 'number' && typeof currentScenario?.netAnnualResult === 'number'
      ? Number((bestScenario.netAnnualResult - currentScenario.netAnnualResult).toFixed(2))
      : 0;

  return {
    ...data,
    companyId,
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
}

export const taxScenariosApi = {
  async simulate(payload: SimulateTaxScenarioDto): Promise<SimulationResponse> {
    const companyId = payload.companyId ?? getActiveCompanyId() ?? undefined;
    const requestPayload: SimulateTaxScenarioDto = {
      ...payload,
      ...(companyId ? { companyId } : {}),
    };
    try {
      const { data } = await api.post<SimulationResponse>(
        '/tax-scenarios/simulate',
        requestPayload,
      );

      return normalizeSimulationResponse(data, requestPayload, companyId);
    } catch (error) {
      if (!isDemoSession()) throw error;

      assertOperationalDemoFallbackEnabled(
        'Simulador tributário demo indisponível porque o fallback demonstrativo está desabilitado neste ambiente.',
      );

      return normalizeSimulationResponse(createDemoSimulation(requestPayload, companyId), requestPayload, companyId);
    }
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

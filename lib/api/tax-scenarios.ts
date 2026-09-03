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

export type TaxComplianceRuleStatus =
  | 'PASSED'
  | 'BLOCKED'
  | 'REQUIRES_REVIEW'
  | 'INFORMATIONAL';

export type TaxComplianceRuleSeverity =
  | 'INFO'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export interface TaxComplianceRuleEvaluation {
  code: string;
  status: TaxComplianceRuleStatus;
  severity: TaxComplianceRuleSeverity;
  title: string;
  result: string;
  legalBasis: string[];
  evidenceRequired: string[];
  officialAssessment: boolean;
}

export interface TaxScenarioComplianceTrail {
  version: string;
  calculationMode: 'ESTIMATIVE_TRIAGE';
  officialAssessment: false;
  evaluatedAt: string;
  commercialDecision: {
    status:
      | 'AUTO_PROPOSAL_ALLOWED'
      | 'ASSISTED_REVIEW_REQUIRED'
      | 'BLOCKED_BY_COMPLIANCE';
    canGenerateProposal: boolean;
    requiresCrcReview: boolean;
    reasons: string[];
    blockedRuleCodes: string[];
    reviewRuleCodes: string[];
  };
  rules: TaxComplianceRuleEvaluation[];
  disclaimers: string[];
}

export interface TaxCalculationAuditLine {
  code: string;
  title: string;
  formula: string;
  inputs: Record<string, string | number | boolean>;
  result: string | number;
  sourceBasis: string[];
  officialAssessment: false;
}

export interface TaxScenarioCalculationAudit {
  version: string;
  generatedAt: string;
  lines: TaxCalculationAuditLine[];
}

export interface TaxScenarioServiceQualification {
  stage: 'QUALIFIED_LEAD' | 'NEEDS_DISCOVERY' | 'BLOCKED';
  primaryOffer: {
    sku:
      | 'PF_TAX_REVIEW'
      | 'TAX_REGIME_CRC_REVIEW'
      | 'PJ_MIGRATION_STUDY'
      | 'COMPLIANCE_BLOCKER_REVIEW';
    title: string;
    checkoutMode:
      | 'ASSISTED_CHECKOUT'
      | 'SALES_REVIEW_ONLY'
      | 'BLOCKED';
  };
  allowedActions: Array<
    | 'REQUEST_DOCUMENTS'
    | 'SCHEDULE_CRC_REVIEW'
    | 'CREATE_ASSISTED_PROPOSAL'
    | 'BLOCK_AUTOMATIC_CHECKOUT'
  >;
  missingEvidence: string[];
  salesWarnings: string[];
}

export interface TaxScenarioPreProposalDocument {
  code: string;
  label: string;
  required: boolean;
  source: 'CUSTOMER' | 'ACCOUNTANT' | 'BCOST_SYSTEM';
}

export interface TaxScenarioPreProposal {
  id: string;
  status:
    | 'READY_FOR_ASSISTED_REVIEW'
    | 'NEEDS_DISCOVERY'
    | 'BLOCKED_BY_COMPLIANCE';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readinessScore: number;
  validUntil: string;
  title: string;
  ctaLabel: string;
  nextRoute:
    | '/dashboard/modules/audit-intelligence'
    | '/dashboard/modules/company-formation'
    | '/dashboard/settings?section=billing';
  checkoutAllowed: boolean;
  serviceSku: TaxScenarioServiceQualification['primaryOffer']['sku'];
  checkoutMode: TaxScenarioServiceQualification['primaryOffer']['checkoutMode'];
  documentChecklist: TaxScenarioPreProposalDocument[];
  blockingReasons: string[];
  reviewReasons: string[];
  refreshTriggers: string[];
  legalTerms: string[];
}

export interface SimulationResponse {
  status: 'OK';
  regressionSuite?: {
    version: string;
    owner: 'tax-scenarios';
    coveredRules: string[];
    blockingCriticalities: string[];
  };
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
  complianceTrail?: TaxScenarioComplianceTrail;
  calculationAudit?: TaxScenarioCalculationAudit;
  serviceQualification?: TaxScenarioServiceQualification;
  preProposal?: TaxScenarioPreProposal;
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
const TAX_SCENARIO_REGRESSION_SUITE = {
  version: 'tax-scenarios-regression-2026.1',
  owner: 'tax-scenarios' as const,
  coveredRules: [
    'MEI_ANNUAL_REVENUE_LIMIT',
    'MEI_PAYROLL_REVIEW',
    'SIMPLES_EPP_REVENUE_LIMIT',
    'SIMPLES_EFFECTIVE_RATE_ANNEX_III',
    'SIMPLES_EFFECTIVE_RATE_ANNEX_V',
    'FACTOR_R_THRESHOLD_28_PERCENT',
    'CBS_IBS_2026_INFORMATIVE_RATES',
    'COMMERCIAL_PROPOSAL_COMPLIANCE_GATE',
  ],
  blockingCriticalities: ['BLOCKER', 'HIGH'],
};

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
  if (annualBase <= 29_145.6) return 0;
  if (annualBase <= 33_919.8) return annualBase * 0.075 - 2_185.92;
  if (annualBase <= 45_012.6) return annualBase * 0.15 - 4_729.92;
  if (annualBase <= 55_976.16) return annualBase * 0.225 - 8_105.88;
  return annualBase * 0.275 - 10_904.76;
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
      ? money(input.annualRevenue - input.annualDeductibleExpenses - input.annualPayroll - input.estimatedTax)
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

function isSavingsComparable(calculation?: TaxScenarioCalculation): calculation is TaxScenarioCalculation {
  return Boolean(
    calculation &&
      calculation.estimatedTax >= 0 &&
      calculation.eligibilityStatus !== 'INELIGIBLE' &&
      calculation.eligibilityStatus !== 'REQUIRES_REVIEW',
  );
}

function buildDemoComplianceTrail(
  input: SimulateTaxScenarioDto,
  comparisons: TaxScenarioCalculation[],
  annualRevenue: number,
  annualPayroll: number,
  factorRPercentage: number,
): TaxScenarioComplianceTrail {
  const simples = comparisons.find((comparison) => comparison.model === 'SIMPLES_NACIONAL');
  const mei = comparisons.find((comparison) => comparison.model === 'MEI');
  const serviceActivity = ['LEGAL', 'TECHNOLOGY', 'CONSULTING', 'SERVICE_PROVIDER'].includes(input.activity);

  const rules: TaxComplianceRuleEvaluation[] = [
    {
      code: 'CBS_IBS_2026_CALIBRATION',
      status: 'INFORMATIONAL',
      severity: 'INFO',
      title: 'CBS/IBS 2026 em fase de teste',
      result: 'Aplica destaque informativo de CBS 0,9% e IBS 0,1%, sem tratar como recolhimento definitivo.',
      legalBasis: ['EC 132/2023, art. 125.', 'LC 214/2025.'],
      evidenceRequired: ['XML/JSON fiscal com campos CBS/IBS', 'CST, cClassTrib, NBS/CNAE e município'],
      officialAssessment: false,
    },
    {
      code: 'SIMPLES_NACIONAL_REVENUE_LIMIT',
      status: annualRevenue > SIMPLES_ANNUAL_LIMIT ? 'BLOCKED' : 'PASSED',
      severity: annualRevenue > SIMPLES_ANNUAL_LIMIT ? 'CRITICAL' : 'INFO',
      title: 'Limite anual do Simples Nacional',
      result:
        annualRevenue > SIMPLES_ANNUAL_LIMIT
          ? 'Receita anualizada ultrapassa R$ 4.800.000,00; Simples Nacional não pode ser recomendado automaticamente.'
          : 'Receita anualizada dentro do limite geral para análise preliminar.',
      legalBasis: ['Lei Complementar 123/2006, art. 3º, II.'],
      evidenceRequired: ['RBT12 oficial', 'Extrato PGDAS-D', 'Segregação de receitas'],
      officialAssessment: false,
    },
    {
      code: 'SIMPLES_EFFECTIVE_RATE_FORMULA',
      status: simples?.eligibilityStatus === 'ELIGIBLE' ? 'PASSED' : 'REQUIRES_REVIEW',
      severity: simples?.eligibilityStatus === 'ELIGIBLE' ? 'INFO' : 'HIGH',
      title: 'Fórmula de alíquota efetiva do Simples',
      result:
        simples?.eligibilityStatus === 'ELIGIBLE'
          ? 'Motor usa alíquota efetiva por RBT12, alíquota nominal e parcela a deduzir.'
          : 'Cálculo do Simples exige revisão antes de recomendação comercial.',
      legalBasis: ['Lei Complementar 123/2006, art. 18 e Anexos III/V.'],
      evidenceRequired: ['RBT12 real', 'CNAEs', 'Receitas segregadas por atividade'],
      officialAssessment: false,
    },
    {
      code: 'FACTOR_R_SERVICE_REVIEW',
      status: serviceActivity && factorRPercentage < FACTOR_R_THRESHOLD ? 'REQUIRES_REVIEW' : 'PASSED',
      severity: serviceActivity && factorRPercentage < FACTOR_R_THRESHOLD ? 'HIGH' : 'INFO',
      title: 'Fator R para serviços',
      result:
        serviceActivity && factorRPercentage < FACTOR_R_THRESHOLD
          ? 'Fator R abaixo de 28%; atividade de serviço tende a exigir revisão de Anexo V.'
          : 'Fator R não bloqueia a triagem preliminar.',
      legalBasis: ['Lei Complementar 123/2006, Anexos III/V.'],
      evidenceRequired: ['Folha dos últimos 12 meses', 'Pró-labore', 'RBT12 oficial'],
      officialAssessment: false,
    },
    {
      code: 'MEI_ELIGIBILITY',
      status:
        mei?.eligibilityStatus === 'ELIGIBLE'
          ? 'PASSED'
          : mei?.eligibilityStatus === 'INELIGIBLE'
            ? 'BLOCKED'
            : 'REQUIRES_REVIEW',
      severity:
        mei?.eligibilityStatus === 'ELIGIBLE'
          ? 'INFO'
          : mei?.eligibilityStatus === 'INELIGIBLE'
            ? 'CRITICAL'
            : 'HIGH',
      title: 'Elegibilidade MEI',
      result:
        mei?.eligibilityStatus === 'ELIGIBLE'
          ? 'Receita dentro do limite anual e sem folha informada.'
          : annualPayroll > 0
            ? 'Há folha informada; MEI exige validação de empregado único, salário mínimo/piso e ocupação permitida.'
            : 'Receita ultrapassa limite anual do MEI.',
      legalBasis: ['Portal gov.br/Empresas e Negócios.', 'Resolução CGSN nº 140/2018.'],
      evidenceRequired: ['Ocupação MEI permitida', 'Quantidade de empregados', 'Remuneração'],
      officialAssessment: false,
    },
    {
      code: 'OFFICIAL_ASSESSMENT_LOCK',
      status: 'REQUIRES_REVIEW',
      severity: 'HIGH',
      title: 'Bloqueio de apuração oficial automática',
      result: 'Resultado classificado como triagem estimativa; decisão final exige escrituração e validação CRC.',
      legalBasis: ['Código Tributário Nacional.', 'Normas profissionais contábeis aplicáveis.'],
      evidenceRequired: ['XML/NFS-e/NF-e', 'Livro caixa ou escrituração', 'Retenções, guias e extratos'],
      officialAssessment: false,
    },
  ];
  const blockedRules = rules.filter((rule) => rule.status === 'BLOCKED');
  const relevantBlockedRules = blockedRules.filter((rule) =>
    isBlockingRuleRelevantForCommercialDecision(rule.code, input.currentModel, comparisons
      .filter((comparison) => isSavingsComparable(comparison))
      .sort((a, b) => b.netAnnualResult - a.netAnnualResult)[0]?.model),
  );
  const reviewRules = rules.filter((rule) => rule.status === 'REQUIRES_REVIEW');
  const operationalReviewRules = reviewRules.filter((rule) => rule.code !== 'OFFICIAL_ASSESSMENT_LOCK');
  const commercialStatus =
    relevantBlockedRules.length > 0
      ? 'BLOCKED_BY_COMPLIANCE'
      : operationalReviewRules.length > 0
        ? 'ASSISTED_REVIEW_REQUIRED'
        : 'ASSISTED_REVIEW_REQUIRED';

  return {
    version: 'tax-scenarios-compliance-2026.1',
    calculationMode: 'ESTIMATIVE_TRIAGE',
    officialAssessment: false,
    evaluatedAt: new Date().toISOString(),
    commercialDecision: {
      status: commercialStatus,
      canGenerateProposal: commercialStatus !== 'BLOCKED_BY_COMPLIANCE' && operationalReviewRules.length === 0,
      requiresCrcReview: true,
      reasons: [
        ...relevantBlockedRules.map((rule) => rule.result),
        ...operationalReviewRules.map((rule) => rule.result),
        'Toda proposta comercial tributária deve ser revisada por contador responsável antes de contratação.',
      ],
      blockedRuleCodes: relevantBlockedRules.map((rule) => rule.code),
      reviewRuleCodes: reviewRules.map((rule) => rule.code),
    },
    rules,
    disclaimers: [
      'Este simulador não substitui apuração oficial, PGDAS-D, escrituração, DIRPF ou parecer de contador responsável.',
      'A recomendação comercial deve ser bloqueada quando houver status BLOCKED ou REQUIRES_REVIEW sem evidência validada.',
    ],
  };
}

function buildDemoCalculationAudit(
  input: SimulateTaxScenarioDto,
  comparisons: TaxScenarioCalculation[],
  annualRevenue: number,
  annualDeductibleExpenses: number,
  annualPayroll: number,
  factorRPercentage: number,
): TaxScenarioCalculationAudit {
  const findComparison = (model: TaxScenarioCalculation['model']) =>
    comparisons.find((comparison) => comparison.model === model);
  const pf = findComparison('PF');
  const mei = findComparison('MEI');
  const simples = findComparison('SIMPLES_NACIONAL');
  const lucroPresumido = findComparison('LUCRO_PRESUMIDO');

  return {
    version: 'tax-scenarios-calculation-audit-2026.1',
    generatedAt: new Date().toISOString(),
    lines: [
      {
        code: 'NORMALIZED_ANNUAL_INPUTS',
        title: 'Entradas anualizadas',
        formula: 'valor_mensal * 12',
        inputs: {
          monthlyRevenue: input.monthlyRevenue,
          monthlyDeductibleExpenses: input.monthlyDeductibleExpenses,
          monthlyPayroll: input.monthlyPayroll,
        },
        result: `Receita ${annualRevenue}; despesas ${annualDeductibleExpenses}; folha ${annualPayroll}`,
        sourceBasis: ['Critério matemático de anualização para triagem; RBT12 oficial deve ser informado para apuração final.'],
        officialAssessment: false,
      },
      {
        code: 'FACTOR_R',
        title: 'Fator R',
        formula: 'folha_12_meses / receita_bruta_12_meses * 100',
        inputs: {
          annualPayroll,
          annualRevenue,
          thresholdPercentage: FACTOR_R_THRESHOLD,
        },
        result: factorRPercentage,
        sourceBasis: ['Lei Complementar 123/2006, Anexos III/V.'],
        officialAssessment: false,
      },
      {
        code: 'PF_IRPF_ESTIMATE',
        title: 'IRPF pessoa física estimado',
        formula: 'base tributável aplicada à tabela progressiva anualizada',
        inputs: {
          taxableBase: pf?.taxableBase ?? 0,
          dependents: input.dependents,
        },
        result: pf?.estimatedTax ?? 0,
        sourceBasis: ['Tabela progressiva mensal do IRPF anualizada para simulação preliminar.'],
        officialAssessment: false,
      },
      {
        code: 'MEI_ELIGIBILITY_AND_DAS',
        title: 'MEI elegibilidade e DAS estimado',
        formula: 'receita_anual <= 81.000 e ausência de folha não validada',
        inputs: {
          annualRevenue,
          annualPayroll,
          annualLimit: MEI_ANNUAL_LIMIT,
          eligibilityStatus: mei?.eligibilityStatus ?? 'REQUIRES_REVIEW',
        },
        result: mei?.estimatedTax ?? -1,
        sourceBasis: ['Portal gov.br/Empresas e Negócios.', 'Resolução CGSN nº 140/2018.'],
        officialAssessment: false,
      },
      {
        code: 'SIMPLES_EFFECTIVE_RATE',
        title: 'Simples Nacional estimado',
        formula: '(RBT12 * aliquota_nominal - parcela_a_deduzir) / RBT12',
        inputs: {
          annualRevenue,
          annualLimit: SIMPLES_ANNUAL_LIMIT,
          effectiveRate: simples?.estimatedEffectiveRate ?? 0,
        },
        result: simples?.estimatedTax ?? -1,
        sourceBasis: ['Lei Complementar 123/2006, art. 18 e Anexos III/V.'],
        officialAssessment: false,
      },
      {
        code: 'LUCRO_PRESUMIDO_ESTIMATE',
        title: 'Lucro Presumido estimado',
        formula: 'receita * margem_presumida * IRPJ/CSLL + PIS/COFINS + ISS',
        inputs: {
          annualRevenue,
          presumedTaxableBase: lucroPresumido?.taxableBase ?? 0,
        },
        result: lucroPresumido?.estimatedTax ?? 0,
        sourceBasis: ['Validação oficial exige atividade, adicional de IRPJ, retenções e ISS municipal.'],
        officialAssessment: false,
      },
      {
        code: 'CBS_IBS_INFORMATIVE_2026',
        title: 'CBS/IBS informativo 2026',
        formula: 'receita_anual * CBS 0,9%; receita_anual * IBS 0,1%',
        inputs: {
          annualRevenue,
          cbsRate: CBS_INFORMATIVE_2026,
          ibsRate: IBS_INFORMATIVE_2026,
        },
        result: `CBS ${money(annualRevenue * CBS_INFORMATIVE_2026)}; IBS ${money(annualRevenue * IBS_INFORMATIVE_2026)}`,
        sourceBasis: ['EC 132/2023, art. 125; LC 214/2025.'],
        officialAssessment: false,
      },
    ],
  };
}

function isBlockingRuleRelevantForCommercialDecision(
  ruleCode: string,
  currentModel?: SimulateTaxScenarioDto['currentModel'],
  bestModel?: TaxScenarioCalculation['model'],
): boolean {
  if (ruleCode === 'MEI_ELIGIBILITY') {
    return currentModel === 'MEI' || bestModel === 'MEI';
  }

  if (ruleCode === 'SIMPLES_NACIONAL_REVENUE_LIMIT') {
    return currentModel === 'SIMPLES_NACIONAL' || bestModel === 'SIMPLES_NACIONAL';
  }

  return true;
}

function buildDemoServiceQualification(
  recommendation: TaxScenarioRecommendation,
  complianceTrail: TaxScenarioComplianceTrail,
  bestModel: TaxScenarioCalculation['model'],
): TaxScenarioServiceQualification {
  const commercialDecision = complianceTrail.commercialDecision;
  const missingEvidence = Array.from(
    new Set(
      complianceTrail.rules
        .filter((rule) => rule.status === 'BLOCKED' || rule.status === 'REQUIRES_REVIEW')
        .flatMap((rule) => rule.evidenceRequired),
    ),
  );

  if (commercialDecision.status === 'BLOCKED_BY_COMPLIANCE') {
    return {
      stage: 'BLOCKED',
      primaryOffer: {
        sku: 'COMPLIANCE_BLOCKER_REVIEW',
        title: 'Revisão de bloqueio fiscal antes da proposta',
        checkoutMode: 'BLOCKED',
      },
      allowedActions: ['REQUEST_DOCUMENTS', 'SCHEDULE_CRC_REVIEW', 'BLOCK_AUTOMATIC_CHECKOUT'],
      missingEvidence,
      salesWarnings: [
        'Não apresentar economia, migração ou enquadramento enquanto houver regra crítica bloqueada.',
        ...commercialDecision.reasons,
      ],
    };
  }

  if (bestModel === 'PF') {
    return {
      stage: 'NEEDS_DISCOVERY',
      primaryOffer: {
        sku: 'PF_TAX_REVIEW',
        title: 'Revisão fiscal PF e livro caixa',
        checkoutMode: 'SALES_REVIEW_ONLY',
      },
      allowedActions: ['REQUEST_DOCUMENTS', 'SCHEDULE_CRC_REVIEW'],
      missingEvidence,
      salesWarnings: [
        'Não vender abertura ou migração PJ com base neste cenário preliminar.',
        'Oferta indicada: diagnóstico PF, livro caixa, retenções e validação documental.',
      ],
    };
  }

  if (recommendation.decision === 'SIMPLES_WITH_FACTOR_R_REVIEW') {
    return {
      stage: 'NEEDS_DISCOVERY',
      primaryOffer: {
        sku: 'TAX_REGIME_CRC_REVIEW',
        title: 'Revisão CRC de Fator R e regime tributário',
        checkoutMode: 'SALES_REVIEW_ONLY',
      },
      allowedActions: ['REQUEST_DOCUMENTS', 'SCHEDULE_CRC_REVIEW'],
      missingEvidence,
      salesWarnings: ['Não prometer enquadramento no Anexo III antes de validar folha, pró-labore e RBT12.'],
    };
  }

  return {
    stage: 'QUALIFIED_LEAD',
    primaryOffer: {
      sku: 'PJ_MIGRATION_STUDY',
      title: 'Estudo assistido de abertura ou migração PJ',
      checkoutMode: commercialDecision.canGenerateProposal ? 'ASSISTED_CHECKOUT' : 'SALES_REVIEW_ONLY',
    },
    allowedActions: commercialDecision.canGenerateProposal
      ? ['REQUEST_DOCUMENTS', 'SCHEDULE_CRC_REVIEW', 'CREATE_ASSISTED_PROPOSAL']
      : ['REQUEST_DOCUMENTS', 'SCHEDULE_CRC_REVIEW'],
    missingEvidence,
    salesWarnings: ['Proposta deve manter cláusula de estimativa e revisão CRC antes de enquadramento definitivo.'],
  };
}

function buildDemoPreProposal(
  input: SimulateTaxScenarioDto,
  serviceQualification: TaxScenarioServiceQualification,
  complianceTrail: TaxScenarioComplianceTrail,
): TaxScenarioPreProposal {
  const checkoutAllowed =
    serviceQualification.primaryOffer.checkoutMode === 'ASSISTED_CHECKOUT' &&
    complianceTrail.commercialDecision.canGenerateProposal;
  const status = resolveDemoPreProposalStatus(serviceQualification);
  const riskLevel = resolveDemoPreProposalRiskLevel(complianceTrail);
  const documentChecklist = buildDemoPreProposalDocuments(serviceQualification);

  return {
    id: createDemoScenarioId(input),
    status,
    riskLevel,
    readinessScore: calculateDemoReadinessScore(
      status,
      riskLevel,
      documentChecklist,
      complianceTrail,
    ),
    validUntil: resolveDemoPreProposalValidityDate(),
    title: resolveDemoPreProposalTitle(serviceQualification, status),
    ctaLabel: resolveDemoPreProposalCtaLabel(status, checkoutAllowed),
    nextRoute: resolveDemoPreProposalRoute(status, checkoutAllowed),
    checkoutAllowed,
    serviceSku: serviceQualification.primaryOffer.sku,
    checkoutMode: serviceQualification.primaryOffer.checkoutMode,
    documentChecklist,
    blockingReasons: complianceTrail.commercialDecision.blockedRuleCodes,
    reviewReasons: complianceTrail.commercialDecision.reviewRuleCodes,
    refreshTriggers: [
      'Alteração de faturamento, folha, pró-labore, dependentes, CNAE, município ou regime atual.',
      'Recebimento de RBT12 oficial, XMLs, notas, retenções, extratos ou escrituração que divirjam dos valores simulados.',
      'Publicação de ato legal, nota técnica, tabela ou orientação fiscal que altere alíquotas, limites, anexos ou obrigações aplicáveis.',
    ],
    legalTerms: [
      'Pré-proposta condicionada à validação documental, CNAE, município, RBT12, retenções, folha/pró-labore e revisão de contador responsável.',
      'A simulação é estimativa de triagem e não representa apuração oficial, parecer tributário definitivo ou promessa de economia.',
      'Contratação, abertura, migração, enquadramento e desenquadramento devem manter evidências arquivadas para trilha de auditoria.',
    ],
  };
}

function resolveDemoPreProposalValidityDate(): string {
  const validUntil = new Date();
  validUntil.setUTCDate(validUntil.getUTCDate() + 7);
  return validUntil.toISOString();
}

function resolveDemoPreProposalRiskLevel(
  complianceTrail: TaxScenarioComplianceTrail,
): TaxScenarioPreProposal['riskLevel'] {
  const relevantRuleCodes = new Set([
    ...complianceTrail.commercialDecision.blockedRuleCodes,
    ...complianceTrail.commercialDecision.reviewRuleCodes,
  ]);
  const severities = complianceTrail.rules
    .filter((rule) => relevantRuleCodes.has(rule.code))
    .map((rule) => rule.severity);

  if (severities.includes('CRITICAL')) return 'CRITICAL';
  if (severities.includes('HIGH')) return 'HIGH';
  if (severities.includes('MEDIUM')) return 'MEDIUM';
  return 'LOW';
}

function calculateDemoReadinessScore(
  status: TaxScenarioPreProposal['status'],
  riskLevel: TaxScenarioPreProposal['riskLevel'],
  documentChecklist: TaxScenarioPreProposalDocument[],
  complianceTrail: TaxScenarioComplianceTrail,
): number {
  const requiredDocuments = documentChecklist.filter((document) => document.required).length;
  const reviewPenalty = complianceTrail.commercialDecision.reviewRuleCodes.length * 8;
  const blockingPenalty = complianceTrail.commercialDecision.blockedRuleCodes.length * 25;
  const riskPenaltyByLevel: Record<TaxScenarioPreProposal['riskLevel'], number> = {
    LOW: 0,
    MEDIUM: 8,
    HIGH: 18,
    CRITICAL: 35,
  };
  const statusPenaltyByStatus: Record<TaxScenarioPreProposal['status'], number> = {
    READY_FOR_ASSISTED_REVIEW: 0,
    NEEDS_DISCOVERY: 12,
    BLOCKED_BY_COMPLIANCE: 30,
  };
  const score =
    100 -
    requiredDocuments * 2 -
    reviewPenalty -
    blockingPenalty -
    riskPenaltyByLevel[riskLevel] -
    statusPenaltyByStatus[status];

  return Math.max(0, Math.min(100, Math.round(score)));
}

function resolveDemoPreProposalStatus(
  serviceQualification: TaxScenarioServiceQualification,
): TaxScenarioPreProposal['status'] {
  if (serviceQualification.stage === 'BLOCKED') return 'BLOCKED_BY_COMPLIANCE';
  if (serviceQualification.stage === 'NEEDS_DISCOVERY') return 'NEEDS_DISCOVERY';
  return 'READY_FOR_ASSISTED_REVIEW';
}

function resolveDemoPreProposalTitle(
  serviceQualification: TaxScenarioServiceQualification,
  status: TaxScenarioPreProposal['status'],
): string {
  if (status === 'BLOCKED_BY_COMPLIANCE') return 'Dossiê bloqueado para venda automática';
  if (status === 'NEEDS_DISCOVERY') return 'Dossiê para diagnóstico assistido';
  return `Pré-proposta assistida: ${serviceQualification.primaryOffer.title}`;
}

function resolveDemoPreProposalCtaLabel(
  status: TaxScenarioPreProposal['status'],
  checkoutAllowed: boolean,
): string {
  if (status === 'BLOCKED_BY_COMPLIANCE') return 'Abrir revisão de compliance';
  if (checkoutAllowed) return 'Preparar proposta assistida';
  return 'Enviar evidências para CRC';
}

function resolveDemoPreProposalRoute(
  status: TaxScenarioPreProposal['status'],
  checkoutAllowed: boolean,
): TaxScenarioPreProposal['nextRoute'] {
  if (status === 'BLOCKED_BY_COMPLIANCE') return '/dashboard/modules/audit-intelligence';
  if (checkoutAllowed) return '/dashboard/settings?section=billing';
  return '/dashboard/modules/company-formation';
}

function buildDemoPreProposalDocuments(
  serviceQualification: TaxScenarioServiceQualification,
): TaxScenarioPreProposalDocument[] {
  const baseDocuments: TaxScenarioPreProposalDocument[] = [
    {
      code: 'CNAE_AND_MUNICIPALITY',
      label: 'CNAE pretendido, município de prestação e descrição real dos serviços',
      required: true,
      source: 'CUSTOMER',
    },
    {
      code: 'RBT12_AND_REVENUE_SEGREGATION',
      label: 'Receita bruta dos últimos 12 meses e segregação por tipo de serviço',
      required: true,
      source: 'CUSTOMER',
    },
    {
      code: 'FISCAL_DOCUMENTS_SAMPLE',
      label: 'Amostra de notas fiscais, recibos, retenções e contratos vigentes',
      required: true,
      source: 'CUSTOMER',
    },
    {
      code: 'PAYROLL_AND_PRO_LABORE',
      label: 'Folha, pró-labore, INSS e vínculos usados no Fator R',
      required: true,
      source: 'ACCOUNTANT',
    },
  ];
  const documents = new Map<string, TaxScenarioPreProposalDocument>();

  [...baseDocuments, ...serviceQualification.missingEvidence.map(mapDemoEvidenceToDocument)].forEach(
    (document) => documents.set(document.code, document),
  );

  return Array.from(documents.values());
}

function mapDemoEvidenceToDocument(evidence: string): TaxScenarioPreProposalDocument {
  const normalizedEvidence = evidence
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (normalizedEvidence.includes('RBT12')) {
    return {
      code: 'OFFICIAL_RBT12',
      label: 'RBT12 oficial extraído do PGDAS-D ou escrituração equivalente',
      required: true,
      source: 'ACCOUNTANT',
    };
  }

  if (
    normalizedEvidence.includes('FOLHA') ||
    normalizedEvidence.includes('PRO-LABORE') ||
    normalizedEvidence.includes('PRO LABORE')
  ) {
    return {
      code: 'PAYROLL_FACTOR_R_EVIDENCE',
      label: 'Comprovantes de folha e pró-labore para validação do Fator R',
      required: true,
      source: 'ACCOUNTANT',
    };
  }

  if (
    normalizedEvidence.includes('CNAE') ||
    normalizedEvidence.includes('ATIVIDADE') ||
    normalizedEvidence.includes('OCUPACAO')
  ) {
    return {
      code: 'ACTIVITY_ELIGIBILITY_EVIDENCE',
      label: 'CNAE, ocupação permitida e objeto social compatíveis com a operação',
      required: true,
      source: 'CUSTOMER',
    };
  }

  if (
    normalizedEvidence.includes('NOTA') ||
    normalizedEvidence.includes('XML') ||
    normalizedEvidence.includes('RECIBO') ||
    normalizedEvidence.includes('RETENCAO')
  ) {
    return {
      code: 'DOCUMENT_AND_WITHHOLDING_EVIDENCE',
      label: 'Notas, XMLs, recibos e retenções dos últimos 12 meses',
      required: true,
      source: 'CUSTOMER',
    };
  }

  return {
    code: `EVIDENCE_${stableTextHash(evidence)}`,
    label: evidence,
    required: true,
    source: 'CUSTOMER',
  };
}

function createDemoScenarioId(input: SimulateTaxScenarioDto): string {
  return `demo-${stableTextHash(JSON.stringify(input)).toLowerCase()}`;
}

function stableTextHash(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, '0').toUpperCase();
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
      eligibilityStatus:
        annualRevenue > MEI_ANNUAL_LIMIT
          ? 'INELIGIBLE'
          : annualPayroll > 0
            ? 'REQUIRES_REVIEW'
            : 'ELIGIBLE',
      legalBasis: [
        'Portal gov.br/Empresas e Negócios: MEI pode faturar até R$ 81.000,00 por ano e contratar no máximo um empregado que receba salário mínimo ou piso da categoria.',
        'Resolução CGSN nº 140/2018, arts. 100, 101 e 105: ocupações permitidas e limites operacionais do SIMEI.',
      ],
      annualRevenue,
      annualDeductibleExpenses,
      annualPayroll,
      taxableBase: annualRevenue,
      estimatedTax: annualRevenue > MEI_ANNUAL_LIMIT || annualPayroll > 0 ? -1 : money(85 * 12),
      warnings:
        annualRevenue > MEI_ANNUAL_LIMIT
          ? ['Faturamento informado supera o limite anual usual do MEI; exige avaliação de desenquadramento.']
          : annualPayroll > 0
            ? [
                'MEI bloqueado para recomendação automática: há folha informada e o sistema ainda não validou quantidade de empregados, piso da categoria e ocupação permitida.',
              ]
            : ['MEI depende de atividade permitida e demais limites legais.'],
      components: [
        {
          code:
            annualRevenue > MEI_ANNUAL_LIMIT || annualPayroll > 0
              ? 'MEI_ELIGIBILITY_REVIEW_REQUIRED'
              : 'MEI_FIXED_MONTHLY_DAS_ESTIMATE',
          label:
            annualRevenue > MEI_ANNUAL_LIMIT || annualPayroll > 0
              ? 'Elegibilidade MEI exige revisão'
              : 'DAS mensal fixo estimado',
          amount: annualRevenue > MEI_ANNUAL_LIMIT || annualPayroll > 0 ? 0 : money(85 * 12),
          basis:
            annualRevenue > MEI_ANNUAL_LIMIT || annualPayroll > 0
              ? 'Motor bloqueia recomendação automática de MEI quando limite de receita ou folha informada impedem validação segura sem evidências adicionais.'
              : 'Estimativa orientativa; valor real depende da atividade e legislação vigente.',
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
      annualDeductibleExpenses,
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
      annualDeductibleExpenses,
      annualPayroll,
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
  const viableComparisons = comparisons.filter(
    (comparison) =>
      comparison.estimatedTax >= 0 &&
      comparison.eligibilityStatus !== 'INELIGIBLE' &&
      comparison.eligibilityStatus !== 'REQUIRES_REVIEW',
  );
  const best = [...viableComparisons].sort((a, b) => b.netAnnualResult - a.netAnnualResult)[0];
  const bestEstimatedModel = best?.model ?? 'PF';
  const currentResult = comparisons.find((comparison) => comparison.model === input.currentModel);
  const potentialGain = currentResult && best && isSavingsComparable(currentResult)
    ? money(best.netAnnualResult - currentResult.netAnnualResult)
    : 0;
  const complianceTrail = buildDemoComplianceTrail(
    input,
    comparisons,
    annualRevenue,
    annualPayroll,
    factorRPercentage,
  );
  const calculationAudit = buildDemoCalculationAudit(
    input,
    comparisons,
    annualRevenue,
    annualDeductibleExpenses,
    annualPayroll,
    factorRPercentage,
  );
  const recommendation: TaxScenarioRecommendation = {
    decision:
      annualRevenue > SIMPLES_ANNUAL_LIMIT
        ? 'ASSISTED_TAX_PLANNING_REQUIRED'
        : bestEstimatedModel === 'PF'
          ? 'PF_REVIEW_RECOMMENDED'
          : factorRPercentage > 0 && factorRPercentage < FACTOR_R_THRESHOLD
            ? 'SIMPLES_WITH_FACTOR_R_REVIEW'
            : 'PJ_SIMULATION_RECOMMENDED',
    title:
      annualRevenue > SIMPLES_ANNUAL_LIMIT
        ? 'Simples Nacional bloqueado pelo limite de receita'
        : bestEstimatedModel === 'PF'
          ? 'PF permanece melhor na simulação preliminar'
          : factorRPercentage > 0 && factorRPercentage < FACTOR_R_THRESHOLD
            ? 'Revisar Fator R antes de decidir o modelo'
            : 'Estrutura PJ merece análise assistida',
    rationale: [
      annualRevenue > SIMPLES_ANNUAL_LIMIT
        ? 'A receita anualizada supera R$ 4.800.000,00, limite geral de EPP para permanência no Simples Nacional.'
        : bestEstimatedModel === 'PF'
          ? 'Com os valores informados, os regimes PJ elegíveis não superam o resultado líquido estimado da pessoa física.'
          : `Modelo com melhor resultado estimado: ${bestEstimatedModel}.`,
      bestEstimatedModel === 'PF' && factorRPercentage > 0 && factorRPercentage < FACTOR_R_THRESHOLD
        ? `Fator R estimado em ${factorRPercentage}%, abaixo do limiar de 28%; Simples para serviços tende a exigir Anexo V até revisão da folha/pró-labore.`
        : potentialGain > 0
          ? `Ganho anual estimado contra o modelo atual: R$ ${potentialGain.toLocaleString('pt-BR')}.`
          : 'A comparação indica necessidade de detalhamento antes de decisão.',
    ],
    requiredEvidence:
      bestEstimatedModel === 'PF'
        ? [
            'Recibos/notas e retenções dos últimos 12 meses',
            'Despesas dedutíveis com documentação hábil',
            'CNAE pretendido e município de prestação',
          ]
        : ['CNAE pretendido', 'Município de prestação', 'Notas/recibos recentes'],
    nextActions:
      bestEstimatedModel === 'PF'
        ? [
            'Manter recomendação como triagem, sem promessa de economia',
            'Validar livro caixa e retenções',
            'Submeter revisão CRC antes de proposta de migração',
          ]
        : ['Rodar onboarding de abertura/migração', 'Validar regime tributário', 'Submeter revisão CRC'],
  };
  const serviceQualification = buildDemoServiceQualification(
    recommendation,
    complianceTrail,
    bestEstimatedModel,
  );
  const preProposal = buildDemoPreProposal(input, serviceQualification, complianceTrail);

  return {
    status: 'OK',
    regressionSuite: TAX_SCENARIO_REGRESSION_SUITE,
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
    recommendation,
    complianceTrail,
    calculationAudit,
    serviceQualification,
    preProposal,
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
    typeof bestScenario?.netAnnualResult === 'number' &&
    typeof currentScenario?.netAnnualResult === 'number' &&
    isSavingsComparable(currentScenario)
      ? Number((bestScenario.netAnnualResult - currentScenario.netAnnualResult).toFixed(2))
      : 0;
  const normalizedPreProposal =
    data.preProposal ??
    (data.serviceQualification && data.complianceTrail
      ? buildDemoPreProposal(requestPayload, data.serviceQualification, data.complianceTrail)
      : undefined);
  const compatiblePreProposal = normalizedPreProposal
    ? {
        ...normalizedPreProposal,
        validUntil: normalizedPreProposal.validUntil ?? resolveDemoPreProposalValidityDate(),
        refreshTriggers:
          normalizedPreProposal.refreshTriggers ??
          [
            'Alteração de faturamento, folha, pró-labore, dependentes, CNAE, município ou regime atual.',
            'Recebimento de RBT12 oficial, XMLs, notas, retenções, extratos ou escrituração que divirjam dos valores simulados.',
            'Publicação de ato legal, nota técnica, tabela ou orientação fiscal que altere alíquotas, limites, anexos ou obrigações aplicáveis.',
          ],
      }
    : undefined;

  return {
    ...data,
    regressionSuite: data.regressionSuite ?? TAX_SCENARIO_REGRESSION_SUITE,
    preProposal: compatiblePreProposal,
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

    if (isDemoSession()) {
      assertOperationalDemoFallbackEnabled(
        'Simulador tributário demo indisponível porque o fallback demonstrativo está desabilitado neste ambiente.',
      );

      return normalizeSimulationResponse(createDemoSimulation(requestPayload, companyId), requestPayload, companyId);
    }

    const { data } = await api.post<SimulationResponse>(
      '/tax-scenarios/simulate',
      requestPayload,
    );

    return normalizeSimulationResponse(data, requestPayload, companyId);
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

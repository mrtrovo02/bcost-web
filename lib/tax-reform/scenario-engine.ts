import { CBS_IBS_TRANSITION } from './official-data';

export interface TaxReformScenarioInput {
  annualRevenue: number;
  currentTax: number;
  creditRecoveryRate?: number;
  restructuringGainRate?: number;
}

export interface TaxReformScenario {
  id: 'current' | 'parallel-test' | 'post-reform-reference' | 'restructured';
  title: string;
  period: string;
  taxAmount: number;
  effectiveRate: number;
  cashImpact: number;
  status: 'stable' | 'attention' | 'critical' | 'opportunity';
  note: string;
}

export interface TaxReformScenarioResult {
  scenarios: TaxReformScenario[];
  referenceGap: number;
  restructuredSaving: number;
  recommendedAction: string;
  assumptions: {
    cbsIbsTestRate: number;
    referenceVatRate: number;
    creditRecoveryRate: number;
    restructuringGainRate: number;
  };
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function rate(amount: number, base: number): number {
  return base > 0 ? (amount / base) * 100 : 0;
}

export function calculateTaxReformScenarios({
  annualRevenue,
  currentTax,
  creditRecoveryRate = 0.08,
  restructuringGainRate = 0.12,
}: TaxReformScenarioInput): TaxReformScenarioResult {
  const safeRevenue = Math.max(0, annualRevenue);
  const safeCurrentTax = Math.max(0, currentTax);

  const cbsIbsTestAmount = safeRevenue * CBS_IBS_TRANSITION.totalTestRate;
  const postReformGrossReference = safeRevenue * CBS_IBS_TRANSITION.referenceVatRate;
  const estimatedCredits = safeRevenue * creditRecoveryRate;
  const postReformNetReference = Math.max(0, postReformGrossReference - estimatedCredits);
  const restructuredTax = Math.max(0, postReformNetReference * (1 - restructuringGainRate));

  const scenarios: TaxReformScenario[] = [
    {
      id: 'current',
      title: 'Simples atual',
      period: '2026',
      taxAmount: money(safeCurrentTax),
      effectiveRate: rate(safeCurrentTax, safeRevenue),
      cashImpact: 0,
      status: 'stable',
      note: 'Base atual de comparação: carga efetiva informada pelo painel fiscal.',
    },
    {
      id: 'parallel-test',
      title: 'CBS/IBS em teste',
      period: '2026',
      taxAmount: money(cbsIbsTestAmount),
      effectiveRate: CBS_IBS_TRANSITION.totalTestRate * 100,
      cashImpact: money(cbsIbsTestAmount),
      status: 'attention',
      note: 'Valor de destaque operacional para adaptação de documentos fiscais, sem tratar como recolhimento definitivo.',
    },
    {
      id: 'post-reform-reference',
      title: 'Pós-reforma referência',
      period: '2027-2033',
      taxAmount: money(postReformNetReference),
      effectiveRate: rate(postReformNetReference, safeRevenue),
      cashImpact: money(postReformNetReference - safeCurrentTax),
      status: postReformNetReference > safeCurrentTax ? 'critical' : 'stable',
      note: 'Referência gerencial com IVA de 26,5% e abatimento estimado de créditos.',
    },
    {
      id: 'restructured',
      title: 'Com reestruturação',
      period: '2027-2033',
      taxAmount: money(restructuredTax),
      effectiveRate: rate(restructuredTax, safeRevenue),
      cashImpact: money(restructuredTax - safeCurrentTax),
      status: 'opportunity',
      note: 'Cenário com revisão de créditos, documentação e mix operacional antes da transição plena.',
    },
  ];

  const referenceGap = money(postReformNetReference - safeCurrentTax);
  const restructuredSaving = money(postReformNetReference - restructuredTax);

  return {
    scenarios,
    referenceGap,
    restructuredSaving,
    recommendedAction:
      referenceGap > 0
        ? 'Priorizar inventário de créditos, validação de XML/NF-e e simulação por CNAE antes do fechamento do próximo ciclo.'
        : 'Manter monitoramento mensal e preparar a empresa para a apuração paralela CBS/IBS.',
    assumptions: {
      cbsIbsTestRate: CBS_IBS_TRANSITION.totalTestRate,
      referenceVatRate: CBS_IBS_TRANSITION.referenceVatRate,
      creditRecoveryRate,
      restructuringGainRate,
    },
  };
}

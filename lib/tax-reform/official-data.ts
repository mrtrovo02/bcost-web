'use strict';

/**
 * Fontes oficiais e parâmetros da Reforma Tributária (CBS/IBS).
 *
 * ATENÇÃO — mantenha este arquivo como fonte única de verdade (single
 * source of truth) para textos e percentuais de CBS/IBS exibidos no app.
 * Nenhum outro componente deve hardcodar esses valores no JSX.
 *
 * Base normativa: LC 214/2025, regulamentada pelo Decreto Federal
 * nº 12.955/2026 ("Livro I — Parte Geral dos Regulamentos da CBS e do IBS").
 */

export const TAX_REFORM_OFFICIAL_SOURCES = {
  constitutionalAmendment132:
    'https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm',
  complementaryLaw214:
    'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm',
  revenueTaxReform:
    'https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/reforma-tributaria',
} as const;

export const CBS_IBS_TRANSITION = {
  testStartDate: '2026-08-01',
  displayStartDate: '01/08/2026',
  cbsRate: 0.009,
  ibsRate: 0.001,
  totalTestRate: 0.01,
  referenceVatRate: 0.265,
  phaseLabel: 'Fase de calibração 2026',

  /**
   * IMPORTANTE — verificado contra o Decreto Federal nº 12.955/2026
   * (Livro I, Disposições Finais, art. 464):
   *
   * O recolhimento efetivo da CBS é DISPENSADO para fatos geradores
   * ocorridos entre 01/01/2026 e 31/12/2026, para contribuintes que
   * cumprirem as obrigações acessórias. A apuração no ano de 2026 tem
   * caráter MERAMENTE INFORMATIVO — não há exigência de pagamento nem
   * risco de autuação por inadimplência de CBS/IBS neste período.
   *
   * Por isso, o app NÃO deve comunicar isso como prazo/deadline
   * ameaçador. É um destaque informativo de calibração dos sistemas.
   */
  isCollectionDispensedIn2026: true,
  dispensedFrom: '2026-01-01',
  dispensedTo: '2026-12-31',

  officialBasis:
    'LC 214/2025 e Decreto Federal 12.955/2026: em 2026, CBS de 0,9% e IBS de 0,1% ' +
    'são destacados nos documentos fiscais em caráter de calibração. O recolhimento ' +
    'é dispensado para quem cumprir as obrigações acessórias (apuração informativa).',

  operationalNote:
    'Em 2026, o destaque de CBS/IBS na nota fiscal serve para calibrar sistemas e ' +
    'processos. Não há recolhimento exigido nem risco de autuação para quem cumprir ' +
    'as obrigações acessórias no período — trate como teste operacional, não como ' +
    'cobrança real.',

  legalCitation:
    'Decreto Federal nº 12.955/2026, Livro I, Disposições Finais (art. 464, referente ' +
    'ao art. 348, §1º da LC 214/2025).',
} as const;

export const SPLIT_PAYMENT_ASSUMPTIONS = {
  phaseLabel: 'Cenário gerencial bCost (projeção interna)',
  officialBasis:
    'A Reforma Tributária prevê mecanismos de arrecadação vinculados ao pagamento ' +
    '(split payment). Até a data de consolidação desta base, o cronograma normativo ' +
    'detalhado do split payment não foi localizado nos regulamentos publicados ' +
    '(Decreto 12.955/2026, Livro I). Trate como projeção de planejamento, não como ' +
    'obrigação vigente.',
  caveat:
    'As fases abaixo são premissas de planejamento de caixa do bCost, não calendário ' +
    'normativo confirmado. Reavalie quando a regulamentação específica for publicada.',
  isNormativelyConfirmed: false,
} as const;

export const CREDIT_LIFECYCLE = {
  /**
   * Ciclo de vida do crédito de CBS/IBS conforme regulamento:
   * 1. A_APROPRIAR — crédito reconhecido mas ainda não disponível para uso
   * 2. APROPRIADO  — crédito disponível para compensação
   * 3. UTILIZADO   — crédito efetivamente compensado/ressarcido
   */
  stages: ['A_APROPRIAR', 'APROPRIADO', 'UTILIZADO'] as const,
  labels: {
    A_APROPRIAR: 'A apropriar',
    APROPRIADO: 'Apropriado',
    UTILIZADO: 'Utilizado',
  },
} as const;

export const REAL_ESTATE_TRANSITION_REGIME = {
  rate: 0.0365,
  displayRate: '3,65%',
  description:
    'Regime de transição para operações com bens imóveis (locação/arrendamento): ' +
    'alíquota fixa de 3,65% sobre a receita bruta recebida. Opção irretratável, ' +
    'manifestada pela emissão do primeiro documento fiscal sob o novo regime.',
} as const;

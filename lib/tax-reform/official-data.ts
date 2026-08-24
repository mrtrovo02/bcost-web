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
    'https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo',
  revenueGuidance2026:
    'https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026',
  revenueTaxReformOverview:
    'https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/entenda',
  nfseGuidance2026:
    'https://www.gov.br/nfse/pt-br/noticias/cgnfs-e-orienta-sobre-os-prazos-para%20destaque-de-ibs-cbs-nas-notas-fiscais-de-servico',
  dfeImplementationSchedule:
    'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/julho/receita-federal-e-comite-gestor-do-ibs-publicam-o-cronograma-de-implementacao-dos-documentos-fiscais-eletronicos-da-reforma-tributaria-do-consumo',
} as const;

export const CBS_IBS_TRANSITION = {
  testStartDate: '2026-01-01',
  displayStartDate: '01/01/2026',
  cbsRate: 0.009,
  ibsRate: 0.001,
  totalTestRate: 0.01,
  referenceVatRate: 0.265,
  phaseLabel: 'Fase de calibração 2026',

  /**
   * IMPORTANTE — verificado contra EC 132/2023, LC 214/2025 e
   * orientações oficiais da Receita Federal/CGIBS para 2026:
   *
   * O recolhimento efetivo da CBS/IBS em 2026 é condicionado às obrigações
   * acessórias: o contribuinte que emitir documentos fiscais ou declarações
   * de regimes específicos observando normas e notas técnicas vigentes fica
   * dispensado de recolhimento. A apuração tem caráter operacional de teste,
   * mas a desconformidade documental deve ser tratada como risco fiscal.
   *
   * Por isso, o app NÃO deve comunicar isso como cobrança definitiva.
   * É um destaque informativo de calibração dos sistemas com controle de
   * conformidade documental.
   */
  isCollectionDispensedIn2026: true,
  dispensedFrom: '2026-01-01',
  dispensedTo: '2026-12-31',

  officialBasis:
    'EC 132/2023, LC 214/2025 e orientações RFB/CGIBS: em 2026, CBS de 0,9% e IBS ' +
    'de 0,1% são destacados nos documentos fiscais em caráter de teste. A dispensa ' +
    'de recolhimento depende do cumprimento das obrigações acessórias e notas técnicas vigentes.',

  operationalNote:
    'Em 2026, o destaque de CBS/IBS nos documentos fiscais serve para calibrar sistemas e ' +
    'processos. O recolhimento é dispensado para quem cumprir as obrigações acessórias ' +
    'vigentes, mas omissões ou preenchimentos incorretos devem ser tratados como ' +
    'desconformidade fiscal, não como cobrança real automática.',

  legalCitation:
    'EC 132/2023, LC 214/2025 e orientações oficiais RFB/CGIBS para documentos fiscais de 2026.',

  requiredElectronicDocuments2026: [
    'NF-e',
    'NFC-e',
    'CT-e',
    'CT-e OS',
    'NFS-e',
    'NFS-e Via',
    'NFCom',
    'NF3e',
    'BP-e',
    'BP-e TM',
  ],

  complianceRiskNote:
    'Na NFS-e nacional, a ausência ou omissão de IBS/CBS até 31/12/2026 não causa rejeição automática, ' +
    'mas evidencia desconformidade do documento fiscal e deve gerar correção operacional.',
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

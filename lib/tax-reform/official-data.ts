export const TAX_REFORM_OFFICIAL_SOURCES = {
  constitutionalAmendment132:
    'https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm',
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
  phaseLabel: 'Fase de teste 2026',
  officialBasis:
    'EC 132/2023 e regulamentação da Reforma Tributária: transição do modelo atual para CBS e IBS entre 2026 e 2033.',
  operationalNote:
    'Em 2026, CBS e IBS devem ser tratados como destaque/simulação operacional para adaptação dos documentos e sistemas fiscais.',
} as const;

export const SPLIT_PAYMENT_ASSUMPTIONS = {
  phaseLabel: 'Cenário gerencial bCost',
  officialBasis:
    'A Reforma Tributária prevê mecanismos de arrecadação vinculados ao pagamento. O cronograma operacional depende de regulamentação e integração dos meios de pagamento.',
  caveat:
    'As fases abaixo são premissas de planejamento de caixa, não calendário normativo definitivo.',
} as const;

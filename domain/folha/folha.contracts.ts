/**
 * domain/folha/folha.contracts.ts
 * Contratos de domínio do módulo de Departamento Pessoal.
 */

export interface ColaboradorProps {
  id: string;
  companyId: string;
  nome: string;
  cpf: string;
  pis?: string;
  dataAdmissao: string;
  dataDemissao?: string;
  cargo: string;
  salarioBase: number;
  numeroDependentes?: number;
  regime?: 'CLT' | 'PJ' | 'ESTAGIO' | 'SOCIO';
  statusESocial: string;
  statusAtivo?: boolean;
}

export interface FolhaPagamentoResult {
  id: string;
  colaboradorId: string;
  nomeColaborador: string;
  periodoCompetencia: string;
  salarioBruto: number;
  descontoInss: number;
  descontoIrrf: number;
  fgts?: number;
  salarioLiquido: number;
  tipo?: 'MENSAL' | 'DECIMO_TERCEIRO' | 'FERIAS' | 'RESCISAO';
}

export interface ResumoFolha {
  competencia: string;
  totalColaboradores: number;
  totalBruto: number;
  totalInss: number;
  totalIrrf: number;
  totalFgts: number;
  totalLiquido: number;
  encargosPatronais: {
    inssPatronal: number; // 20% sobre salários CLT
    rat: number;          // Risco Ambiental do Trabalho (1-3%)
    terceiros: number;    // Sistema S (~5.8%)
    total: number;
  };
}

export interface ESocialEvent {
  id: string;
  colaboradorId: string;
  tipo:
    | 'S-2200' // Admissão
    | 'S-2205' // Alteração de dados cadastrais
    | 'S-2206' // Alteração de vínculo empregatício
    | 'S-2230' // Afastamento temporário
    | 'S-2299' // Desligamento
    | 'S-1200' // Remuneração do trabalhador
    | 'S-1210' // Pagamentos
    | 'S-1300'; // Contribuição patronal previdenciária
  status: 'PENDENTE' | 'ENVIADO' | 'ACEITO' | 'REJEITADO';
  payload?: Record<string, unknown>;
  enviadoEm?: string;
  receiptCode?: string;
}

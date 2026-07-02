export interface ColaboradorProps {
  id: string;
  companyId: string;
  nome: string;
  cpf: string;
  dataAdmissao: string;
  cargo: string;
  salarioBase: number;
  statusESocial: string;
}

export interface FolhaPagamentoResult {
  id: string;
  colaboradorId: string;
  nomeColaborador: string;
  periodoCompetencia: string;
  salarioBruto: number;
  descontoInss: number;
  descontoIrrf: number;
  salarioLiquido: number;
}


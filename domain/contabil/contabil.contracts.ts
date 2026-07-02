export interface ContaContabilProps {
  id: string;
  companyId: string;
  codigoEstruturado: string;
  nome: string;
  tipo: "ATIVO" | "PASSIVO" | "PATRIMONIO_LIQUIDO" | "RECEITA" | "DESPESA";
  natureza: "DEVEDORA" | "CREDORA";
}

export interface LancamentoContabilInput {
  companyId: string;
  dataLancamento: string;
  historico: string;
  numeroDocumento?: string;
  linhas: {
    contaId: string;
    tipoMovimento: "DEBITO" | "CREDITO";
    valor: number;
  }[];
}

export interface DemonstrativoFinanceiroResult {
  periodo: string;
  linhas: {
    codigo: string;
    descricao: string;
    valor: number;
    sublinhas?: any[];
  }[];
  total: number;
}


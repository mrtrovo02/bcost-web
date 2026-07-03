/**
 * domain/contabil/contabil.contracts.ts
 * Contratos de domínio do módulo Contábil.
 */

export interface ContaContabilProps {
  id: string;
  companyId: string;
  codigoEstruturado: string;
  nome: string;
  tipo: 'ATIVO' | 'PASSIVO' | 'PATRIMONIO_LIQUIDO' | 'RECEITA' | 'DESPESA' | 'CUSTO';
  natureza: 'DEVEDORA' | 'CREDORA';
  ativa?: boolean;
  codigoPai?: string;
}

export interface LancamentoContabilInput {
  companyId: string;
  dataLancamento: string;
  historico: string;
  numeroDocumento?: string;
  linhas: {
    contaId: string;
    tipoMovimento: 'DEBITO' | 'CREDITO';
    valor: number;
  }[];
}

export interface DemonstrativoFinanceiroResult {
  periodo: string;
  linhas: {
    codigo: string;
    descricao: string;
    valor: number;
    sublinhas?: DemonstrativoFinanceiroResult['linhas'];
  }[];
  total: number;
}

export interface BalancoPatrimonialResult {
  periodo: string;
  ativo: {
    circulante: { descricao: string; valor: number }[];
    naoCirculante: { descricao: string; valor: number }[];
    totalAtivo: number;
  };
  passivo: {
    circulante: { descricao: string; valor: number }[];
    naoCirculante: { descricao: string; valor: number }[];
    patrimonioLiquido: { descricao: string; valor: number }[];
    totalPassivoEPL: number;
  };
}

export interface RazaoContabilResult {
  conta: string;
  nomeConta: string;
  periodo: string;
  lancamentos: {
    data: string;
    historico: string;
    debito: number;
    credito: number;
    saldo: number;
  }[];
  saldoFinal: number;
}

export interface BalanceteResult {
  periodo: string;
  contas: {
    codigo: string;
    nome: string;
    saldoAnterior: number;
    debitos: number;
    creditos: number;
    saldoAtual: number;
  }[];
  totalDebitos: number;
  totalCreditos: number;
}

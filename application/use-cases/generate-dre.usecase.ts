/**
 * application/use-cases/generate-dre.usecase.ts
 * Gera a Demonstração do Resultado do Exercício (DRE) a partir dos lançamentos reais.
 */
import { DemonstrativoFinanceiroResult } from '@/domain/contabil/contabil.contracts';

export interface LancamentoContabil {
  date?: string;
  dataLancamento?: string;
  description?: string;
  historico?: string;
  origin?: string;
  origem?: string;
  amount?: number;
  accountName?: string;
  debitCode?: string;
  debitAccountName?: string;
  debito?: string;
  creditCode?: string;
  creditAccountName?: string;
  credito?: string;
}

export interface IContabilRepository {
  getLancamentosPeriodo(
    companyId: string,
    dataInicio: string,
    dataFim: string,
  ): Promise<LancamentoContabil[]>;
}

export interface GenerateDreInput {
  companyId: string;
  ano: number;
  mes?: number; // se informado, gera DRE do mês; senão, do ano inteiro
}

export class GenerateDreUseCase {
  constructor(private contabilRepository: IContabilRepository) {}

  public async execute(request: GenerateDreInput): Promise<DemonstrativoFinanceiroResult> {
    if (!request.companyId) {
      throw new Error('[GenerateDreUseCase] companyId obrigatório.');
    }

    const dataInicio = request.mes
      ? `${request.ano}-${String(request.mes).padStart(2, '0')}-01`
      : `${request.ano}-01-01`;

    const dataFim = request.mes
      ? `${request.ano}-${String(request.mes).padStart(2, '0')}-31`
      : `${request.ano}-12-31`;

    const lancamentos = await this.contabilRepository.getLancamentosPeriodo(
      request.companyId,
      dataInicio,
      dataFim,
    );

    // Agrega por tipo de conta baseado nos lançamentos reais
    let receitaBruta = 0;
    let custos = 0;
    let despesasOp = 0;
    let impostos = 0;

    for (const l of lancamentos) {
      const origem: string = (l.origin ?? l.origem ?? '').toUpperCase();
      const valor: number = typeof l.amount === 'number' ? l.amount : 0;
      const debito: string = (l.debitCode ?? l.debito ?? '').toString();
      const credito: string = (l.creditCode ?? l.credito ?? '').toString();

      // Receita: crédito em contas de receita (código começa com 3 ou 4 no padrão CFC)
      if (credito.startsWith('3') || credito.startsWith('4')) {
        receitaBruta += valor;
      }
      // Custos: débito em contas de custo (código começa com 5)
      if (debito.startsWith('5')) {
        custos += valor;
      }
      // Despesas operacionais (código começa com 6)
      if (debito.startsWith('6')) {
        despesasOp += valor;
      }
      // Impostos sobre receita (origem TAX ou DARF/DAS)
      if (origem === 'TAX_PAYMENT' || origem === 'INVOICE_AUTO') {
        impostos += valor;
      }
    }

    const receitaLiquida = receitaBruta - impostos;
    const lucroBruto = receitaLiquida - custos;
    const resultadoLiquido = lucroBruto - despesasOp;

    const periodo = request.mes
      ? `${String(request.mes).padStart(2, '0')}/${request.ano}`
      : String(request.ano);

    return {
      periodo,
      linhas: [
        { codigo: '3', descricao: 'RECEITA BRUTA DE VENDAS E SERVIÇOS', valor: receitaBruta },
        { codigo: '3.1', descricao: '(-) DEDUÇÕES E IMPOSTOS SOBRE RECEITA', valor: -impostos },
        { codigo: '3.2', descricao: '(=) RECEITA LÍQUIDA', valor: receitaLiquida },
        { codigo: '5', descricao: '(-) CUSTOS DOS SERVIÇOS / PRODUTOS', valor: -custos },
        { codigo: '5.1', descricao: '(=) LUCRO BRUTO', valor: lucroBruto },
        { codigo: '6', descricao: '(-) DESPESAS OPERACIONAIS', valor: -despesasOp },
        { codigo: '7', descricao: '(=) RESULTADO LÍQUIDO DO EXERCÍCIO', valor: resultadoLiquido },
      ],
      total: resultadoLiquido,
    };
  }
}

/**
 * application/use-cases/generate-balanco.usecase.ts
 * Gera o Balanço Patrimonial a partir dos lançamentos contábeis.
 */
import { BalancoPatrimonialResult } from '@/domain/contabil/contabil.contracts';
import { IContabilRepository } from './generate-dre.usecase';

export interface GenerateBalancoInput {
  companyId: string;
  ano: number;
  mes?: number;
}

export class GenerateBalancoUseCase {
  constructor(private contabilRepository: IContabilRepository) {}

  public async execute(request: GenerateBalancoInput): Promise<BalancoPatrimonialResult> {
    if (!request.companyId) {
      throw new Error('[GenerateBalancoUseCase] companyId obrigatório.');
    }

    const dataFim = request.mes
      ? `${request.ano}-${String(request.mes).padStart(2, '0')}-31`
      : `${request.ano}-12-31`;

    const lancamentos = await this.contabilRepository.getLancamentosPeriodo(
      request.companyId,
      `${request.ano}-01-01`,
      dataFim,
    );

    // Agrega saldos por grupo de conta (padrão CFC)
    const saldos: Record<string, number> = {};

    for (const l of lancamentos) {
      const debito: string = (l.debitCode ?? l.debito ?? '').toString();
      const credito: string = (l.creditCode ?? l.credito ?? '').toString();
      const valor: number = typeof l.amount === 'number' ? l.amount : 0;

      saldos[debito] = (saldos[debito] ?? 0) + valor;
      saldos[credito] = (saldos[credito] ?? 0) - valor;
    }

    const soma = (prefixos: string[]) =>
      Object.entries(saldos)
        .filter(([k]) => prefixos.some((p) => k.startsWith(p)))
        .reduce((acc, [, v]) => acc + Math.abs(v), 0);

    const caixaEquivalentes = soma(['1.1.1', '1.1.2']);
    const contasReceber = soma(['1.1.3']);
    const estoques = soma(['1.1.4']);
    const outrosCirculante = soma(['1.1.9']);
    const imobilizado = soma(['1.2.1']);
    const intangivel = soma(['1.2.2']);

    const fornecedores = soma(['2.1.1']);
    const obrigacoesFiscais = soma(['2.1.2']);
    const obrigacoesTrabalh = soma(['2.1.3']);
    const outrosPassivoCirc = soma(['2.1.9']);
    const emprestimosLP = soma(['2.2.1']);
    const capitalSocial = soma(['3.1']);
    const reservas = soma(['3.2']);
    const lucroAcumulado = soma(['3.3']);

    const totalAtivo =
      caixaEquivalentes +
      contasReceber +
      estoques +
      outrosCirculante +
      imobilizado +
      intangivel;

    const totalPassivoEPL =
      fornecedores +
      obrigacoesFiscais +
      obrigacoesTrabalh +
      outrosPassivoCirc +
      emprestimosLP +
      capitalSocial +
      reservas +
      lucroAcumulado;

    const periodo = request.mes
      ? `${String(request.mes).padStart(2, '0')}/${request.ano}`
      : String(request.ano);

    return {
      periodo,
      ativo: {
        circulante: [
          { descricao: 'Caixa e Equivalentes de Caixa', valor: caixaEquivalentes },
          { descricao: 'Contas a Receber', valor: contasReceber },
          { descricao: 'Estoques', valor: estoques },
          { descricao: 'Outros Ativos Circulantes', valor: outrosCirculante },
        ],
        naoCirculante: [
          { descricao: 'Imobilizado', valor: imobilizado },
          { descricao: 'Intangível', valor: intangivel },
        ],
        totalAtivo,
      },
      passivo: {
        circulante: [
          { descricao: 'Fornecedores', valor: fornecedores },
          { descricao: 'Obrigações Fiscais', valor: obrigacoesFiscais },
          { descricao: 'Obrigações Trabalhistas', valor: obrigacoesTrabalh },
          { descricao: 'Outros Passivos Circulantes', valor: outrosPassivoCirc },
        ],
        naoCirculante: [{ descricao: 'Empréstimos e Financiamentos', valor: emprestimosLP }],
        patrimonioLiquido: [
          { descricao: 'Capital Social', valor: capitalSocial },
          { descricao: 'Reservas de Lucros', valor: reservas },
          { descricao: 'Lucros/Prejuízos Acumulados', valor: lucroAcumulado },
        ],
        totalPassivoEPL,
      },
    };
  }
}

/**
 * application/use-cases/generate-razao.usecase.ts
 * Gera o Razão Contábil de uma conta específica.
 */
import { RazaoContabilResult } from '@/domain/contabil/contabil.contracts';
import { IContabilRepository } from './generate-dre.usecase';

export interface GenerateRazaoInput {
  companyId: string;
  contaCodigo: string;
  dataInicio: string;
  dataFim: string;
}

export class GenerateRazaoUseCase {
  constructor(private contabilRepository: IContabilRepository) {}

  public async execute(request: GenerateRazaoInput): Promise<RazaoContabilResult> {
    if (!request.companyId) throw new Error('[GenerateRazaoUseCase] companyId obrigatório.');
    if (!request.contaCodigo) throw new Error('[GenerateRazaoUseCase] contaCodigo obrigatório.');

    const todos = await this.contabilRepository.getLancamentosPeriodo(
      request.companyId,
      request.dataInicio,
      request.dataFim,
    );

    const filtrados = todos.filter(
      (l) =>
        (l.debitCode ?? '').toString() === request.contaCodigo ||
        (l.creditCode ?? '').toString() === request.contaCodigo,
    );

    let saldoAcumulado = 0;
    const linhas = filtrados.map((l) => {
      const valor: number = typeof l.amount === 'number' ? l.amount : 0;
      const ehDebito = (l.debitCode ?? '').toString() === request.contaCodigo;
      const debito = ehDebito ? valor : 0;
      const credito = ehDebito ? 0 : valor;
      saldoAcumulado += debito - credito;

      return {
        data: l.date ?? l.dataLancamento ?? '',
        historico: l.description ?? l.historico ?? '',
        debito,
        credito,
        saldo: saldoAcumulado,
      };
    });

    return {
      conta: request.contaCodigo,
      nomeConta: filtrados[0]?.accountName ?? request.contaCodigo,
      periodo: `${request.dataInicio} a ${request.dataFim}`,
      lancamentos: linhas,
      saldoFinal: saldoAcumulado,
    };
  }
}

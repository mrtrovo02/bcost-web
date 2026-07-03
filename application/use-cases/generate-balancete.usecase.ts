/**
 * application/use-cases/generate-balancete.usecase.ts
 * Gera o Balancete de Verificação.
 */
import { BalanceteResult } from '@/domain/contabil/contabil.contracts';
import { IContabilRepository } from './generate-dre.usecase';

export interface GenerateBalanceteInput {
  companyId: string;
  mes: number;
  ano: number;
}

export class GenerateBalanceteUseCase {
  constructor(private contabilRepository: IContabilRepository) {}

  public async execute(request: GenerateBalanceteInput): Promise<BalanceteResult> {
    if (!request.companyId) throw new Error('[GenerateBalanceteUseCase] companyId obrigatório.');

    const dataInicio = `${request.ano}-${String(request.mes).padStart(2, '0')}-01`;
    const dataFim = `${request.ano}-${String(request.mes).padStart(2, '0')}-31`;

    const lancamentos = await this.contabilRepository.getLancamentosPeriodo(
      request.companyId,
      dataInicio,
      dataFim,
    );

    const contas: Record<string, { nome: string; debitos: number; creditos: number }> = {};

    for (const l of lancamentos) {
      const debito: string = (l.debitCode ?? '').toString();
      const credito: string = (l.creditCode ?? '').toString();
      const valor: number = typeof l.amount === 'number' ? l.amount : 0;
      const nomeDebito: string = l.debitAccountName ?? debito;
      const nomeCredito: string = l.creditAccountName ?? credito;

      if (debito) {
        if (!contas[debito]) contas[debito] = { nome: nomeDebito, debitos: 0, creditos: 0 };
        contas[debito].debitos += valor;
      }
      if (credito) {
        if (!contas[credito]) contas[credito] = { nome: nomeCredito, debitos: 0, creditos: 0 };
        contas[credito].creditos += valor;
      }
    }

    let totalDebitos = 0;
    let totalCreditos = 0;

    const contasList = Object.entries(contas)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([codigo, c]) => {
        totalDebitos += c.debitos;
        totalCreditos += c.creditos;
        return {
          codigo,
          nome: c.nome,
          saldoAnterior: 0,
          debitos: c.debitos,
          creditos: c.creditos,
          saldoAtual: c.debitos - c.creditos,
        };
      });

    return {
      periodo: `${String(request.mes).padStart(2, '0')}/${request.ano}`,
      contas: contasList,
      totalDebitos,
      totalCreditos,
    };
  }
}

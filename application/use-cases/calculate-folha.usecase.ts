/**
 * application/use-cases/calculate-folha.usecase.ts
 * Calcula folha de pagamento com tabelas INSS/IRRF 2024 e suporte a 13º e férias.
 */
import { FolhaPagamentoResult } from '@/domain/folha/folha.contracts';

export interface IDepartamentoPessoalRepository {
  getColaboradoresByCompany(companyId: string): Promise<any[]>;
}

export interface CalculateFolhaInput {
  companyId: string;
  competencia: string; // formato YYYY-MM
  tipo?: 'MENSAL' | 'DECIMO_TERCEIRO' | 'FERIAS' | 'RESCISAO';
}

// Tabela INSS 2024 (progressiva)
const FAIXAS_INSS_2024 = [
  { ate: 1412.00, aliquota: 0.075 },
  { ate: 2666.68, aliquota: 0.09 },
  { ate: 4000.03, aliquota: 0.12 },
  { ate: 7786.02, aliquota: 0.14 },
];

// Tabela IRRF 2024
const FAIXAS_IRRF_2024 = [
  { ate: 2259.20, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { ate: 3751.05, aliquota: 0.15, deducao: 381.44 },
  { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
];

const DEDUCAO_DEPENDENTE_IRRF = 189.59;

function calcularINSSProgressivo(salarioBruto: number): number {
  let inss = 0;
  let baseRestante = salarioBruto;
  let faixaAnterior = 0;

  for (const faixa of FAIXAS_INSS_2024) {
    if (baseRestante <= 0) break;
    const baseNaFaixa = Math.min(salarioBruto, faixa.ate) - faixaAnterior;
    if (baseNaFaixa > 0) {
      inss += baseNaFaixa * faixa.aliquota;
    }
    faixaAnterior = faixa.ate;
    if (salarioBruto <= faixa.ate) break;
  }

  return Math.round(inss * 100) / 100;
}

function calcularIRRF(salarioBruto: number, inss: number, numeroDependentes = 0): number {
  const baseCalculo = salarioBruto - inss - numeroDependentes * DEDUCAO_DEPENDENTE_IRRF;
  if (baseCalculo <= 0) return 0;

  for (const faixa of FAIXAS_IRRF_2024) {
    if (baseCalculo <= faixa.ate) {
      const irrf = baseCalculo * faixa.aliquota - faixa.deducao;
      return Math.max(0, Math.round(irrf * 100) / 100);
    }
  }

  return 0;
}

function calcularFGTS(salarioBruto: number): number {
  return Math.round(salarioBruto * 0.08 * 100) / 100;
}

export class CalculateFolhaUseCase {
  constructor(private dpRepository: IDepartamentoPessoalRepository) {}

  public async execute(request: CalculateFolhaInput): Promise<FolhaPagamentoResult[]> {
    if (!request.companyId) {
      throw new Error('[CalculateFolhaUseCase] companyId obrigatório.');
    }

    const colaboradores = await this.dpRepository.getColaboradoresByCompany(request.companyId);
    const tipo = request.tipo ?? 'MENSAL';

    return colaboradores.map((colaborador) => {
      const salarioBase: number = colaborador.salarioBase ?? colaborador.salary ?? 0;
      const numeroDependentes: number = colaborador.numeroDependentes ?? colaborador.dependents ?? 0;

      let salarioBruto = salarioBase;

      if (tipo === 'DECIMO_TERCEIRO') {
        salarioBruto = salarioBase / 12; // proporcional — ajustar por meses trabalhados
      }

      if (tipo === 'FERIAS') {
        salarioBruto = salarioBase + salarioBase / 3; // salário + 1/3 constitucional
      }

      const descontoInss = calcularINSSProgressivo(salarioBruto);
      const descontoIrrf = calcularIRRF(salarioBruto, descontoInss, numeroDependentes);
      const fgts = calcularFGTS(salarioBruto);
      const salarioLiquido = salarioBruto - descontoInss - descontoIrrf;

      return {
        id: `${colaborador.id}-${request.competencia}-${tipo}`,
        colaboradorId: colaborador.id,
        nomeColaborador: colaborador.nome ?? colaborador.name ?? '',
        periodoCompetencia: request.competencia,
        salarioBruto,
        descontoInss,
        descontoIrrf,
        fgts,
        salarioLiquido,
        tipo,
      } as FolhaPagamentoResult & { fgts: number; tipo: string };
    });
  }
}

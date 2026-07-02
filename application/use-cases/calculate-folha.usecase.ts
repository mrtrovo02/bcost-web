import { FolhaPagamentoResult } from "@/domain/folha/folha.contracts";

export interface IDepartamentoPessoalRepository {
  getColaboradoresByCompany(companyId: string): Promise<any[]>;
}

export class CalculateFolhaUseCase {
  constructor(private dpRepository: IDepartamentoPessoalRepository) {}

  public async execute(request: { companyId: string; competencia: string }): Promise<FolhaPagamentoResult[]> {
    const colaboradores = await this.dpRepository.getColaboradoresByCompany(request.companyId);

    return colaboradores.map(colaborador => {
      const salarioBase = colaborador.salarioBase || 0;
      
      const descontoInss = salarioBase * 0.11; 
      const descontoIrrf = salarioBase > 2500 ? (salarioBase * 0.075) - 150 : 0;
      const salarioLiquido = salarioBase - descontoInss - descontoIrrf;

      return {
        id: Math.random().toString(36).substring(7),
        colaboradorId: colaborador.id,
        nomeColaborador: colaborador.nome,
        periodoCompetencia: request.competencia,
        salarioBruto: salarioBase,
        descontoInss,
        descontoIrrf,
        salarioLiquido
      };
    });
  }
}


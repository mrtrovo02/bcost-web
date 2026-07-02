import axios from "axios";
import { IDepartamentoPessoalRepository } from "@/application/use-cases/calculate-folha.usecase";

export class AxiosDepartamentoPessoalRepository implements IDepartamentoPessoalRepository {
  public async getColaboradoresByCompany(companyId: string): Promise<any[]> {
    try {
      const response = await axios.get(`/api/v1/empresas/\${companyId}/colaboradores`);
      
      // Garante o desempacotamento seguro do .data do Axios exigido pelo compilador
      return response.data?.colaboradores || response.data || [];
    } catch (error) {
      console.error("Erro na camada de infraestrutura (DP Axios):", error);
      throw error;
    }
  }
}


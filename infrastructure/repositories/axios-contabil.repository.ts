import axios from "axios";
import { IContabilRepository } from "@/application/use-cases/generate-dre.usecase";

export class AxiosContabilRepository implements IContabilRepository {
  public async getLancamentosPeriodo(companyId: string, dataInicio: string, dataFim: string): Promise<any[]> {
    try {
      const response = await axios.get(`/api/v1/contabil/lancamentos`, {
        params: { companyId, dataInicio, dataFim }
      });
      
      // Garante o desempacotamento seguro do .data do Axios exigido pelo compilador
      return response.data?.lancamentos || response.data || [];
    } catch (error) {
      console.error("Erro na camada de infraestrutura (Contábil Axios):", error);
      throw error;
    }
  }
}


/**
 * infrastructure/repositories/axios-dp.repository.ts
 * Repositório de Departamento Pessoal usando o cliente api do projeto.
 */
import { api } from '@/services/api';
import {
  ColaboradorFolha,
  IDepartamentoPessoalRepository,
} from '@/application/use-cases/calculate-folha.usecase';

export class AxiosDepartamentoPessoalRepository implements IDepartamentoPessoalRepository {
  public async getColaboradoresByCompany(companyId: string): Promise<ColaboradorFolha[]> {
    try {
      const response = await api.get('/payroll/enterprise/employees/' + companyId, {
        params: { limit: 500 },
      });
      const payload = response.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.items)) return payload.items;
      if (Array.isArray(payload?.colaboradores)) return payload.colaboradores;
      return [];
    } catch (error) {
      console.error('[AxiosDepartamentoPessoalRepository] getColaboradoresByCompany:', error);
      throw error;
    }
  }
}

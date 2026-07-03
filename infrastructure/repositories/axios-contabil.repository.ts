/**
 * infrastructure/repositories/axios-contabil.repository.ts
 * Repositório contábil usando o cliente api do projeto (com interceptors de auth).
 */
import { api } from '@/services/api';
import { IContabilRepository } from '@/application/use-cases/generate-dre.usecase';

export class AxiosContabilRepository implements IContabilRepository {
  public async getLancamentosPeriodo(
    companyId: string,
    dataInicio: string,
    dataFim: string,
  ): Promise<any[]> {
    try {
      const response = await api.get('/accounting/enterprise/entries/' + companyId, {
        params: { from: dataInicio, to: dataFim, limit: 1000 },
      });
      const payload = response.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.items)) return payload.items;
      return [];
    } catch (error) {
      console.error('[AxiosContabilRepository] getLancamentosPeriodo:', error);
      throw error;
    }
  }
}

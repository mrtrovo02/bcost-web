/**
 * infrastructure/repositories/axios-fiscal.repository.ts
 * Implementação real do contrato FiscalRepository utilizando a instância unificada do Axios.
 */

// Usando alias @/ para manter a robustez independentemente da pasta atual
import { FiscalRepository } from '@/domain/fiscal/fiscal.repository';
import { TaxDataEntity, TaxDataProps } from '@/domain/fiscal/tax-data.entity';
import { apiClient } from '@/services/api'; 

export class AxiosFiscalRepository implements FiscalRepository {
  
  /**
   * Busca os dados fiscais de uma empresa específica.
   * Utiliza a instância configurada do Axios (apiClient).
   */
  public async getTaxDataByCompany(companyId: string, period?: string): Promise<TaxDataEntity> {
    const params = period ? { period } : {};
    
    // Chamada tipada via apiClient
    const response = await apiClient.get<TaxDataProps>('/modules/fiscal/tax-data', {
      params,
      headers: {
        'x-company-id': companyId
      }
    });

    if (!response.data) {
      throw new Error('Nenhum dado retornado pelo servidor de infraestrutura fiscal.');
    }

    // Retorna uma instância rica do Domínio
    return new TaxDataEntity(response.data);
  }

  /**
   * Atualiza dados fiscais parciais.
   */
  public async updateTaxData(companyId: string, data: Partial<TaxDataProps>): Promise<TaxDataEntity> {
    const response = await apiClient.patch<TaxDataProps>('/modules/fiscal/tax-data', data, {
      headers: { 
        'x-company-id': companyId 
      }
    });
    
    return new TaxDataEntity(response.data);
  }
}

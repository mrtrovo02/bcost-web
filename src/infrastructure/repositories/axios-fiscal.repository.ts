/**
 * src/infrastructure/repositories/axios-fiscal.repository.ts
 * Implementacao real do contrato FiscalRepository utilizando a instancia unificada do Axios.
 */

import { FiscalRepository } from '../../domain/fiscal/fiscal.repository';
import { TaxDataEntity, TaxDataProps } from '../../domain/fiscal/tax-data.entity';
import { api } from '../../../services/api';

export class AxiosFiscalRepository implements FiscalRepository {
  
  public async getTaxDataByCompany(companyId: string, period?: string): Promise<TaxDataEntity> {
    const params = period ? { period } : {};
    
    // Faz a chamada utilizando a infraestrutura protegida do nosso api.ts
    const response = await api.get<TaxDataProps>('/modules/fiscal/tax-data', {
      params,
      headers: {
        'x-company-id': companyId
      }
    });

    if (!response.data) {
      throw new Error('Nenhum dado retornado pelo servidor de infraestrutura fiscal.');
    }

    // Retorna uma instancia rica do Dominio, garantindo a integridade dos dados
    return new TaxDataEntity(response.data);
  }

  public async updateTaxData(companyId: string, data: Partial<TaxDataEntity>): Promise<TaxDataEntity> {
    const response = await api.patch<TaxDataProps>('/modules/fiscal/tax-data', data, {
      headers: { 'x-company-id': companyId }
    });
    
    return new TaxDataEntity(response.data);
  }
}

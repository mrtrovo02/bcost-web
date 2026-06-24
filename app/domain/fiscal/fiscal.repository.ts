/**
 * domain/fiscal/fiscal.repository.ts
 * Contrato que a infraestrutura deve seguir.
 * A camada de domínio define O QUE deve ser feito, sem se preocupar com COMO (Axios/API).
 */
import { TaxDataEntity } from './tax-data.entity';

export interface FiscalRepository {
  getTaxDataByCompany(companyId: string, period?: string): Promise<TaxDataEntity>;
  updateTaxData(companyId: string, data: Partial<TaxDataEntity>): Promise<TaxDataEntity>;
}
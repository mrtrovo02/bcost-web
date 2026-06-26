import { TaxDataEntity } from './tax-data.entity';

export interface FiscalRepository {
  getTaxDataByCompany(companyId: string, period?: string): Promise<TaxDataEntity>;
  updateTaxData(companyId: string, data: Partial<TaxDataEntity>): Promise<TaxDataEntity>;
}

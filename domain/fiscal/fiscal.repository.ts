import { TaxDataEntity, type TaxDataProps } from './tax-data.entity';

export interface FiscalRepository {
  getTaxDataByCompany(companyId: string, period?: string): Promise<TaxDataEntity>;
  updateTaxData(companyId: string, data: Partial<TaxDataProps>): Promise<TaxDataEntity>;
}

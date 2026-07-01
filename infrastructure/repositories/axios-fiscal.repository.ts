import { FiscalRepository } from "@/domain/fiscal/fiscal.repository";
import { TaxDataEntity, TaxDataProps } from "@/domain/fiscal/tax-data.entity";
import { apiGet, apiPost } from "@/services/api"; 

export class AxiosFiscalRepository implements FiscalRepository {
  
  public async getTaxDataByCompany(companyId: string, period?: string): Promise<TaxDataEntity> {
    const periodParam = period ? `&period=${encodeURIComponent(period)}` : "";
    const url = `/modules/fiscal/tax-data?company_id=${encodeURIComponent(companyId)}${periodParam}`;

    const { data } = await apiGet<TaxDataProps>(url);

    if (!data) {
      throw new Error("Nenhum dado retornado pelo servidor de infraestrutura fiscal.");
    }

    return new TaxDataEntity(data);
  }

  public async updateTaxData(companyId: string, data: Partial<TaxDataProps>): Promise<TaxDataEntity> {
    const url = `/modules/fiscal/tax-data?company_id=${encodeURIComponent(companyId)}`;
    const { data: resData } = await apiPost<TaxDataProps>(url, data);

    return new TaxDataEntity(resData);
  }
}

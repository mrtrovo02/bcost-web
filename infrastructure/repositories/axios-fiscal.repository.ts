import { FiscalRepository } from '@/domain/fiscal/fiscal.repository';
import { TaxDataEntity, TaxDataProps } from '@/domain/fiscal/tax-data.entity';
import { apiGet, apiPost, isDemoSession } from '@/services/api';
import { getDemoFiscalData } from '@/services/demo-data';

export class AxiosFiscalRepository implements FiscalRepository {
  private buildDemoTaxData(companyId: string): TaxDataProps {
    const demoData = getDemoFiscalData(companyId);
    const firstMonth = demoData.evolucao[0] ?? {
      imposto: 0,
      faturamento: 0,
      taxPercentage: 0,
      otimizado: 0,
      semBeneficio: 0,
      month: 'JAN',
      year: new Date().getFullYear(),
    };

    return {
      totalRevenue: firstMonth.faturamento,
      estimatedTax: firstMonth.imposto,
      netRevenue: firstMonth.faturamento - firstMonth.imposto,
      fatorR: demoData.metadata.anexoUtilizado,
      totalInvoices: 24,
      taxEfficiency: `${firstMonth.taxPercentage.toFixed(1)}%`,
      suggestion: 'Use os dados demo enquanto o endpoint fiscal não estiver disponível.',
    };
  }

  public async getTaxDataByCompany(companyId: string, period?: string): Promise<TaxDataEntity> {
    const periodParam = period ? `&period=${encodeURIComponent(period)}` : '';
    const url = `/modules/fiscal/tax-data?company_id=${encodeURIComponent(companyId)}${periodParam}`;

    const shouldUseDemoFallback = isDemoSession() || companyId.toLowerCase().startsWith('demo-');

    if (shouldUseDemoFallback) {
      return new TaxDataEntity(this.buildDemoTaxData(companyId));
    }

    try {
      const { data } = await apiGet<TaxDataProps>(url, {
        headers: { 'x-company-id': companyId },
      });

      if (!data) {
        throw new Error('Nenhum dado retornado pelo servidor de infraestrutura fiscal.');
      }

      return new TaxDataEntity(data);
    } catch (error) {
      if (shouldUseDemoFallback) {
        return new TaxDataEntity(this.buildDemoTaxData(companyId));
      }

      throw error;
    }
  }

  public async updateTaxData(companyId: string, data: Partial<TaxDataProps>): Promise<TaxDataEntity> {
    const url = `/modules/fiscal/tax-data?company_id=${encodeURIComponent(companyId)}`;
    const { data: resData } = await apiPost<TaxDataProps>(url, data);

    return new TaxDataEntity(resData);
  }
}

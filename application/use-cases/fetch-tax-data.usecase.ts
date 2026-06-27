/**
 * src/application/use-cases/fetch-tax-data.usecase.ts
 * Caso de Uso: Centraliza a busca e processamento dos dados fiscais.
 * Consumivel por UIs e Agentes de IA de forma agnostica.
 */
import { FiscalRepository } from '../../domain/fiscal/fiscal.repository';

export interface FetchTaxDataInput {
  companyId: string;
  period?: string;
}

export interface FetchTaxDataOutput {
  totalRevenue: number;
  estimatedTax: number;
  netRevenue: number;
  fatorR: string;
  totalInvoices: number;
  taxEfficiency?: string;
  suggestion?: string;
}

export class FetchTaxDataUseCase {
  constructor(private fiscalRepository: FiscalRepository) {}

  public async execute(input: FetchTaxDataInput): Promise<FetchTaxDataOutput> {
    if (!input.companyId) {
      throw new Error('[Use Case] Identificador de empresa invalido ou ausente.');
    }

    const taxDataEntity = await this.fiscalRepository.getTaxDataByCompany(
      input.companyId,
      input.period,
    );

    return taxDataEntity.toJSON();
  }
}

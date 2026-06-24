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
  id: string;
  companyId: string;
  period: string;
  faturamentoBruto: number;
  folhaPagamento: number;
  statusConformidade: string;
  fatorR: number;
  isEligibleAnexoIII: boolean;
  updatedAt: Date;
}

export class FetchTaxDataUseCase {
  constructor(private fiscalRepository: FiscalRepository) {}

  /**
   * Executa a regra de negocio orquestrada.
   * Perfeito para definicao como 'Tool' em setups de LLM (Agentic UI).
   */
  public async execute(input: FetchTaxDataInput): Promise<FetchTaxDataOutput> {
    if (!input.companyId) {
      throw new Error('[Use Case] Identificador de empresa invalido ou ausente.');
    }

    // Busca os dados atraves da abstracao do repositorio (Inversao de Dependencia)
    const taxDataEntity = await this.fiscalRepository.getTaxDataByCompany(input.companyId, input.period);

    // Retorna o DTO processado com as regras do Dominio prontas
    return taxDataEntity.toDTO();
  }
}

/**
 * src/shared/factories/fiscal-factory.shared.ts
 * Factory Pattern para instanciacao limpa dos Casos de Uso do Modulo Fiscal.
 */

import { FetchTaxDataUseCase } from '../../application/use-cases/fetch-tax-data.usecase';
import { AxiosFiscalRepository } from '../../infrastructure/repositories/axios-fiscal.repository';

export class FiscalModuleFactory {
  public static makeFetchTaxDataUseCase(): FetchTaxDataUseCase {
    const repository = new AxiosFiscalRepository();
    return new FetchTaxDataUseCase(repository);
  }
}

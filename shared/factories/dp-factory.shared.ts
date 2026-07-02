import { CalculateFolhaUseCase } from "@/application/use-cases/calculate-folha.usecase";
import { AxiosDepartamentoPessoalRepository } from "@/infrastructure/repositories/axios-dp.repository";

export class DpModuleFactory {
  public static makeCalculateFolhaUseCase(): CalculateFolhaUseCase {
    const repository = new AxiosDepartamentoPessoalRepository();
    return new CalculateFolhaUseCase(repository);
  }
}


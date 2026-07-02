import { GenerateDreUseCase } from "@/application/use-cases/generate-dre.usecase";
import { AxiosContabilRepository } from "@/infrastructure/repositories/axios-contabil.repository";

export class ContabilModuleFactory {
  public static makeGenerateDreUseCase(): GenerateDreUseCase {
    const repository = new AxiosContabilRepository();
    return new GenerateDreUseCase(repository);
  }
}


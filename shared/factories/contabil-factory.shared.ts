/**
 * shared/factories/contabil-factory.shared.ts
 * Factory do módulo Contábil — instancia todos os casos de uso.
 */
import { AxiosContabilRepository } from '@/infrastructure/repositories/axios-contabil.repository';
import { GenerateDreUseCase } from '@/application/use-cases/generate-dre.usecase';
import { GenerateBalancoUseCase } from '@/application/use-cases/generate-balanco.usecase';
import { GenerateRazaoUseCase } from '@/application/use-cases/generate-razao.usecase';
import { GenerateBalanceteUseCase } from '@/application/use-cases/generate-balancete.usecase';

const repository = new AxiosContabilRepository();

export const ContabilModuleFactory = {
  makeGenerateDreUseCase(): GenerateDreUseCase {
    return new GenerateDreUseCase(repository);
  },

  makeGenerateBalancoUseCase(): GenerateBalancoUseCase {
    return new GenerateBalancoUseCase(repository);
  },

  makeGenerateRazaoUseCase(): GenerateRazaoUseCase {
    return new GenerateRazaoUseCase(repository);
  },

  makeGenerateBalanceteUseCase(): GenerateBalanceteUseCase {
    return new GenerateBalanceteUseCase(repository);
  },
};

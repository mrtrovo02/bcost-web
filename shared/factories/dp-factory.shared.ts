/**
 * shared/factories/dp-factory.shared.ts
 * Factory do módulo de Departamento Pessoal.
 */
import { AxiosDepartamentoPessoalRepository } from '@/infrastructure/repositories/axios-dp.repository';
import { CalculateFolhaUseCase } from '@/application/use-cases/calculate-folha.usecase';

const repository = new AxiosDepartamentoPessoalRepository();

export const DpModuleFactory = {
  makeCalculateFolhaUseCase(): CalculateFolhaUseCase {
    return new CalculateFolhaUseCase(repository);
  },
};

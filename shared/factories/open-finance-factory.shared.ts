import { AxiosOpenFinanceRepository } from '@/infrastructure/repositories/axios-open-finance.repository';
import { SyncBankAccountsUseCase } from '@/application/use-cases/sync-bank-accounts.usecase';

const openFinanceRepository = new AxiosOpenFinanceRepository();

export const OpenFinanceModuleFactory = {
  makeSyncBankAccountsUseCase(): SyncBankAccountsUseCase {
    return new SyncBankAccountsUseCase(openFinanceRepository);
  }
};

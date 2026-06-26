import { OpenFinanceRepository } from '@/domain/open-finance/open-finance.repository';
import { BankAccountProps } from '@/domain/open-finance/bank-account.entity';

export interface SyncBankAccountsInput {
  companyId: string;
}

export class SyncBankAccountsUseCase {
  constructor(private readonly openFinanceRepository: OpenFinanceRepository) {}

  public async execute(input: SyncBankAccountsInput): Promise<BankAccountProps[]> {
    if (!input.companyId) throw new Error('Company ID ativo é obrigatório.');
    const accounts = await this.openFinanceRepository.getAccounts(input.companyId);
    return accounts.map(account => account.toJSON());
  }
}

import { BankAccountEntity } from './bank-account.entity';
import { TransactionEntity } from './transaction.entity';

export interface PixPaymentInfo {
  paymentId: string;
  qrCodeBase64: string;
  qrCodeCopyPaste: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED';
}

export interface OpenFinanceRepository {
  getAccounts(companyId: string): Promise<BankAccountEntity[]>;
  getTransactions(accountId: string): Promise<TransactionEntity[]>;
  createConnectToken(companyId: string): Promise<{ connectUrl: string; token: string }>;
  createPixImmediateCharge(companyId: string, amount: number): Promise<PixPaymentInfo>;
}

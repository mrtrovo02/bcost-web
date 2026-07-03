/**
 * infrastructure/repositories/axios-open-finance.repository.ts
 * Repositório Open Finance usando o cliente api do projeto.
 */
import { api } from '@/services/api';
import { OpenFinanceRepository, PixPaymentInfo } from '@/domain/open-finance/open-finance.repository';
import { BankAccountEntity, BankAccountProps } from '@/domain/open-finance/bank-account.entity';
import { TransactionEntity } from '@/domain/open-finance/transaction.entity';

interface ApiBankAccountSchema {
  id: string;
  display_name?: string;
  name?: string;
  provider_name?: string;
  bankName?: string;
  account_type?: 'CHECKING' | 'SAVINGS' | 'BUSINESS';
  type?: 'CHECKING' | 'SAVINGS' | 'BUSINESS';
  current_balance?: number;
  balance?: number;
  currency_code?: string;
  currency?: string;
  provider_logo?: string;
  logoUrl?: string;
  updated_at?: string;
  lastSyncedAt?: string;
}

interface ApiTransactionSchema {
  id: string;
  account_id?: string;
  accountId?: string;
  amount_value?: number;
  amount?: number;
  direction?: 'CREDIT' | 'DEBIT';
  type?: 'CREDIT' | 'DEBIT';
  description_raw?: string;
  description?: string;
  category_normalized?: string;
  category?: string;
  booking_date?: string;
  date?: string;
}

export class AxiosOpenFinanceRepository implements OpenFinanceRepository {
  public async getAccounts(companyId: string): Promise<BankAccountEntity[]> {
    const response = await api.get<ApiBankAccountSchema[] | { items?: ApiBankAccountSchema[]; accounts?: ApiBankAccountSchema[] }>(
      `/open-finance/accounts?company_id=${encodeURIComponent(companyId)}`,
    );
    const raw = response.data;
    const list: ApiBankAccountSchema[] = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as any)?.items)
        ? (raw as any).items
        : Array.isArray((raw as any)?.accounts)
          ? (raw as any).accounts
          : [];

    return list.map(
      (item) =>
        new BankAccountEntity({
          id: item.id,
          name: item.display_name ?? item.name ?? '',
          bankName: item.provider_name ?? item.bankName ?? '',
          type: item.account_type ?? item.type ?? 'CHECKING',
          balance: item.current_balance ?? item.balance ?? 0,
          currency: item.currency_code ?? item.currency ?? 'BRL',
          logoUrl: item.provider_logo ?? item.logoUrl,
          lastSyncedAt: item.updated_at ?? item.lastSyncedAt ?? new Date().toISOString(),
        } satisfies BankAccountProps),
    );
  }

  public async getTransactions(accountId: string): Promise<TransactionEntity[]> {
    const response = await api.get<ApiTransactionSchema[] | { items?: ApiTransactionSchema[] }>(
      `/open-finance/accounts/${encodeURIComponent(accountId)}/transactions`,
    );
    const raw = response.data;
    const list: ApiTransactionSchema[] = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as any)?.items)
        ? (raw as any).items
        : [];

    return list.map(
      (item) =>
        new TransactionEntity({
          id: item.id,
          accountId: item.account_id ?? item.accountId ?? '',
          amount: item.amount_value ?? item.amount ?? 0,
          type: item.direction ?? item.type ?? 'CREDIT',
          description: item.description_raw ?? item.description ?? '',
          category: item.category_normalized ?? item.category ?? '',
          date: item.booking_date ?? item.date ?? '',
        }),
    );
  }

  public async createConnectToken(
    companyId: string,
  ): Promise<{ connectUrl: string; token: string }> {
    const response = await api.post<{ connectUrl: string; token: string }>(
      '/open-finance/connect',
      { companyId },
    );
    return response.data;
  }

  public async createPixImmediateCharge(
    companyId: string,
    amount: number,
  ): Promise<PixPaymentInfo> {
    const response = await api.post<PixPaymentInfo>('/payments/pix/charge', {
      companyId,
      amount,
    });
    return response.data;
  }
}

import { OpenFinanceRepository, PixPaymentInfo } from "@/domain/open-finance/open-finance.repository";
import { BankAccountEntity } from "@/domain/open-finance/bank-account.entity";
import { TransactionEntity } from "@/domain/open-finance/transaction.entity";
import { apiGet, apiPost } from "@/services/api";

interface ApiBankAccountSchema {
  id: string;
  display_name: string;
  provider_name: string;
  account_type: "CHECKING" | "SAVINGS" | "BUSINESS";
  current_balance: number;
  currency_code: string;
  provider_logo?: string;
  updated_at: string;
}

interface ApiTransactionSchema {
  id: string;
  account_id: string;
  amount_value: number;
  direction: "CREDIT" | "DEBIT";
  description_raw: string;
  category_normalized: string;
  booking_date: string;
}

export class AxiosOpenFinanceRepository implements OpenFinanceRepository {
  
  public async getAccounts(companyId: string): Promise<BankAccountEntity[]> {
    const { data: rawData } = await apiGet<ApiBankAccountSchema[]>(
      `/open-finance/accounts?company_id=${encodeURIComponent(companyId)}`
    );

    return rawData.map(raw => new BankAccountEntity({
      id: raw.id,
      name: raw.display_name,
      bankName: raw.provider_name,
      type: raw.account_type,
      balance: raw.current_balance,
      currency: raw.currency_code,
      logoUrl: raw.provider_logo,
      lastSyncedAt: raw.updated_at
    }));
  }

  public async getTransactions(accountId: string): Promise<TransactionEntity[]> {
    const { data: rawData } = await apiGet<ApiTransactionSchema[]>(
      `/open-finance/accounts/${encodeURIComponent(accountId)}/transactions`
    );

    return rawData.map(raw => new TransactionEntity({
      id: raw.id,
      accountId: raw.account_id,
      amount: raw.amount_value,
      type: raw.direction,
      description: raw.description_raw,
      category: raw.category_normalized,
      date: raw.booking_date
    }));
  }

  public async createConnectToken(companyId: string): Promise<{ connectUrl: string; token: string }> {
    const { data } = await apiPost<{ connectUrl: string; token: string }>(
      "/open-finance/connect",
      { companyId }
    );
    return data;
  }

  public async createPixImmediateCharge(companyId: string, amount: number): Promise<PixPaymentInfo> {
    const { data } = await apiPost<PixPaymentInfo>(
      "/payments/pix/charge",
      { companyId, amount }
    );
    return data;
  }
}

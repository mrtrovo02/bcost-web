export interface BankAccountProps {
  id: string;
  name: string;
  bankName: string;
  type: 'CHECKING' | 'SAVINGS' | 'BUSINESS';
  balance: number;
  currency: string;
  logoUrl?: string;
  lastSyncedAt: string;
}

export class BankAccountEntity {
  private readonly props: BankAccountProps;

  constructor(props: BankAccountProps) {
    this.props = { ...props };
  }

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get bankName(): string { return this.props.bankName; }
  get type(): string { return this.props.type; }
  get balance(): number { return this.props.balance; }
  get currency(): string { return this.props.currency; }
  get logoUrl(): string | undefined { return this.props.logoUrl; }
  get lastSyncedAt(): string { return this.props.lastSyncedAt; }

  public toJSON(): BankAccountProps {
    return { ...this.props };
  }
}

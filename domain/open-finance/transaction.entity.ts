export interface TransactionProps {
  id: string;
  accountId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  category: string;
  date: string;
}

export class TransactionEntity {
  private readonly props: TransactionProps;

  constructor(props: TransactionProps) {
    this.props = { ...props };
  }

  get id(): string { return this.props.id; }
  get accountId(): string { return this.props.accountId; }
  get amount(): number { return this.props.amount; }
  get type(): 'CREDIT' | 'DEBIT' { return this.props.type; }
  get description(): string { return this.props.description; }
  get category(): string { return this.props.category; }
  get date(): string { return this.props.date; }

  public toJSON(): TransactionProps {
    return { ...this.props };
  }
}

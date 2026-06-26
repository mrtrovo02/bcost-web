export interface TaxDataProps {
  totalRevenue: number;
  estimatedTax: number;
  netRevenue: number;
  fatorR: string;
  totalInvoices: number;
  taxEfficiency?: string;
  suggestion?: string;
}

export class TaxDataEntity {
  private readonly props: TaxDataProps;

  constructor(props: TaxDataProps) {
    this.props = { ...props };
    this.validate();
  }

  private validate(): void {
    if (this.props.totalRevenue < 0) {
      throw new Error('Receita total não pode ser negativa.');
    }
  }

  get totalRevenue(): number { return this.props.totalRevenue; }
  get estimatedTax(): number { return this.props.estimatedTax; }
  get netRevenue(): number { return this.props.netRevenue; }
  get fatorR(): string { return this.props.fatorR; }
  get totalInvoices(): number { return this.props.totalInvoices; }
  get taxEfficiency(): string | undefined { return this.props.taxEfficiency; }
  get suggestion(): string | undefined { return this.props.suggestion; }

  public toJSON(): TaxDataProps {
    return { ...this.props };
  }
}

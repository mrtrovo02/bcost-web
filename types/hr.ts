export interface PayrollRecord {
  id: string | number;
  employeeName?: string;
  role?: string;
  department?: string;
  netPay?: number;
  amount?: number;
  status?: 'Paid' | 'Pending' | 'Processing' | 'Failed' | string;
  date?: string;
  [key: string]: unknown;
}

export interface PayrollRecord {
  id: string | number;
  employeeName?: string;
  amount?: number;
  status?: 'Paid' | 'Pending' | 'Processing' | 'Failed' | string;
  date?: string;
  [key: string]: any; 
}

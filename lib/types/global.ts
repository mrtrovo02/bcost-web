/**
 * bCost Enterprise - Global Type Definitions
 * Sincronizado com OAS 3.0
 */

export enum TransactionStatus {
  PENDING = 'PENDING',
  RECONCILED = 'RECONCILED',
  ERROR = 'ERROR',
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  status: TransactionStatus;
  category?: string;
  evidenceUrl?: string; // Link para o PDF/Doc de comprovação
}

export interface RevenueStats {
  totalRevenue: number;
  projectedRevenue: number;
  growthRate: number;
  activeContracts: number;
}

export interface AutomationJob {
  id: string;
  name: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'QUEUED';
  progress: number;
  lastRun: string;
}

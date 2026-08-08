'use strict';

import { api } from '@/services/api';

export type ManagementCockpitKpis = {
  revenueYtd: number;
  expensesYtd: number;
  netIncome: number;
  grossMargin: number;
  cashInYtd: number;
  cashOutYtd: number;
  netCashYtd: number;
  reconciliationRate: number;
  openFiscalObligations: number;
  criticalIssues: number;
};

export type ManagementCockpitMonthly = {
  month: number;
  revenue: number;
  cashIn: number;
  cashOut: number;
  netCash: number;
};

export type ManagementCockpitBudget = {
  label: string;
  planned: number;
  actual: number;
  variance: number;
  achievement: number;
};

export type ManagementCockpitCostCenter = {
  name: string;
  actual: number;
  planned: number;
  variance: number;
  usagePercent: number;
};

export type ManagementCockpitResponse = {
  company: { id: string; name: string };
  period: { year: number; month: number; generatedAt: string };
  kpis: ManagementCockpitKpis;
  dre: {
    revenue: number;
    taxes: number;
    operatingExpenses: number;
    ebitda: number;
    netIncome: number;
  };
  cashFlow: {
    monthly: ManagementCockpitMonthly[];
    projectedClosingCash: number;
  };
  balance: {
    assets: number;
    liabilities: number;
    equity: number;
    snapshots: Array<{
      month: number;
      revenue: number;
      expenses: number;
      taxPayable: number;
      netProfit: number;
    }>;
  };
  reconciliation: {
    invoices: { total: number; reconciled: number; pending: number };
    bankTransactions: { total: number; reconciled: number; pending: number };
  };
  costCenters: ManagementCockpitCostCenter[];
  budgetVsActual: {
    revenue: ManagementCockpitBudget;
    expenses: ManagementCockpitBudget;
    netCash: ManagementCockpitBudget;
  };
  automation: {
    running: number;
    failed: number;
    recent: Array<{ id: string; status: string; name: string; updatedAt: string }>;
  };
  compliance: Array<{
    id: string;
    severity: string;
    checkName: string;
    description: string | null;
  }>;
  assumptions: string[];
};

export async function getManagementCockpit(): Promise<ManagementCockpitResponse> {
  const response = await api.get<ManagementCockpitResponse>('/dashboard/management-cockpit');
  return response.data;
}

export function getDemoManagementCockpit(companyName = 'Empresa Demo'): ManagementCockpitResponse {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const monthly = Array.from({ length: month }, (_, index) => {
    const m = index + 1;
    const revenue = 128000 + m * 7200;
    const cashOut = 76000 + m * 3900;
    const cashIn = revenue * 0.93;

    return {
      month: m,
      revenue,
      cashIn,
      cashOut,
      netCash: cashIn - cashOut,
    };
  });

  const revenueYtd = monthly.reduce((sum, item) => sum + item.revenue, 0);
  const cashInYtd = monthly.reduce((sum, item) => sum + item.cashIn, 0);
  const cashOutYtd = monthly.reduce((sum, item) => sum + item.cashOut, 0);
  const expensesYtd = cashOutYtd * 0.88;
  const taxes = revenueYtd * 0.072;
  const netIncome = revenueYtd - expensesYtd - taxes;

  return {
    company: { id: 'demo-001', name: companyName },
    period: { year, month, generatedAt: new Date().toISOString() },
    kpis: {
      revenueYtd,
      expensesYtd,
      netIncome,
      grossMargin: ((revenueYtd - expensesYtd) / revenueYtd) * 100,
      cashInYtd,
      cashOutYtd,
      netCashYtd: cashInYtd - cashOutYtd,
      reconciliationRate: 91.8,
      openFiscalObligations: 3,
      criticalIssues: 1,
    },
    dre: {
      revenue: revenueYtd,
      taxes,
      operatingExpenses: expensesYtd,
      ebitda: revenueYtd - expensesYtd,
      netIncome,
    },
    cashFlow: { monthly, projectedClosingCash: cashInYtd - cashOutYtd },
    balance: {
      assets: cashInYtd + revenueYtd * 0.18,
      liabilities: cashOutYtd * 0.42,
      equity: netIncome + 310000,
      snapshots: monthly.map((item) => ({
        month: item.month,
        revenue: item.revenue,
        expenses: item.cashOut,
        taxPayable: item.revenue * 0.072,
        netProfit: item.revenue - item.cashOut - item.revenue * 0.072,
      })),
    },
    reconciliation: {
      invoices: { total: 128, reconciled: 119, pending: 9 },
      bankTransactions: { total: 214, reconciled: 195, pending: 19 },
    },
    costCenters: [
      { name: 'Operações', actual: 286000, planned: 300000, variance: -14000, usagePercent: 95.3 },
      { name: 'Comercial', actual: 174000, planned: 160000, variance: 14000, usagePercent: 108.8 },
      { name: 'Tecnologia', actual: 151000, planned: 155000, variance: -4000, usagePercent: 97.4 },
      {
        name: 'Administrativo',
        actual: 92000,
        planned: 98000,
        variance: -6000,
        usagePercent: 93.9,
      },
    ],
    budgetVsActual: {
      revenue: {
        label: 'Receita',
        planned: 165000,
        actual: monthly.at(-1)?.revenue ?? 0,
        variance: 6200,
        achievement: 103.8,
      },
      expenses: {
        label: 'Despesas',
        planned: 105000,
        actual: monthly.at(-1)?.cashOut ?? 0,
        variance: -900,
        achievement: 99.1,
      },
      netCash: {
        label: 'Caixa líquido',
        planned: 38000,
        actual: monthly.at(-1)?.netCash ?? 0,
        variance: 4100,
        achievement: 110.8,
      },
    },
    automation: { running: 4, failed: 1, recent: [] },
    compliance: [
      {
        id: 'demo-risk-1',
        severity: 'CRITICAL',
        checkName: 'Conciliação pendente',
        description: 'Notas relevantes ainda sem cruzamento bancário no período.',
      },
    ],
    assumptions: ['Dados demonstrativos usados quando a API real não está disponível.'],
  };
}

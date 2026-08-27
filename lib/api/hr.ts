/**
 * Domain Wrapper: RH (Human Resources)
 * Este arquivo atua como a camada de abstração entre a UI e a implementação do serviço.
 * Segue os princípios de arquitetura limpa (Clean Architecture).
 */

import { payrollEnterpriseApi } from './payroll-enterprise';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';
import type { PayrollRecord } from '@/types/hr';

export type EmployeeMetrics = {
  employees: {
    total: number;
    active: number;
    inactive: number;
    totalBaseSalary: number;
    averageBaseSalary: number;
    byRegime: Record<string, number>;
  };
  payroll: {
    payrolls: number;
    salariesAmount: number;
    proLaboreAmount: number;
    totalAmount: number;
    employerCost: number;
    netSalary: number;
  };
  generatedAt: string;
};

const resolveCompanyId = async (): Promise<string | null> => {
  try {
    const activeCompanyId = await resolveEnterpriseCompanyIdWithFallback();
    return activeCompanyId && activeCompanyId !== 'ID_DA_EMPRESA' ? activeCompanyId : null;
  } catch {
    console.error('⚠️ [bCost HR API]: companyId ausente ou inválido.');
    return null;
  }
};

export const hrApi = {
  /**
   * Busca registros de folha de pagamento com tratamento de exceções robusto.
   * Garante que o retorno seja sempre um array, evitando crashes na UI.
   */
  getPayroll: async (): Promise<PayrollRecord[]> => {
    try {
      const companyId = await resolveCompanyId();
      if (!companyId) return [];

      const response = await payrollEnterpriseApi.listPayrolls(companyId);
      const items = Array.isArray(response?.items) ? response.items : [];

      return items as PayrollRecord[];
    } catch (error) {
      console.error('🔴 [bCost HR API Error]: Falha ao recuperar folha de pagamento', error);
      return [];
    }
  },

  getEmployeeMetrics: async (): Promise<EmployeeMetrics | null> => {
    try {
      const companyId = await resolveCompanyId();
      if (!companyId) return null;

      const summary = await payrollEnterpriseApi.summary(companyId);

      return {
        employees: {
          total: summary.employees.count,
          active: summary.employees.active,
          inactive: summary.employees.inactive,
          totalBaseSalary: summary.employees.totalBaseSalary,
          averageBaseSalary: summary.employees.averageBaseSalary,
          byRegime: summary.employees.byRegime,
        },
        payroll: {
          payrolls: summary.payrolls.count,
          salariesAmount: summary.payrolls.salariesAmount,
          proLaboreAmount: summary.payrolls.proLaboreAmount,
          totalAmount: summary.payrolls.totalAmount,
          employerCost: summary.entries.employerCost,
          netSalary: summary.entries.netSalary,
        },
        generatedAt: summary.generatedAt,
      };
    } catch (error) {
      console.error('🔴 [bCost HR API Error]: Falha ao recuperar métricas de RH', error);
      return null;
    }
  },
};

// Re-exportação dos tipos para garantir consistência em toda a aplicação
export type { PayrollRecord };

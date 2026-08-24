/**
 * Domain Wrapper: RH (Human Resources)
 * Este arquivo atua como a camada de abstração entre a UI e a implementação do serviço.
 * Segue os princípios de arquitetura limpa (Clean Architecture).
 */

import { payrollEnterpriseApi } from './payroll-enterprise';
import { getActiveCompanyId, getToken, resolveRequestCompanyId } from '@/services/api';
import type { PayrollRecord } from '@/types/hr';

const resolveCompanyId = (): string | null => {
  const activeCompanyId = resolveRequestCompanyId(getToken(), getActiveCompanyId());

  if (!activeCompanyId || activeCompanyId === 'ID_DA_EMPRESA') {
    console.error('⚠️ [bCost HR API]: companyId ausente ou inválido.');
    return null;
  }

  return activeCompanyId;
};

export const hrApi = {
  /**
   * Busca registros de folha de pagamento com tratamento de exceções robusto.
   * Garante que o retorno seja sempre um array, evitando crashes na UI.
   */
  getPayroll: async (): Promise<PayrollRecord[]> => {
    try {
      const companyId = resolveCompanyId();
      if (!companyId) return [];

      const response = await payrollEnterpriseApi.listPayrolls(companyId);
      const items = Array.isArray(response?.items) ? response.items : [];

      return items as PayrollRecord[];
    } catch (error) {
      console.error('🔴 [bCost HR API Error]: Falha ao recuperar folha de pagamento', error);
      return [];
    }
  },

  /**
   * Placeholder para futuras integrações de RH (ex: gestão de benefícios, férias)
   * Atualmente não há implementação correspondente no payrollEnterpriseApi.
   */
  getEmployeeMetrics: async (): Promise<Record<string, unknown> | null> => {
    console.warn('⚠️ [bCost HR API]: getEmployeeMetrics não implementado na API de payroll enterprise.');
    return null;
  },
};

// Re-exportação dos tipos para garantir consistência em toda a aplicação
export type { PayrollRecord };

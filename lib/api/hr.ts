/**
 * Domain Wrapper: RH (Human Resources)
 * Este arquivo atua como a camada de abstração entre a UI e a implementação do serviço.
 * Segue os princípios de arquitetura limpa (Clean Architecture).
 */

import { payrollEnterpriseApi } from './payroll-enterprise';
import type { PayrollRecord } from '@/types/hr';

export const hrApi = {
  /**
   * Busca registros de folha de pagamento com tratamento de exceções robusto.
   * Garante que o retorno seja sempre um array, evitando crashes na UI.
   */
  getPayroll: async (): Promise<PayrollRecord[]> => {
    try {
      // Acessando o método através do objeto importado
      const data = await payrollEnterpriseApi.getPayroll();
      
      // Validação de integridade de dados (Sanitização em nível de API)
      if (!data) return [];
      
      // Garante que o retorno será um array e força a tipagem para o compilador
      return (Array.isArray(data) ? data : [data]) as PayrollRecord[];
      
    } catch (error) {
      console.error('🔴 [bCost HR API Error]: Falha ao recuperar folha de pagamento', error);
      // Retorno de segurança estrito
      return [];
    }
  },

  /**
   * Placeholder para futuras integrações de RH (ex: gestão de benefícios, férias)
   */
  getEmployeeMetrics: async (): Promise<any | null> => {
    try {
      return await payrollEnterpriseApi.getEmployeeMetrics();
    } catch (error) {
      console.error('🔴 [bCost HR Metrics Error]:', error);
      return null;
    }
  }
};

// Re-exportação dos tipos para garantir consistência em toda a aplicação
export type { PayrollRecord };

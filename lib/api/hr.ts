/**
 * Domain Wrapper: RH (Human Resources)
 * Este arquivo atua como a camada de abstração entre a UI e a implementação do serviço.
 * Segue os princípios de arquitetura limpa (Clean Architecture).
 */

import * as payrollService from './payroll-enterprise';

export const hrApi = {
  /**
   * Busca registros de folha de pagamento com tratamento de exceções robusto.
   * Garante que o retorno seja sempre um array, evitando crashes na UI.
   */
  getPayroll: async () => {
    try {
      const data = await payrollService.getPayroll();
      
      // Validação de integridade de dados (Sanitização em nível de API)
      if (!data) return [];
      return Array.isArray(data) ? data : [data];
      
    } catch (error) {
      console.error('🔴 [bCost HR API Error]: Falha ao recuperar folha de pagamento', error);
      // Retorno de segurança para evitar que o dashboard quebre
      return [];
    }
  },

  /**
   * Placeholder para futuras integrações de RH (ex: gestão de benefícios, férias)
   * Centralizar aqui evita refatorações massivas no futuro.
   */
  getEmployeeMetrics: async () => {
    try {
      return await payrollService.getEmployeeMetrics();
    } catch (error) {
      console.error('🔴 [bCost HR Metrics Error]:', error);
      return null;
    }
  }
};

// Re-exportação dos tipos para garantir consistência em toda a aplicação
export type { PayrollRecord } from '../types/hr';
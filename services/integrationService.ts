import { api } from './api';

/**
 * Service focado em compatibilidade com Players do mercado
 * bCost Engine 1.0 - Enterprise Edition
 */
export const integrationService = {
  // Exporta dados em formato compatível com ERPs contábeis de mercado.
  exportToLegacy: async (companyId: string, format: 'DOMINIO' | 'QUESTOR' | 'ALTERDATA') => {
    try {
      const response = await api.get(`/fiscal/export/${companyId}?format=${format}`, {
        responseType: 'blob', // Para download de arquivo
      });
      return response.data;
    } catch (error) {
      console.error(`🔴 [Integration Error]: Falha ao exportar para ${format}`, error);
      throw error;
    }
  },

  // Sincroniza o Fator R calculado com a Folha do ERP externo
  syncPayrollData: async (companyId: string, externalData: unknown) => {
    return await api.post(`/fiscal/payroll/sync/${companyId}`, externalData);
  },
};

'use strict';

import { create } from 'zustand';
import { FiscalDashboardStats, MonthlyPerformance, PayrollDiagnostic } from '../types/fiscal';

/**
 * Interface FiscalIntelligence
 * Alinhada 100% com os retornos da fiscalApi para eliminar erros TS2739/2741.
 */
interface FiscalIntelligence {
  /** KPIs de saúde e faturamento (getDashboard) */
  health: FiscalDashboardStats;

  /** Dados para gráficos de performance (getPerformance) */
  optimization: MonthlyPerformance[];

  /** Diagnóstico técnico de Fator R (getPayrollDiagnostics) */
  performance: PayrollDiagnostic;

  /** Controle de integridade da auditoria local */
  integrity: {
    status: 'VALID' | 'WARNING' | 'AUDIT_REQUIRED';
    lastAudit: string;
  };
}

interface FiscalState {
  intelligence: FiscalIntelligence | null;
  loading: boolean;
  error: string | null;

  // Actions
  setIntelligence: (data: FiscalIntelligence) => void;
  setLoading: (status: boolean) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

/**
 * useFiscalStore
 * Gerenciador de estado para o motor bCost Intelligence.
 */
export const useFiscalStore = create<FiscalState>((set) => ({
  intelligence: null,
  loading: false,
  error: null,

  /**
   * Define os dados da inteligência com tipagem forte.
   * Ao receber o objeto completo, o TypeScript valida se health,
   * optimization e performance seguem os DTOs do backend.
   */
  setIntelligence: (data: FiscalIntelligence) =>
    set({ intelligence: data, error: null, loading: false }),

  /** Controla o estado de sincronização visual (spinners) */
  setLoading: (status: boolean) => set({ loading: status }),

  /** Captura erros de API para exibição em Toasts ou Banners */
  setError: (message: string | null) => set({ error: message, loading: false }),

  /** Limpa o motor de inteligência (útil ao trocar de empresa) */
  reset: () => set({ intelligence: null, loading: false, error: null }),
}));

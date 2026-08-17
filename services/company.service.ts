'use strict';

import { api } from './api';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

/**
 * Interface Enterprise: Reflete o Schema do bCost Engine.
 * Essencial para o TypeScript não "reclamar" no Sidebar.
 */
export interface Company {
  id: string;
  name: string;
  cnpj: string;
  taxRegime?: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  role: 'OWNER' | 'ACCOUNTANT' | 'VIEWER';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  createdAt: string;
}

export interface CreateCompanyInput {
  name: string;
  cnpj: string;
  taxRegime?: Company['taxRegime'];
}

/**
 * CompanyService: O coração da multi-tenancy no bCost Web.
 * Gerencia a troca de contexto entre diferentes CNPJs.
 */
export const companyService = {
  /**
   * 📡 Sincroniza todas as unidades vinculadas ao usuário.
   * Alinhado com o bCost Engine v1.
   */
  async getAll(): Promise<Company[]> {
    try {
      // Como o BASE_URL no api.ts já termina em /v1, chamamos apenas /company
      const { data } = await api.get<Company[]>('/company');

      const payload = data as unknown;
      if (Array.isArray(payload)) return payload;
      if (isRecord(payload) && Array.isArray(payload.data)) {
        return payload.data as Company[];
      }
      return [];
    } catch (error) {
      console.error('🔴 [bCost Service]: Falha na sincronização de unidades.', error);
      throw error; // Repassa para o Sidebar tratar o erro no UI
    }
  },

  /**
   * 🔍 Busca detalhes de uma unidade específica para o Dashboard.
   */
  async getById(id: string): Promise<Company> {
    const { data } = await api.get<Company>(`/company/${id}`);
    return data;
  },

  /**
   * 🏗️ Onboarding: Cria uma nova unidade/empresa no ecossistema.
   */
  async create(companyData: CreateCompanyInput): Promise<Company> {
    const { data } = await api.post<Company>('/company', companyData);
    return data;
  },

  /**
   * 🔄 Switch Context: Define qual empresa o usuário está "olhando" agora.
   * Salva no LocalStorage para que o interceptor do api.ts envie o x-company-id correto.
   */
  setActiveCompany(companyId: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bcost_active_company', companyId);
      // Opcional: Recarregar a página ou notificar o estado global (Zustand/Redux)
    }
  },

  /**
   * 🛡️ Get Active Context: Recupera o ID da empresa atual.
   */
  getActiveCompanyId(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bcost_active_company');
    }
    return null;
  },
};

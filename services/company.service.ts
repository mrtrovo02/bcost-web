'use strict';

import { api, getActiveCompanyId, setActiveCompanyId, isDemoSession } from './api';
import { DEMO_COMPANIES } from './demo-data';
import { assertOperationalDemoFallbackEnabled } from '@/lib/config/demo-policy';

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

export interface UpdateCompanyInput {
  name?: string;
  taxRegime?: Company['taxRegime'];
  cnae?: string;
  anexo?: number;
}

function assertDemoCompanySessionEnabled(): void {
  assertOperationalDemoFallbackEnabled(
    'Empresas demonstrativas indisponíveis neste ambiente. Entre com uma conta real para acessar CNPJs de produção.',
  );
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
    if (isDemoSession()) {
      assertDemoCompanySessionEnabled();
      return DEMO_COMPANIES as Company[];
    }

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
    if (isDemoSession()) {
      assertDemoCompanySessionEnabled();
      const company = DEMO_COMPANIES.find((item) => item.id === id) ?? DEMO_COMPANIES[0];
      return company as Company;
    }

    const { data } = await api.get<Company>(`/company/${id}`);
    return data;
  },

  /**
   * 🏗️ Onboarding: Cria uma nova unidade/empresa no ecossistema.
   */
  async create(companyData: CreateCompanyInput): Promise<Company> {
    if (isDemoSession()) {
      assertDemoCompanySessionEnabled();
      return {
        id: `demo-company-${Date.now()}`,
        cnpj: companyData.cnpj,
        name: companyData.name,
        taxRegime: companyData.taxRegime,
        role: 'OWNER',
        status: 'ACTIVE',
        plan: 'ENTERPRISE',
        createdAt: new Date().toISOString(),
      };
    }

    const { data } = await api.post<Company>('/company', companyData);
    return data;
  },

  async update(companyId: string, companyData: UpdateCompanyInput): Promise<Company> {
    if (isDemoSession()) {
      assertDemoCompanySessionEnabled();
      const company = DEMO_COMPANIES.find((item) => item.id === companyId) ?? DEMO_COMPANIES[0];
      return { ...(company as Company), ...companyData };
    }

    const { data } = await api.patch<Company>(`/company/${companyId}`, companyData);
    return data;
  },

  async remove(companyId: string): Promise<void> {
    if (isDemoSession()) {
      assertDemoCompanySessionEnabled();
      return;
    }

    await api.delete(`/company/${companyId}`);
  },

  /**
   * 🔄 Switch Context: Define qual empresa o usuário está "olhando" agora.
   * Salva no LocalStorage para que o interceptor do api.ts envie o x-company-id correto.
   */
  setActiveCompany(companyId: string): void {
    setActiveCompanyId(companyId);
  },

  /**
   * 🛡️ Get Active Context: Recupera o ID da empresa atual.
   */
  getActiveCompanyId(): string | null {
    return getActiveCompanyId();
  },
};

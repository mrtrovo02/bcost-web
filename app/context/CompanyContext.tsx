'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { api } from '@/services/api';
import {
  safeJsonParse,
  safeLocalStorageGet,
  safeLocalStorageSet,
} from '@/lib/utils/runtime-guards';
import { trackEvent } from '@/lib/utils/telemetry';

export interface Company {
  id: string;
  name: string;
  cnpj: string;
}

interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company) => void;
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 1. Hidratação de Estado:
   * Sincroniza o contexto com o LocalStorage no boot da aplicação.
   * Suporta modo demo com fallback automático.
   */
  useEffect(() => {
    const hydrate = () => {
      try {
        const saved = safeLocalStorageGet('bcost_active_company_data');
        const savedId = safeLocalStorageGet('bcost_active_company');
        const storedCompanies = safeJsonParse<Company[]>(safeLocalStorageGet('bcost_companies'), []);
        const isDemo = safeLocalStorageGet('bcost_token') === 'demo-token-local';

        if (saved) {
          const parsedCompany = safeJsonParse<Company | null>(saved, null);
          if (parsedCompany?.id) {
            setSelectedCompany(parsedCompany);
            api.defaults.headers.common['x-company-id'] = parsedCompany.id;
            trackEvent('company_context_restored', { companyId: parsedCompany.id });
          }
          return;
        }

        if (savedId && Array.isArray(storedCompanies) && storedCompanies.length > 0) {
          const restored =
            storedCompanies.find((company: Company) => company.id === savedId) ||
            storedCompanies[0];
          setSelectedCompany(restored);
          safeLocalStorageSet('bcost_active_company_data', JSON.stringify(restored));
          if (restored.id) {
            api.defaults.headers.common['x-company-id'] = restored.id;
          }
          setIsLoading(false);
          return;
        }

        // Fallback para dados demo quando há token demo e empresas armazenadas
        if (!saved && isDemo) {
          if (Array.isArray(storedCompanies) && storedCompanies.length > 0) {
            const demoCompany = storedCompanies[0];
            safeLocalStorageSet('bcost_active_company_data', JSON.stringify(demoCompany));
            safeLocalStorageSet('bcost_active_company', demoCompany.id);
            setSelectedCompany(demoCompany);
            if (demoCompany.id) {
              api.defaults.headers.common['x-company-id'] = demoCompany.id;
              trackEvent('company_context_demo_fallback', { companyId: demoCompany.id });
            }
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('🔴 [bCost Context Hydration Fail]:', error);
      } finally {
        setIsLoading(false);
      }
    };

    hydrate();
  }, []);

  /**
   * 2. Persistência de Contexto:
   * Sempre que a empresa for trocada, atualizamos o LocalStorage e o Header Global.
   */
  const handleSetSelected = (company: Company) => {
    setSelectedCompany(company);

    // Persistimos o objeto completo para a UI e o ID para o Interceptor
    safeLocalStorageSet('bcost_active_company_data', JSON.stringify(company));
    safeLocalStorageSet('bcost_active_company', company.id);
    trackEvent('company_selected', { companyId: company.id });

    // Injeção em tempo real na instância do Axios
    api.defaults.headers.common['x-company-id'] = company.id;
  };

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
        setSelectedCompany: handleSetSelected,
        companies,
        setCompanies,
        isLoading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany deve ser usado dentro de um CompanyProvider');
  }
  return context;
};

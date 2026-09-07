'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  api,
  clearActiveCompanyId,
  getActiveCompanyId,
  isDemoSession as detectDemoSession,
  setActiveCompanyId,
} from '@/services/api';
import {
  safeJsonParse,
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
} from '@/lib/utils/runtime-guards';
import { trackEvent } from '@/lib/utils/telemetry';
import { isDemoEntityId, isOperationalDemoFallbackEnabled } from '@/lib/config/demo-policy';
import { normalizeCompanyPayload } from '@/services/company-normalizer';

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  taxRegime?: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  cnae?: string | null;
  anexo?: number | null;
}

export interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company) => void;
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  isLoading: boolean;
  isDemoSession: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

type CompanyContextUpdateEvent = CustomEvent<{
  companyId?: string;
  companies?: Company[];
}>;

const COMPANY_CONTEXT_STORAGE_KEYS = [
  'bcost_active_company_data',
  'bcost_companies',
  'companies',
  'bcost_company_id',
  'bcost_active_company',
  'companyId',
  'activeCompanyId',
] as const;

function clearCompanyContextStorage(): void {
  COMPANY_CONTEXT_STORAGE_KEYS.forEach((key) => safeLocalStorageRemove(key));
  clearActiveCompanyId();
  delete api.defaults.headers.common['x-company-id'];
  delete api.defaults.headers.common['CompanyId'];
}

function removeDemoCompanies(companies: Company[]): Company[] {
  return companies.filter((company) => !isDemoEntityId(company.id));
}

function persistCompaniesForSession(companies: Company[], isDemo: boolean): Company[] {
  const normalizedCompanies = normalizeCompanyPayload(companies) as Company[];
  const sanitizedCompanies = isDemo ? normalizedCompanies : removeDemoCompanies(normalizedCompanies);

  if (!isDemo && sanitizedCompanies.length !== companies.length) {
    safeLocalStorageSet('bcost_companies', JSON.stringify(sanitizedCompanies));
    safeLocalStorageSet('companies', JSON.stringify(sanitizedCompanies));
  }

  return sanitizedCompanies;
}

function canUseCompanyInCurrentSession(company: Company, isDemo: boolean): boolean {
  return isDemo || !isDemoEntityId(company.id);
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoSession, setIsDemoSession] = useState<boolean>(false);

  /**
   * 1. Hidratação de Estado:
   * Sincroniza o contexto com o LocalStorage no boot da aplicação.
   * Suporta modo demo apenas quando a sessão é explicitamente demonstrativa.
   */
  useEffect(() => {
    const hydrate = () => {
      try {
        const saved = safeLocalStorageGet('bcost_active_company_data');
        const savedId = getActiveCompanyId();
        const rawStoredCompanies = normalizeCompanyPayload(
          safeJsonParse<unknown>(
            safeLocalStorageGet('bcost_companies'),
            [],
          ),
        ) as Company[];
        const isDemo = detectDemoSession();
        const storedCompanies = persistCompaniesForSession(rawStoredCompanies, isDemo);

        setIsDemoSession(isDemo);

        if (saved) {
          const parsedCompany = normalizeCompanyPayload(safeJsonParse<unknown>(saved, null))[0] as
            | Company
            | undefined;
          if (parsedCompany?.id) {
            if (!canUseCompanyInCurrentSession(parsedCompany, isDemo)) {
              clearCompanyContextStorage();
              setSelectedCompany(null);
              setCompanies([]);
              return;
            }

            if (isDemoEntityId(parsedCompany.id) && !isOperationalDemoFallbackEnabled()) {
              clearCompanyContextStorage();
              setSelectedCompany(null);
              setCompanies([]);
              setIsLoading(false);
              return;
            }

            setSelectedCompany(parsedCompany);
            setCompanies(storedCompanies);
            if (!isDemo) {
              safeLocalStorageSet('bcost_companies', JSON.stringify(storedCompanies));
              safeLocalStorageSet('companies', JSON.stringify(storedCompanies));
            }
            trackEvent('company_context_restored', { companyId: parsedCompany.id });
          }
          return;
        }

        if (savedId && Array.isArray(storedCompanies) && storedCompanies.length > 0) {
          const restored =
            storedCompanies.find((company: Company) => company.id === savedId) ||
            storedCompanies[0];

          if (isDemoEntityId(restored.id) && !isOperationalDemoFallbackEnabled()) {
            clearCompanyContextStorage();
            setSelectedCompany(null);
            setCompanies([]);
            setIsLoading(false);
            return;
          }

          setSelectedCompany(restored);
          setCompanies(storedCompanies);
          safeLocalStorageSet('bcost_active_company_data', JSON.stringify(restored));
          setIsLoading(false);
          return;
        }

        // Fallback para dados demo quando há token demo e empresas armazenadas
        if (!saved && isDemo && isOperationalDemoFallbackEnabled()) {
          if (Array.isArray(storedCompanies) && storedCompanies.length > 0) {
            const demoCompany = storedCompanies[0];
            safeLocalStorageSet('bcost_active_company_data', JSON.stringify(demoCompany));
            setActiveCompanyId(demoCompany.id);
            setSelectedCompany(demoCompany);
            if (demoCompany.id) {
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

    const handleCompanyContextUpdated = (event: Event) => {
      const { companyId, companies: eventCompanies = [] } =
        (event as CompanyContextUpdateEvent).detail ?? {};
      const storedCompanies = safeJsonParse<Company[]>(safeLocalStorageGet('bcost_companies'), []);
      const isDemo = detectDemoSession();
      const rawNextCompanies = eventCompanies.length > 0 ? eventCompanies : storedCompanies;
      const nextCompanies = persistCompaniesForSession(rawNextCompanies, isDemo);
      const nextCompany =
        nextCompanies.find((company) => company.id === companyId) ?? nextCompanies[0] ?? null;

      if (
        (nextCompany && !canUseCompanyInCurrentSession(nextCompany, isDemo)) ||
        (nextCompany?.id && isDemoEntityId(nextCompany.id) && !isOperationalDemoFallbackEnabled())
      ) {
        clearCompanyContextStorage();
        setCompanies([]);
        setSelectedCompany(null);
        setIsDemoSession(isDemo);
        return;
      }

      setCompanies(nextCompanies);
      setSelectedCompany(nextCompany);
      setIsDemoSession(isDemo);

      if (nextCompany?.id) {
        setActiveCompanyId(nextCompany.id);
        safeLocalStorageSet('bcost_active_company_data', JSON.stringify(nextCompany));
        trackEvent('company_context_updated', { companyId: nextCompany.id });
      }
    };

    window.addEventListener('bcost:company-context-updated', handleCompanyContextUpdated);

    return () => {
      window.removeEventListener('bcost:company-context-updated', handleCompanyContextUpdated);
    };
  }, []);

  /**
   * 2. Persistência de Contexto:
   * Sempre que a empresa for trocada, atualizamos o LocalStorage.
   */
  const handleSetCompanies = (nextCompanies: Company[]) => {
    const isDemo = detectDemoSession();
    const sanitizedCompanies = persistCompaniesForSession(nextCompanies, isDemo);

    if (!isDemo && sanitizedCompanies.length === 0 && nextCompanies.length > 0) {
      clearCompanyContextStorage();
      setSelectedCompany(null);
    }

    setCompanies(sanitizedCompanies);
  };

  const handleSetSelected = (company: Company) => {
    if (!canUseCompanyInCurrentSession(company, detectDemoSession())) {
      clearCompanyContextStorage();
      setSelectedCompany(null);
      setCompanies([]);
      return;
    }

    setSelectedCompany(company);

    // Persistimos o objeto completo para a UI e o ID para o Interceptor.
    safeLocalStorageSet('bcost_active_company_data', JSON.stringify(company));
    setActiveCompanyId(company.id);
    trackEvent('company_selected', { companyId: company.id });
  };

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
        setSelectedCompany: handleSetSelected,
        companies,
        setCompanies: handleSetCompanies,
        isLoading,
        isDemoSession,
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

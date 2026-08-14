'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Caminho relativo infalível para evitar erro de resolução do Turbopack
import { api } from '../../../services/api';
import { companyService } from '../../../services/company.service';
import { useCompany } from '@/app/context/CompanyContext';

/**
 * Interface de Contrato de Dados (Domain Model)
 * Garante que o frontend saiba exatamente o que esperar do NestJS
 */
interface Company {
  id: string;
  name: string;
  cnpj: string;
  status?: string;
}

export default function CompaniesPage() {
  const {
    companies,
    setCompanies,
    setSelectedCompany,
    isDemoSession,
    isLoading: isCompanyContextLoading,
  } = useCompany();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [newCompanyCnpj, setNewCompanyCnpj] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const router = useRouter();

  /**
   * Fetch de Dados Otimizado
   * Memoizamos a função para evitar recriações desnecessárias no ciclo do React
   */
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Recupera estado local de forma segura
      const savedActiveId =
        typeof window !== 'undefined' ? localStorage.getItem('bcost_active_company') : null;

      setActiveId(savedActiveId);

      if (isCompanyContextLoading) {
        return;
      }

      // Interrompe requisição à API se estiver em sessão de demonstração
      if (isDemoSession) {
        return;
      }

      // Chamada à API bCost Engine
      const { data } = await api.get<Company[]>('/company');
      setCompanies(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('🔴 [Companies Engine Error]:', message);
      // Aqui poderíamos disparar um Toast de erro global
    } finally {
      setIsLoading(false);
    }
  }, [isCompanyContextLoading, isDemoSession, setCompanies]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  /**
   * Persistência de Contexto e Redirecionamento
   * Define qual empresa o "Motor de Inteligência" deve processar
   */
  const handleSelectCompany = (id: string) => {
    if (typeof window !== 'undefined') {
      const selected = companies.find((item) => item.id === id);
      if (selected) {
        setSelectedCompany(selected);
        localStorage.setItem('bcost_active_company', id);
        setActiveId(id);
      }

      // Delay tático para feedback visual (UX) antes de mudar de rota
      setTimeout(() => {
        router.push('/dashboard/intelligence');
      }, 400);
    }
  };

  const handleCreateCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    if (!newCompanyName.trim() || !newCompanyCnpj.trim()) {
      setCreateError('Nome e CNPJ são obrigatórios para criar uma unidade.');
      return;
    }

    // Tratamento para criação local durante Demo Session
    if (isDemoSession) {
      const created: Company = {
        id: `demo-company-${Date.now()}`,
        name: newCompanyName.trim(),
        cnpj: newCompanyCnpj.trim(),
        status: 'active',
      };

      setCompanies([created, ...companies]);
      setSelectedCompany(created);
      setNewCompanyName('');
      setNewCompanyCnpj('');
      setActiveId(created.id);

      if (typeof window !== 'undefined') {
        localStorage.setItem('bcost_active_company', created.id);
        localStorage.setItem('bcost_active_company_data', JSON.stringify(created));
      }
      router.push('/dashboard/intelligence');
      return;
    }

    try {
      setIsCreating(true);
      const created = await companyService.create({
        name: newCompanyName.trim(),
        cnpj: newCompanyCnpj.trim(),
      });

      setCompanies([created, ...companies]);
      setSelectedCompany(created);
      setNewCompanyName('');
      setNewCompanyCnpj('');
      setActiveId(created.id);
      localStorage.setItem('bcost_active_company', created.id);
      localStorage.setItem('bcost_active_company_data', JSON.stringify(created));
      router.push('/dashboard/intelligence');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('🔴 [Companies Create Error]:', message);
      setCreateError('Falha ao cadastrar a nova unidade. Tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header de Seção */}
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-white italic tracking-tighter leading-none">
            Unidades<span className="text-blue-500">.</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">
            Seleção de Instância Corporativa
          </p>
        </div>
      </header>

      <section className="rounded-[2.5rem] border border-white/5 bg-slate-950/30 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-slate-400 text-sm">
              Cadastre uma nova unidade para começar a operar.
            </p>
          </div>
          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
            Novo registro
          </span>
        </div>

        <form
          className="mt-6 grid gap-4 md:grid-cols-[1.3fr_1fr_auto]"
          onSubmit={handleCreateCompany}
        >
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Nome da Unidade
            </label>
            <input
              value={newCompanyName}
              onChange={(event) => setNewCompanyName(event.target.value)}
              placeholder="Ex: bCost Tecnologia"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">CNPJ</label>
            <input
              value={newCompanyCnpj}
              onChange={(event) => setNewCompanyCnpj(event.target.value)}
              placeholder="00.000.000/0000-00"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-blue-500 px-6 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? 'Criando...' : 'Cadastrar'}
            </button>
          </div>
        </form>

        {createError && <p className="mt-3 text-sm text-red-400">{createError}</p>}
      </section>

      {/* Grid de Instâncias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading
          ? // Skeleton Loader com efeito Glassmorphism
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-56 bg-white/5 border border-white/5 rounded-[2.5rem] animate-pulse"
              />
            ))
          : companies.map((company) => {
              const isSelected = activeId === company.id;

              return (
                <div
                  key={company.id}
                  onClick={() => handleSelectCompany(company.id)}
                  className={`
                  relative group cursor-pointer p-8 rounded-[2.5rem] border transition-all duration-500
                  ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_20px_50px_-12px_rgba(37,99,235,0.3)]'
                      : 'bg-slate-900/40 border-white/5 hover:border-blue-500/20 hover:bg-slate-900/60'
                  }
                `}
                >
                  {/* Status Indicator */}
                  <div className="absolute top-8 right-8 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${isSelected ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-slate-800'}`}
                    />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      {isSelected ? 'Em Operação' : 'Standby'}
                    </span>
                  </div>

                  <div className="space-y-5">
                    <div
                      className={`
                    h-14 w-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-500
                    ${isSelected ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 group-hover:bg-white/10'}
                  `}
                    >
                      🏢
                    </div>

                    <div>
                      <h3 className="font-black text-white text-xl uppercase tracking-tighter leading-tight">
                        {company.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-blue-500/50 uppercase">
                          CNPJ
                        </span>
                        <p className="text-[11px] font-bold text-slate-500 tracking-wider">
                          {company.cnpj || '00.000.000/0000-00'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer do Card */}
                  <div
                    className={`mt-6 pt-6 border-t transition-colors ${isSelected ? 'border-blue-500/20' : 'border-white/5'}`}
                  >
                    <button
                      className={`
                    text-[10px] font-black uppercase tracking-widest transition-all
                    ${isSelected ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}
                  `}
                    >
                      {isSelected ? 'Visualizando Agora' : 'Acessar Unidade'}
                    </button>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

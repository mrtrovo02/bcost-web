'use client';

import { useState, useEffect, useCallback, FormEvent, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Save, Trash2, X } from 'lucide-react';
import { companyService } from '../../../services/company.service';
import { useCompany } from '@/app/context/CompanyContext';
import { formatCnpj, normalizeCnpj } from '@/lib/utils/cnpj';
import { getErrorMessage, isRecord } from '@/lib/utils/runtime-guards';

/**
 * Interface de Contrato de Dados (Domain Model)
 * Garante que o frontend saiba exatamente o que esperar do NestJS
 */
interface Company {
  id: string;
  name: string;
  cnpj: string;
  taxRegime?: TaxRegime;
  cnae?: string | null;
  anexo?: number | null;
  status?: string;
}

type TaxRegime = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
type CompanyEditForm = {
  name: string;
  taxRegime: TaxRegime;
  cnae: string;
  anexo: number;
};

const DEFAULT_TAX_REGIME: TaxRegime = 'SIMPLES_NACIONAL';

function resolveErrorMessage(error: unknown, fallback: string): string {
  const responseData = isRecord(error) && isRecord(error.response) ? error.response.data : undefined;
  return isRecord(responseData)
    ? getErrorMessage(responseData, fallback)
    : getErrorMessage(error, fallback);
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
  const [newCompanyTaxRegime, setNewCompanyTaxRegime] =
    useState<TaxRegime>(DEFAULT_TAX_REGIME);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CompanyEditForm>({
    name: '',
    taxRegime: DEFAULT_TAX_REGIME,
    cnae: '',
    anexo: 3,
  });
  const [busyCompanyId, setBusyCompanyId] = useState<string | null>(null);
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

      const data = await companyService.getAll();
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

    const normalizedCnpj = normalizeCnpj(newCompanyCnpj);

    if (normalizedCnpj.length !== 14) {
      setCreateError('Informe um CNPJ com 14 dígitos.');
      return;
    }

    // Tratamento para criação local durante Demo Session
    if (isDemoSession) {
      const created: Company = {
        id: `demo-company-${Date.now()}`,
        name: newCompanyName.trim(),
        cnpj: normalizedCnpj,
        taxRegime: newCompanyTaxRegime,
        status: 'active',
      };

      setCompanies([created, ...companies]);
      setSelectedCompany(created);
      setNewCompanyName('');
      setNewCompanyCnpj('');
      setNewCompanyTaxRegime(DEFAULT_TAX_REGIME);
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
        cnpj: normalizedCnpj,
        taxRegime: newCompanyTaxRegime,
      });

      setCompanies([created, ...companies]);
      setSelectedCompany(created);
      setNewCompanyName('');
      setNewCompanyCnpj('');
      setNewCompanyTaxRegime(DEFAULT_TAX_REGIME);
      setActiveId(created.id);
      localStorage.setItem('bcost_active_company', created.id);
      localStorage.setItem('bcost_active_company_data', JSON.stringify(created));
      router.push('/dashboard/intelligence');
    } catch (error: unknown) {
      const message = resolveErrorMessage(error, 'Falha ao cadastrar a nova unidade.');
      console.error('🔴 [Companies Create Error]:', message);
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (event: MouseEvent<HTMLButtonElement>, company: Company) => {
    event.stopPropagation();
    setActionError(null);
    setActionMessage(null);
    setEditingId(company.id);
    setEditForm({
      name: company.name,
      taxRegime: company.taxRegime ?? DEFAULT_TAX_REGIME,
      cnae: company.cnae ?? '',
      anexo: company.anexo ?? 3,
    });
  };

  const cancelEditing = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    setEditingId(null);
    setActionError(null);
  };

  const handleUpdateCompany = async (event: FormEvent<HTMLFormElement>, company: Company) => {
    event.preventDefault();
    event.stopPropagation();
    setActionError(null);
    setActionMessage(null);

    if (!editForm.name.trim()) {
      setActionError('Nome da unidade é obrigatório.');
      return;
    }

    const payload = {
      name: editForm.name.trim(),
      taxRegime: editForm.taxRegime,
      cnae: editForm.cnae.trim() || undefined,
      anexo: editForm.anexo,
    };

    try {
      setBusyCompanyId(company.id);

      const updated = isDemoSession
        ? { ...company, ...payload }
        : await companyService.update(company.id, payload);
      const nextCompanies = companies.map((item) => (item.id === company.id ? updated : item));

      setCompanies(nextCompanies);
      if (activeId === company.id) {
        setSelectedCompany(updated);
        localStorage.setItem('bcost_active_company_data', JSON.stringify(updated));
      }
      setEditingId(null);
      setActionMessage('Empresa atualizada com sucesso.');
    } catch (error: unknown) {
      const message = resolveErrorMessage(error, 'Falha ao atualizar a empresa.');
      console.error('🔴 [Companies Update Error]:', message);
      setActionError(message);
    } finally {
      setBusyCompanyId(null);
    }
  };

  const handleRemoveCompany = async (event: MouseEvent<HTMLButtonElement>, company: Company) => {
    event.stopPropagation();
    setActionError(null);
    setActionMessage(null);

    if (activeId === company.id) {
      setActionError('Selecione outra empresa antes de desativar a unidade em operação.');
      return;
    }

    const confirmed = window.confirm(`Desativar a empresa "${company.name}"?`);
    if (!confirmed) return;

    try {
      setBusyCompanyId(company.id);
      if (!isDemoSession) {
        await companyService.remove(company.id);
      }
      setCompanies(companies.filter((item) => item.id !== company.id));
      setActionMessage('Empresa desativada com sucesso.');
    } catch (error: unknown) {
      const message = resolveErrorMessage(error, 'Falha ao desativar a empresa.');
      console.error('🔴 [Companies Remove Error]:', message);
      setActionError(message);
    } finally {
      setBusyCompanyId(null);
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
          className="mt-6 grid gap-4 md:grid-cols-[1.3fr_1fr_1fr_auto]"
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
              onChange={(event) => setNewCompanyCnpj(formatCnpj(event.target.value))}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Regime tributário
            </label>
            <select
              value={newCompanyTaxRegime}
              onChange={(event) => setNewCompanyTaxRegime(event.target.value as TaxRegime)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="SIMPLES_NACIONAL">Simples Nacional</option>
              <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
              <option value="LUCRO_REAL">Lucro Real</option>
            </select>
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

      {(actionError || actionMessage) && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${
            actionError
              ? 'border-red-500/20 bg-red-500/10 text-red-300'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {actionError || actionMessage}
        </div>
      )}

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
                <article
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

                  {editingId === company.id ? (
                    <form
                      className="space-y-4"
                      onClick={(event) => event.stopPropagation()}
                      onSubmit={(event) => handleUpdateCompany(event, company)}
                    >
                      <div>
                        <label className="mb-2 block text-xs font-bold text-slate-400">
                          Nome da unidade
                        </label>
                        <input
                          value={editForm.name}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, name: event.target.value }))
                          }
                          className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-slate-400">
                            Regime
                          </label>
                          <select
                            value={editForm.taxRegime}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                taxRegime: event.target.value as TaxRegime,
                              }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="SIMPLES_NACIONAL">Simples</option>
                            <option value="LUCRO_PRESUMIDO">Presumido</option>
                            <option value="LUCRO_REAL">Real</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-slate-400">
                            Anexo
                          </label>
                          <select
                            value={editForm.anexo}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                anexo: Number(event.target.value),
                              }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          >
                            {[1, 2, 3, 4, 5].map((anexo) => (
                              <option key={anexo} value={anexo}>
                                {anexo}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-bold text-slate-400">CNAE</label>
                        <input
                          value={editForm.cnae}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, cnae: event.target.value }))
                          }
                          placeholder="Ex: 6201-5/01"
                          className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="flex gap-2 border-t border-white/5 pt-4">
                        <button
                          type="submit"
                          disabled={busyCompanyId === company.id}
                          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" />
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-3 text-slate-300 transition hover:bg-white/5"
                          aria-label="Cancelar edição"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
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
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase text-blue-500/50">
                              CNPJ
                            </span>
                            <p className="text-[11px] font-bold tracking-wider text-slate-500">
                              {company.cnpj ? formatCnpj(company.cnpj) : '00.000.000/0000-00'}
                            </p>
                          </div>
                          <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-600">
                            {company.taxRegime?.replaceAll('_', ' ') ?? 'SIMPLES NACIONAL'}
                            {company.cnae ? ` • CNAE ${company.cnae}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Footer do Card */}
                      <div
                        className={`mt-6 flex items-center justify-between gap-3 border-t pt-6 transition-colors ${isSelected ? 'border-blue-500/20' : 'border-white/5'}`}
                      >
                        <button
                          className={`
                        text-[10px] font-black uppercase tracking-widest transition-all
                        ${isSelected ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}
                      `}
                        >
                          {isSelected ? 'Visualizando Agora' : 'Acessar Unidade'}
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(event) => startEditing(event, company)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
                            aria-label="Editar empresa"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busyCompanyId === company.id}
                            onClick={(event) => handleRemoveCompany(event, company)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Desativar empresa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
      </div>
    </div>
  );
}

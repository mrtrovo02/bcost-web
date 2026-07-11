'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  PieChart,
  Settings,
  LogOut,
  PlusCircle,
  Building2,
  ChevronRight,
  ShieldCheck,
  Users,
  Activity,
  Layers,
  Landmark,
  ShieldAlert,
} from 'lucide-react';
import { useCompany, type Company } from '@/app/context/CompanyContext';
import { api, deleteCookie } from '@/services/api';
import { DEMO_COMPANIES, type DemoCompany } from '@/services/demo-data';

type SidebarCompany = Company & Partial<Pick<DemoCompany, 'role' | 'status' | 'plan'>>;

export default function Sidebar() {
  const { companies, setCompanies, selectedCompany, setSelectedCompany } = useCompany();
  const pathname = usePathname();
  const router = useRouter();

  /**
   * 1. Motor de Sincronização de Unidades
   * Alinhado com o Backend v1 e tratamento de erro profissional
   */
  const loadCompanies = useCallback(async () => {
    try {
      // O endpoint no NestJS v1 é /company
      const { data } = await api.get<DemoCompany[]>('/company');

      // Normalização: garante que temos um array
      const companiesList = Array.isArray(data) ? data : [];
      setCompanies(companiesList);

      // Reidratação: Se não houver selecionada, busca no localStorage ou pega a primeira
      if (companiesList.length > 0 && !selectedCompany) {
        const savedId = localStorage.getItem('bcost_active_company');
        const restored =
          companiesList.find((c: DemoCompany) => c.id === savedId) || companiesList[0];

        setSelectedCompany(restored);
        localStorage.setItem('bcost_active_company', restored.id);
        localStorage.setItem('bcost_active_company_data', JSON.stringify(restored));
      }
    } catch {
      // Fallback para dados demo quando a API não está disponível
      console.warn('⚠️ [bCost Demo]: API indisponível, usando dados de demonstração.');
      const companiesList = DEMO_COMPANIES;
      setCompanies(companiesList);

      if (companiesList.length > 0 && !selectedCompany) {
        const savedId = localStorage.getItem('bcost_active_company');
        const restored =
          companiesList.find((c: DemoCompany) => c.id === savedId) || companiesList[0];

        setSelectedCompany(restored);
        localStorage.setItem('bcost_active_company', restored.id);
        localStorage.setItem('bcost_active_company_data', JSON.stringify(restored));
      }
    }
  }, [setCompanies, selectedCompany, setSelectedCompany]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  /**
   * 2. Persistência de Seleção e Troca de Contexto
   */
  const handleCompanyChange = (company: SidebarCompany) => {
    setSelectedCompany(company);
    localStorage.setItem('bcost_active_company', company.id);
    localStorage.setItem('bcost_active_company_data', JSON.stringify(company));
    window.dispatchEvent(new Event('storage'));
  };

  /**
   * 3. Logoff de Segurança (Cleanup Total)
   */
  const handleLogout = () => {
    deleteCookie('bcost_token');
    deleteCookie('bcost_access_token');
    deleteCookie('bcost_company_id');
    localStorage.clear();
    sessionStorage.clear();
    router.replace('/login');
  };

  /**
   * 4. Schema de Navegação BI-Driven
   */
  const menuItems = useMemo(
    () => [
      {
        icon: LayoutDashboard,
        label: 'Performance',
        href: '/dashboard/intelligence',
        desc: 'BI & Analytics',
      },
      {
        icon: FileText,
        label: 'Documentos XML',
        href: '/dashboard/invoices',
        desc: 'Auditoria Fiscal',
      },
      {
        icon: ShieldAlert,
        label: 'Reforma Tributária',
        href: '/dashboard/compliance',
        desc: 'CBS/IBS Readiness',
      },
      {
        icon: Landmark,
        label: 'Receita & Caixa',
        href: '/dashboard/revenue',
        desc: 'Split Payment',
      },
      { icon: Users, label: 'Folha de Pagto', href: '/dashboard/payroll', desc: 'Encargos RH' },
      { icon: PieChart, label: 'Relatórios', href: '/dashboard/reports', desc: 'Exportação' },
      { icon: Activity, label: 'Conciliação', href: '/dashboard/banking', desc: 'Cash Flow' },
      {
        icon: Layers,
        label: 'Módulos Pro',
        href: '/dashboard/enterprise',
        desc: 'Coverage 360',
      },
      {
        icon: Settings,
        label: 'Configurações',
        href: '/dashboard/settings',
        desc: 'System Params',
      },
    ],
    [],
  );

  return (
    <aside className="w-72 bg-[#050810] border-r border-white/5 flex flex-col h-screen sticky top-0 z-50 font-sans shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
      {/* BRANDING */}
      <div className="p-8 pb-10">
        <div
          className="flex items-center gap-3 group cursor-pointer"
          onClick={() => router.push('/dashboard/intelligence')}
        >
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all group-hover:rotate-12 group-hover:scale-110">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter leading-none">
              bCost<span className="text-blue-500">.</span>
            </h1>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mt-1">
              v7.0 Enterprise
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 flex flex-col gap-10 overflow-y-auto custom-scrollbar scrollbar-hide">
        {/* SEÇÃO: INSTÂNCIAS (Contexto de Operação) */}
        <section>
          <header className="flex justify-between items-center mb-4 px-2">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
              Instâncias Ativas
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-green-500 font-bold uppercase">Sync</span>
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
          </header>

          <div className="space-y-2">
            {companies.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-white/5 text-center bg-white/[0.02]">
                <p className="text-[10px] text-slate-600 font-bold uppercase leading-relaxed">
                  Aguardando
                  <br />
                  provisionamento...
                </p>
              </div>
            ) : (
              companies.map((company) => {
                const isSelected = selectedCompany?.id === company.id;
                return (
                  <button
                    key={company.id}
                    onClick={() => handleCompanyChange(company)}
                    className={`w-full p-4 rounded-2xl text-left transition-all duration-300 flex items-center gap-3 border ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/40 text-white shadow-[0_10px_30px_-10px_rgba(37,99,235,0.3)]'
                        : 'bg-transparent border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-slate-600'}`}
                    >
                      <Building2 size={16} />
                    </div>
                    <div className="flex-1 truncate">
                      <p className="font-black text-[11px] uppercase tracking-tight truncate">
                        {company.name}
                      </p>
                      <p
                        className={`text-[9px] font-bold tracking-wider ${isSelected ? 'text-blue-400/80' : 'text-slate-700'}`}
                      >
                        {company.cnpj}
                      </p>
                    </div>
                    {isSelected && (
                      <ChevronRight
                        size={12}
                        className="text-blue-500 animate-in fade-in slide-in-from-left-2"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* SEÇÃO: NAVEGAÇÃO (Core Engine) */}
        <section>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">
            Sistema de Comando
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
                    isActive
                      ? 'bg-white/[0.04] text-white'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <item.icon
                    size={18}
                    className={`${isActive ? 'text-blue-500' : 'text-slate-600 group-hover:text-slate-400'} transition-colors`}
                  />
                  <div className="text-left">
                    <p className="text-[11px] font-black uppercase tracking-widest leading-none">
                      {item.label}
                    </p>
                    <p className="text-[8px] font-bold text-slate-700 uppercase mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                  {isActive && (
                    <div className="ml-auto w-1 h-4 rounded-full bg-blue-500 shadow-[0_0_15px_#3b82f6]" />
                  )}
                </button>
              );
            })}
          </nav>
        </section>
      </div>

      {/* FOOTER: SYSTEM ACTIONS */}
      <div className="p-6 border-t border-white/5 bg-[#070b14]/80 backdrop-blur-md">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/companies')}
            className="group flex items-center justify-center gap-2 w-full py-4 bg-blue-600/5 hover:bg-blue-600 text-blue-500 hover:text-white rounded-2xl font-black text-[10px] transition-all border border-blue-500/10 uppercase tracking-[0.2em] shadow-lg"
          >
            <PlusCircle size={14} className="group-hover:rotate-90 transition-transform" />
            Nova Unidade
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3.5 w-full rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-red-500 hover:bg-red-500/5 transition-all group"
          >
            <LogOut
              size={16}
              className="text-slate-700 group-hover:text-red-500 group-hover:translate-x-1 transition-all"
            />
            Sair do Terminal
          </button>
        </div>
      </div>
    </aside>
  );
}

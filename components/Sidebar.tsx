'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Building2,
  ChevronDown,
  CircleDot,
  FileText,
  Gauge,
  Landmark,
  LogOut,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Users,
  WalletCards,
} from 'lucide-react';
import { useCompany, type Company } from '@/app/context/CompanyContext';
import { api, deleteCookie } from '@/services/api';
import { DEMO_COMPANIES, type DemoCompany } from '@/services/demo-data';

type SidebarCompany = Company & Partial<Pick<DemoCompany, 'role' | 'status' | 'plan'>>;

type NavigationItem = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  href: string;
  desc: string;
  signal?: 'live' | 'new' | 'core';
};

export default function Sidebar() {
  const { companies, setCompanies, selectedCompany, setSelectedCompany } = useCompany();
  const pathname = usePathname();
  const router = useRouter();

  const loadCompanies = useCallback(async () => {
    try {
      const { data } = await api.get<DemoCompany[]>('/company');
      const companiesList = Array.isArray(data) ? data : [];
      setCompanies(companiesList);

      if (companiesList.length > 0 && !selectedCompany) {
        const savedId = localStorage.getItem('bcost_active_company');
        const restored =
          companiesList.find((c: DemoCompany) => c.id === savedId) || companiesList[0];

        setSelectedCompany(restored);
        localStorage.setItem('bcost_active_company', restored.id);
        localStorage.setItem('bcost_active_company_data', JSON.stringify(restored));
      }
    } catch {
      console.warn('[bCost Demo]: API indisponivel, usando dados de demonstracao.');
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

  const handleCompanyChange = (company: SidebarCompany) => {
    setSelectedCompany(company);
    localStorage.setItem('bcost_active_company', company.id);
    localStorage.setItem('bcost_active_company_data', JSON.stringify(company));
    window.dispatchEvent(new Event('storage'));
  };

  const handleLogout = () => {
    deleteCookie('bcost_token');
    deleteCookie('bcost_access_token');
    deleteCookie('bcost_company_id');
    localStorage.clear();
    sessionStorage.clear();
    router.replace('/login');
  };

  const commandItems = useMemo<NavigationItem[]>(
    () => [
      {
        icon: Gauge,
        label: 'Visão Geral',
        href: '/dashboard',
        desc: 'Painel executivo',
        signal: 'core',
      },
      {
        icon: Activity,
        label: 'Intelligence',
        href: '/dashboard/intelligence',
        desc: 'Fator R e cenários',
        signal: 'live',
      },
      {
        icon: FileText,
        label: 'Documentos XML',
        href: '/dashboard/xml',
        desc: 'Upload e validação',
      },
      {
        icon: ReceiptText,
        label: 'Invoices',
        href: '/dashboard/invoices',
        desc: 'Notas fiscais',
      },
      {
        icon: WalletCards,
        label: 'Revenue',
        href: '/dashboard/revenue',
        desc: 'Receita e split',
        signal: 'new',
      },
      {
        icon: Landmark,
        label: 'Banking',
        href: '/dashboard/banking',
        desc: 'Conciliação',
      },
      {
        icon: Users,
        label: 'Payroll',
        href: '/dashboard/payroll',
        desc: 'Folha e pró-labore',
      },
      {
        icon: ShieldAlert,
        label: 'Compliance',
        href: '/dashboard/compliance',
        desc: 'CBS/IBS readiness',
        signal: 'new',
      },
    ],
    [],
  );

  const systemItems = useMemo<NavigationItem[]>(
    () => [
      {
        icon: Building2,
        label: 'Empresas',
        href: '/dashboard/companies',
        desc: 'Unidades e CNPJs',
      },
      {
        icon: BarChart3,
        label: 'Controladoria',
        href: '/dashboard/operations',
        desc: 'DRE, caixa e orçamento',
        signal: 'core',
      },
      {
        icon: FileText,
        label: 'Relatórios',
        href: '/dashboard/reports',
        desc: 'PDF executivo',
      },
      {
        icon: Settings,
        label: 'Configurações',
        href: '/dashboard/settings',
        desc: 'Conta e sistema',
      },
    ],
    [],
  );

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="w-[19.25rem] shrink-0 bg-[#030713] border-r border-blue-400/10 flex flex-col h-screen sticky top-0 z-50 font-sans shadow-[24px_0_70px_rgba(0,0,0,0.45)] relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-400/40 to-transparent" />
      <div className="absolute -top-28 left-8 h-56 w-56 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="absolute bottom-20 -left-20 h-52 w-52 rounded-full bg-cyan-500/5 blur-3xl" />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="px-7 pb-5 pt-8">
          <button
            type="button"
            className="group flex w-full items-center gap-3 text-left"
            onClick={() => router.push('/dashboard')}
          >
            <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_18px_35px_rgba(37,99,235,0.35)] ring-1 ring-white/15 transition-transform duration-300 group-hover:-translate-y-0.5">
              <ShieldCheck size={27} />
              <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-[#030713] bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.75)]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[1.7rem] font-black leading-none tracking-tight text-white">
                bCost<span className="text-blue-400">.</span>
              </h1>
              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-300/60">
                v7.2 Enterprise
              </p>
            </div>
          </button>
        </div>

        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          <section>
            <SectionTitle label="Instâncias Ativas" meta="online" />
            <div className="mt-3 space-y-2">
              {companies.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-5 text-center">
                  <p className="text-[10px] font-black uppercase leading-relaxed tracking-[0.18em] text-slate-600">
                    Aguardando provisionamento
                  </p>
                </div>
              ) : (
                companies.map((company) => {
                  const isSelected = selectedCompany?.id === company.id;
                  return (
                    <button
                      key={company.id}
                      onClick={() => handleCompanyChange(company)}
                      className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 ${
                        isSelected
                          ? 'border-blue-400/45 bg-blue-500/[0.12] text-white shadow-[0_16px_32px_rgba(29,78,216,0.18)]'
                          : 'border-white/5 bg-white/[0.025] text-slate-400 hover:border-blue-400/25 hover:bg-blue-500/[0.07] hover:text-white'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.9)]" />
                      )}
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                          isSelected
                            ? 'bg-blue-500 text-white shadow-[0_10px_22px_rgba(37,99,235,0.35)]'
                            : 'bg-white/[0.06] text-slate-500 group-hover:text-blue-300'
                        }`}
                      >
                        <Building2 size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-black tracking-tight">
                          {company.name}
                        </p>
                        <p
                          className={`mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.16em] ${
                            isSelected ? 'text-blue-200/70' : 'text-slate-600'
                          }`}
                        >
                          {company.cnpj || 'CNPJ sincronizado'}
                        </p>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${isSelected ? 'text-blue-300' : 'text-slate-600 group-hover:text-blue-300'}`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <NavigationSection
            title="Sistema de Comando"
            items={commandItems}
            isActiveRoute={isActiveRoute}
            onNavigate={(href) => router.push(href)}
          />

          <NavigationSection
            title="Controladoria & Sistema"
            items={systemItems}
            isActiveRoute={isActiveRoute}
            onNavigate={(href) => router.push(href)}
          />
        </div>

        <div className="relative border-t border-white/10 bg-[#050a18]/85 p-4 backdrop-blur-xl">
          <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Sessão Segura
                </p>
                <p className="mt-1 truncate text-[11px] font-bold text-slate-300">
                  {selectedCompany?.name || 'Nenhuma instância selecionada'}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
                <CircleDot size={16} />
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="group flex w-full items-center justify-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] px-4 py-3.5 text-[11px] font-black uppercase tracking-[0.16em] text-rose-300 transition-all duration-300 hover:border-rose-400/60 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut
              size={16}
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            />
            Sair do Terminal
          </button>
        </div>
      </div>
    </aside>
  );
}

function SectionTitle({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between px-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200/55">{label}</p>
      {meta ? (
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
          <span className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-300/70">
            {meta}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function NavigationSection({
  title,
  items,
  isActiveRoute,
  onNavigate,
}: {
  title: string;
  items: NavigationItem[];
  isActiveRoute: (href: string) => boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <section className="mt-8">
      <SectionTitle label={title} />
      <nav className="mt-3 space-y-1.5">
        {items.map((item) => {
          const isActive = isActiveRoute(item.href);
          return (
            <button
              key={item.href}
              onClick={() => onNavigate(item.href)}
              className={`group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl px-3.5 py-3 text-left transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500/18 via-blue-500/9 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(96,165,250,0.25)]'
                  : 'text-slate-400 hover:bg-white/[0.045] hover:text-white'
              }`}
            >
              {isActive && (
                <>
                  <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.9)]" />
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.16),transparent_42%)]" />
                </>
              )}
              <span
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-[0_12px_24px_rgba(37,99,235,0.32)]'
                    : 'bg-white/[0.035] text-slate-500 group-hover:bg-blue-500/10 group-hover:text-blue-200'
                }`}
              >
                <item.icon size={17} />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold leading-none">
                  {item.label}
                </span>
                <span
                  className={`mt-1 block truncate text-[9px] font-black uppercase tracking-[0.14em] ${
                    isActive ? 'text-blue-200/70' : 'text-slate-600 group-hover:text-slate-500'
                  }`}
                >
                  {item.desc}
                </span>
              </span>
              {item.signal ? (
                <span
                  className={`relative h-2 w-2 rounded-full ${
                    item.signal === 'live'
                      ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                      : item.signal === 'new'
                        ? 'bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.75)]'
                        : 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.75)]'
                  }`}
                />
              ) : null}
            </button>
          );
        })}
      </nav>
    </section>
  );
}

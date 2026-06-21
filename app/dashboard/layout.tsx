'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import { useCompany } from '@/app/context/CompanyContext';
import CompanySessionHydrator from '@/components/session/CompanySessionHydrator';
import Sidebar from '@/components/Sidebar';

/**
 * DashboardLayout (Enterprise Grade)
 * Centraliza e distribui o grid responsivo de forma estrita para evitar quebra de dimensões nos gráficos (Recharts)
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { selectedCompany } = useCompany();

  return (
    <>
      {/* Hidratador e validador de sessão multi-tenant */}
      <CompanySessionHydrator />

      <div className="flex min-h-screen bg-[#020408] text-slate-100 overflow-x-hidden antialiased">
        {/* Componente Global de Comando Lateral */}
        <Sidebar />

        {/* Core Viewport Container */}
        <main className="flex-1 flex flex-col min-w-0 min-h-screen p-8 lg:p-12">
          {/* Header de Contexto do Ecossistema */}
          <header className="flex justify-between items-center mb-10 w-full animate-in fade-in slide-in-from-top-3 duration-500">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Building2
                  size={13}
                  className="text-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                />
                <h1 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                  {selectedCompany?.name
                    ? `Instância: ${selectedCompany.name}`
                    : 'Gestão Fiscal bCost'}
                </h1>
              </div>
              <p className="text-2xl font-black tracking-tight text-white">
                Painel de <span className="text-blue-500">Controle</span>
              </p>
            </div>

            {/* User Profile Identity Badge */}
            <div className="flex items-center gap-3.5 bg-[#090d16] border border-white/5 p-2 pr-5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-white/10 transition-all duration-300 group cursor-pointer">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white text-sm font-black shadow-lg relative overflow-hidden">
                <span className="relative z-10">V</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-200 leading-none">Vinícius</span>
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider mt-0.5">
                  Admin Master
                </span>
              </div>
            </div>
          </header>

          {/* 
            Container de Injeção de Rota Dinâmica
            w-full e min-w-0 são mandatórios para forçar o Recharts a calcular a largura real do grid.
          */}
          <div className="flex-1 w-full min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

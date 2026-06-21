import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
// Importando o Provider para que o useCompany funcione em todas as páginas
import { CompanyProvider } from '@/app/context/CompanyContext';
import { QueryProvider } from '@/app/context/QueryProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Metadados atualizados para o seu produto real
export const metadata: Metadata = {
  title: 'bCost Intelligence | Gestão Fiscal Pro',
  description: 'Análise de Fator R e Planejamento Tributário Avançado',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        {/* O QueryProvider fornece cache global e queda de dados moderna. */}
        <QueryProvider>
          {/* O CompanyProvider deve envolver o children para que Sidebar e Dashboard 
              consigam acessar o estado global da empresa selecionada sem erro 500. */}
          <CompanyProvider>{children}</CompanyProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

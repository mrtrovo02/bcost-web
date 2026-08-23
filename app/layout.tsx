import type { Metadata } from 'next';
import './globals.css';
// Importando o Provider para que o useCompany funcione em todas as páginas
import { CompanyProvider } from '@/app/context/CompanyContext';
import { QueryProvider } from '@/app/context/QueryProvider';
import { SkipLink } from '@/components/ui/SkipLink';

// Metadados atualizados para o seu produto real
export const metadata: Metadata = {
  title: 'bCost Intelligence | Plataforma de Gestão Fiscal e Tributária',
  description:
    'Plataforma empresarial para análise de Fator R, otimização tributária, auditoria fiscal e visão executiva em tempo real.',
  keywords: [
    'gestão fiscal',
    'fator r',
    'tributação',
    'auditoria fiscal',
    'planejamento tributário',
    'inteligência financeira',
    'fintech',
    'contabilidade digital',
  ],
  metadataBase: new URL('https://bcost.com.br'),
  openGraph: {
    title: 'bCost Intelligence',
    description: 'Painel executivo para gestão fiscal e otimização tributária.',
    type: 'website',
    siteName: 'bCost Intelligence',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bCost Intelligence',
    description: 'Painel executivo para gestão fiscal e otimização tributária.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body
        className="antialiased bg-slate-50 text-slate-900"
      >
        <SkipLink />
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

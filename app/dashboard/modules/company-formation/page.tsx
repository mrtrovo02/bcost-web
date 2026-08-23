import AccountingSetupReadinessWidget from '@/components/enterprise/AccountingSetupReadinessWidget';

export default function CompanyFormationPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-700">
            bCost Legalização
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Abertura, Migração e MEI para ME
          </h1>
          <p className="max-w-4xl text-sm leading-6 text-slate-600">
            Esteira assistida para qualificar documentos, município, viabilidade,
            certificado, CRC, acesso a órgãos oficiais e dossiê auditável antes
            de ativar serviços societários em produção.
          </p>
        </header>

        <AccountingSetupReadinessWidget />
      </div>
    </main>
  );
}

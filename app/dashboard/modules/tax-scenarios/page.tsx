import TaxScenarioSimulator from '@/components/tax-intelligence/TaxScenarioSimulator';

export default function TaxScenariosPage() {
  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-400">
            bCost Tax Scenarios
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Simulador Tributário
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-400">
            Comparação orientativa para triagem comercial, abertura, migração e
            planejamento assistido. O resultado não substitui apuração oficial,
            enquadramento definitivo ou revisão por contador responsável.
          </p>
        </header>

        <TaxScenarioSimulator />
      </div>
    </main>
  );
}

import Link from 'next/link';
import { bcostModuleAreas, bcostSchemaModules, getModuleStats } from '@/lib/product/schema-modules';
import AutomationJobsExecutiveWidget from '@/components/enterprise/AutomationJobsExecutiveWidget';
import BillingPlansWidget from '@/components/enterprise/BillingPlansWidget';

function statusLabel(status: string) {
  if (status === 'ACTIVE') return 'Ativo';
  if (status === 'INTEGRATING') return 'Em integração';
  return 'Planejado';
}

function statusClass(status: string) {
  if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'INTEGRATING') return 'bg-blue-50 text-blue-700 border-blue-100';
  return 'bg-slate-50 text-slate-500 border-slate-100';
}

function priorityClass(priority: string) {
  if (priority === 'CRITICAL') return 'bg-red-50 text-red-700';
  if (priority === 'HIGH') return 'bg-amber-50 text-amber-700';
  if (priority === 'MEDIUM') return 'bg-violet-50 text-violet-700';
  return 'bg-slate-50 text-slate-500';
}

export default function EnterpriseModulesPage() {
  const stats = getModuleStats();

  return (
    <div className="min-h-screen space-y-10 bg-[#fcfdfe] p-8">
      <section className="rounded-[2rem] bg-slate-950 p-10 text-white shadow-2xl">
        <div className="max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
            bCost Enterprise Schema Coverage
          </p>

          <h1 className="mt-5 text-5xl font-black tracking-tighter">
            Plataforma Fiscal, Financeira e Contábil Inteligente
          </h1>

          <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-300">
            Este painel representa todos os domínios previstos no schema enterprise do bCost. A meta
            é garantir que cada recurso do backend tenha uma experiência clara no frontend: tela,
            serviço, endpoint, métricas, ações e valor comercial.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-3xl font-black">{stats.total}</p>
            <p className="mt-1 text-xs text-slate-400">Módulos do schema</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-3xl font-black text-emerald-300">{stats.active}</p>
            <p className="mt-1 text-xs text-slate-400">Ativos</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-3xl font-black text-blue-300">{stats.integrating}</p>
            <p className="mt-1 text-xs text-slate-400">Em integração</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-3xl font-black text-slate-300">{stats.planned}</p>
            <p className="mt-1 text-xs text-slate-400">Planejados</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-3xl font-black text-red-300">{stats.critical}</p>
            <p className="mt-1 text-xs text-slate-400">Críticos</p>
          </div>
        </div>
      </section>

      {bcostModuleAreas.map((area) => {
        const modules = bcostSchemaModules.filter((module) => module.area === area);

        if (modules.length === 0) return null;

        return (
          <section key={area} className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">Área</p>
                <h2 className="mt-2 text-3xl font-black tracking-tighter text-slate-900">{area}</h2>
              </div>

              <p className="text-sm font-bold text-slate-400">{modules.length} módulos</p>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              {modules.map((module) => (
                <Link
                  href={`/dashboard/enterprise/modules/${module.slug}`}
                  key={module.slug}
                  className="group rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass(
                        module.status,
                      )}`}
                    >
                      {statusLabel(module.status)}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${priorityClass(
                        module.priority,
                      )}`}
                    >
                      {module.priority}
                    </span>
                  </div>

                  <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-900 group-hover:text-blue-700">
                    {module.title}
                  </h3>

                  <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Model: {module.model}
                  </p>

                  <p className="mt-4 text-sm leading-6 text-slate-500">{module.description}</p>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Valor comercial
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                      {module.commercialValue}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {module.kpis.slice(0, 3).map((kpi) => (
                      <span
                        key={kpi}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"
                      >
                        {kpi}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <BillingPlansWidget />
      <AutomationJobsExecutiveWidget />
    </div>
  );
}

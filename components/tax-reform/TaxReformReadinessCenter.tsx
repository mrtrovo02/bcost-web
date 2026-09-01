'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Download,
  FileCheck2,
  Loader2,
  RotateCcw,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';
import { useCompany } from '@/app/context/CompanyContext';
import {
  calculateTaxReformReadiness,
  ReadinessStatus,
  TaxReformReadinessItem,
} from '@/lib/tax-reform/readiness-engine';
import {
  appendTaxReformReadinessAudit,
  loadTaxReformReadinessAudit,
  loadTaxReformReadiness,
  resetTaxReformReadiness,
  saveTaxReformReadiness,
  TaxReformReadinessAuditRecord,
} from '@/lib/tax-reform/readiness-storage';
import {
  CBS_IBS_TRANSITION,
  TAX_REFORM_OFFICIAL_SOURCES,
} from '@/lib/tax-reform/official-data';
import { buildDashboardPdfCanvasOptions } from '@/lib/export/html2canvas-options';

interface TaxReformReadinessCenterProps {
  companyName?: string;
  items?: TaxReformReadinessItem[];
}

const STATUS_LABEL: Record<ReadinessStatus, string> = {
  done: 'Concluído',
  'in-progress': 'Em andamento',
  blocked: 'Bloqueado',
  'not-started': 'Não iniciado',
};

const STATUS_ICON: Record<ReadinessStatus, React.ReactNode> = {
  done: <CheckCircle2 size={16} />,
  'in-progress': <CircleDashed size={16} />,
  blocked: <AlertTriangle size={16} />,
  'not-started': <CalendarClock size={16} />,
};

function phaseClass(phase: 'red' | 'amber' | 'green') {
  if (phase === 'green') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (phase === 'amber') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-rose-200 bg-rose-50 text-rose-800';
}

function priorityClass(priority: TaxReformReadinessItem['priority']) {
  if (priority === 'critical') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (priority === 'high') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-blue-200 bg-blue-50 text-blue-700';
}

function statusClass(status: ReadinessStatus) {
  if (status === 'done') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'in-progress') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'blocked') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

export default function TaxReformReadinessCenter({
  companyName = 'Empresa selecionada',
  items,
}: TaxReformReadinessCenterProps) {
  const { selectedCompany } = useCompany();
  const effectiveCompanyId = selectedCompany?.id || 'default';
  const effectiveCompanyName = selectedCompany?.name || companyName;
  const [managedItems, setManagedItems] = useState<TaxReformReadinessItem[]>(() =>
    items || [],
  );
  const [audit, setAudit] = useState<TaxReformReadinessAuditRecord[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (items) {
      setManagedItems(items);
      return;
    }

    setManagedItems(loadTaxReformReadiness(effectiveCompanyId));
    setAudit(loadTaxReformReadinessAudit(effectiveCompanyId));
  }, [effectiveCompanyId, items]);

  useEffect(() => {
    if (items || managedItems.length === 0) return;

    saveTaxReformReadiness(effectiveCompanyId, managedItems);
    setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  }, [effectiveCompanyId, items, managedItems]);

  const readiness = useMemo(
    () => calculateTaxReformReadiness(managedItems.length > 0 ? managedItems : items),
    [items, managedItems],
  );

  const updateStatus = (itemId: string, status: ReadinessStatus) => {
    setManagedItems((current) =>
      current.map((item) => {
        if (item.id !== itemId || item.status === status) return item;

        const nextAudit = appendTaxReformReadinessAudit({
          companyId: effectiveCompanyId,
          action: 'status-change',
          itemId: item.id,
          itemTitle: item.title,
          previousStatus: item.status,
          nextStatus: status,
        });
        setAudit(nextAudit);

        return { ...item, status };
      }),
    );
  };

  const resetChecklist = () => {
    setManagedItems(resetTaxReformReadiness(effectiveCompanyId));
    setAudit(
      appendTaxReformReadinessAudit({
        companyId: effectiveCompanyId,
        action: 'reset',
      }),
    );
    setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  };

  const exportDossier = async () => {
    const element = document.getElementById('tax-reform-readiness-dossier');
    if (!element) return;

    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(
        element,
        buildDashboardPdfCanvasOptions('#f8fafc', 'tax-reform-readiness-dossier'),
      );
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Dossie_Reforma_Tributaria_${effectiveCompanyName}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section
        id="tax-reform-readiness-dossier"
        className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10"
      >
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-blue-600">
              Compliance fiscal
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              Centro de Prontidão Reforma Tributária
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              Plano operacional para adaptar {effectiveCompanyName} à fase de teste CBS/IBS em{' '}
              {CBS_IBS_TRANSITION.displayStartDate}, com evidências, responsáveis e prioridade por risco.
            </p>
            <p className="mt-2 text-xs font-bold text-slate-400">
              {savedAt ? `Salvo automaticamente às ${savedAt}` : 'Checklist salvo por empresa ativa'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <button
              type="button"
              onClick={exportDossier}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Exportar dossiê
            </button>
            <button
              type="button"
              onClick={resetChecklist}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
            >
              <RotateCcw size={15} />
              Restaurar padrão
            </button>
            <div className={`rounded-2xl border px-5 py-4 ${phaseClass(readiness.phase)}`}>
              <p className="text-[10px] font-black uppercase tracking-[0.24em]">Score de prontidão</p>
              <p className="mt-2 text-3xl font-black">{readiness.score}%</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <KpiCard
            label="Status executivo"
            value={readiness.headline}
            icon={<ShieldCheck size={20} />}
            tone={readiness.phase}
          />
          <KpiCard
            label="Itens concluídos"
            value={`${readiness.completed}/${readiness.total}`}
            icon={<CheckCircle2 size={20} />}
            tone="green"
          />
          <KpiCard
            label="Críticos em aberto"
            value={readiness.criticalOpen}
            icon={<AlertTriangle size={20} />}
            tone={readiness.criticalOpen > 0 ? 'red' : 'green'}
          />
          <KpiCard
            label="Marco operacional"
            value={CBS_IBS_TRANSITION.displayStartDate}
            icon={<CalendarClock size={20} />}
            tone="blue"
          />
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.65fr_0.35fr]">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-black text-slate-950">Checklist por ordem de grandeza</h2>
              <p className="mt-1 text-sm text-slate-500">
                Primeiro documentos fiscais e cálculo, depois contador, caixa, auditoria e relatório.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {readiness.items.map((item) => (
                <article key={item.id} className="grid gap-4 p-5 xl:grid-cols-[1fr_220px]">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${priorityClass(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusClass(item.status)}`}>
                        {STATUS_ICON[item.status]}
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-black text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <UserRoundCheck size={14} /> {item.owner}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock size={14} /> {item.dueDate}
                      </span>
                    </div>
                    <label className="mt-4 inline-grid gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500">
                      Status operacional
                      <select
                        value={item.status}
                        onChange={(event) =>
                          updateStatus(item.id, event.target.value as ReadinessStatus)
                        }
                        className="min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold normal-case tracking-normal text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="not-started">Não iniciado</option>
                        <option value="in-progress">Em andamento</option>
                        <option value="blocked">Bloqueado</option>
                        <option value="done">Concluído</option>
                      </select>
                    </label>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <FileCheck2 size={16} />
                      <p className="text-[10px] font-black uppercase tracking-[0.22em]">Evidência</p>
                    </div>
                    <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">{item.evidence}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6 text-blue-900 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em]">Próxima ação</p>
              <h2 className="mt-3 text-xl font-black">{readiness.nextAction.title}</h2>
              <p className="mt-3 text-sm leading-7 text-blue-900/75">
                {readiness.nextAction.description}
              </p>
              <div className="mt-5 rounded-2xl bg-white/70 p-4 text-xs font-bold text-blue-900/75">
                Responsável: {readiness.nextAction.owner}
                <br />
                Prazo: {readiness.nextAction.dueDate}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Fontes oficiais</h2>
              <div className="mt-4 grid gap-3">
                <a
                  href={TAX_REFORM_OFFICIAL_SOURCES.constitutionalAmendment132}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                >
                  EC 132/2023
                </a>
                <a
                  href={TAX_REFORM_OFFICIAL_SOURCES.revenueTaxReform}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                >
                  Receita Federal - Reforma Tributária
                </a>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Trilha de auditoria</h2>
              <p className="mt-1 text-sm text-slate-500">
                Últimas mudanças salvas para esta empresa.
              </p>

              <div className="mt-4 space-y-3">
                {audit.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
                    Nenhuma alteração registrada.
                  </div>
                ) : (
                  audit.slice(0, 6).map((record) => (
                    <div key={record.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                          {record.action === 'reset' ? 'Checklist restaurado' : 'Status alterado'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {new Date(record.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      {record.itemTitle && (
                        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                          {record.itemTitle}: {record.previousStatus} → {record.nextStatus}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone: 'red' | 'amber' | 'green' | 'blue';
}) {
  const tones = {
    red: 'border-rose-100 bg-rose-50 text-rose-800',
    amber: 'border-amber-100 bg-amber-50 text-amber-800',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-800',
    blue: 'border-blue-100 bg-blue-50 text-blue-800',
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">{label}</p>
          <div className="mt-3 text-lg font-black leading-7">{value}</div>
        </div>
        <div className="rounded-2xl bg-white/70 p-2">{icon}</div>
      </div>
    </div>
  );
}

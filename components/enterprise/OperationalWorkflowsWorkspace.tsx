'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  DatabaseZap,
  FileCheck2,
  KeyRound,
  Loader2,
  RefreshCw,
  Route,
  ShieldCheck,
  UserCheck,
  Workflow,
} from 'lucide-react';

import {
  OperationalCapabilityDefinition,
  OperationalWorkflowPreview,
  OperationalWorkflowStage,
  operationalWorkflowsApi,
} from '@/lib/api/operational-workflows';
import { BcostPlan, ServiceEvaluationInput } from '@/lib/api/service-catalog';
import { BCOST_SERVICE_CATALOG } from '@/lib/api/service-catalog-data';

type UiMessage = {
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  description?: string;
};

type WorkflowServiceOption = {
  id: string;
  name: string;
  macroServiceName: string;
};

const PLAN_OPTIONS: Array<{ label: string; value: BcostPlan }> = [
  { label: 'Enterprise', value: 'ENTERPRISE' },
  { label: 'Experts', value: 'EXPERTS' },
  { label: 'Pro', value: 'PRO' },
  { label: 'Padrão', value: 'STANDARD' },
  { label: 'Básico', value: 'BASIC' },
];

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function statusTone(value: string) {
  const normalized = value.toUpperCase();

  if (normalized.includes('READY') || normalized.includes('DONE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (normalized.includes('CRC') || normalized.includes('BACKOFFICE')) {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  if (normalized.includes('CUSTOMER') || normalized.includes('DEPENDENCY')) {
    return 'border-blue-200 bg-blue-50 text-blue-800';
  }

  if (normalized.includes('BLOCK')) {
    return 'border-red-200 bg-red-50 text-red-800';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function riskTone(value: string) {
  const normalized = value.toUpperCase();

  if (normalized === 'LOW') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (normalized === 'MEDIUM') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (normalized === 'HIGH') return 'border-orange-200 bg-orange-50 text-orange-800';
  if (normalized === 'CRITICAL') return 'border-red-200 bg-red-50 text-red-800';

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function actorIcon(actor: string) {
  if (actor === 'BCOST_SOFTWARE') return <Bot className="h-4 w-4" />;
  if (actor === 'OFFICIAL_INTEGRATION') return <DatabaseZap className="h-4 w-4" />;
  if (actor === 'CRC_ACCOUNTANT') return <UserCheck className="h-4 w-4" />;
  if (actor === 'PUBLIC_AGENCY') return <ShieldCheck className="h-4 w-4" />;
  if (actor === 'CUSTOMER') return <KeyRound className="h-4 w-4" />;

  return <ClipboardCheck className="h-4 w-4" />;
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
        </div>
        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">{icon}</div>
      </div>
    </div>
  );
}

function StageCard({ stage, index }: { stage: OperationalWorkflowStage; index: number }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">
            {index + 1}
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950">{stage.title}</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
              <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${statusTone(stage.status)}`}>
                {actorIcon(stage.actor)}
                {stage.actor}
              </span>
              <span className={`rounded-lg border px-2 py-1 ${statusTone(stage.runtimeStatus)}`}>
                {stage.runtimeStatus}
              </span>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
                {stage.executionEngine}
              </span>
            </div>
          </div>
        </div>
        <span className={`rounded-lg border px-3 py-1 text-xs font-black ${statusTone(stage.status)}`}>
          {stage.status}
        </span>
      </div>

      {stage.blockingReason && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {stage.blockingReason}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="text-xs font-black uppercase text-slate-500">Capacidades exigidas</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {stage.requiredCapabilities.length > 0 ? (
              stage.requiredCapabilities.map((capability) => (
                <span
                  key={capability}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800"
                >
                  {capability}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">Sem capacidade adicional.</span>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-black uppercase text-slate-500">Evidências obrigatórias</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {stage.evidenceRequired.map((evidence) => (
              <li key={evidence} className="flex gap-2">
                <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{evidence}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function CapabilityCard({ capability }: { capability: OperationalCapabilityDefinition }) {
  return (
    <article className={`rounded-lg border p-3 text-sm ${riskTone(capability.criticality)}`}>
      <div className="font-black">{capability.label}</div>
      <div className="mt-1 text-xs font-bold uppercase opacity-80">
        {capability.code} · {capability.category} · {capability.criticality}
      </div>
      <p className="mt-2 leading-5 opacity-90">{capability.description}</p>
    </article>
  );
}

export default function OperationalWorkflowsWorkspace() {
  const services = useMemo<WorkflowServiceOption[]>(() => {
    return BCOST_SERVICE_CATALOG.flatMap((macro) =>
      macro.microServices.map((service) => ({
        id: service.id,
        name: service.name,
        macroServiceName: macro.name,
      })),
    );
  }, []);

  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id ?? 'dctfweb');
  const [plan, setPlan] = useState<BcostPlan>('ENTERPRISE');
  const [contractedAt, setContractedAt] = useState(getTodayInputValue());
  const [periodStart, setPeriodStart] = useState(getTodayInputValue());
  const [activeCustomer, setActiveCustomer] = useState(true);
  const [municipalityDigital, setMunicipalityDigital] = useState(true);
  const [physicalProtocolRequired, setPhysicalProtocolRequired] = useState(false);
  const [capabilities, setCapabilities] = useState<OperationalCapabilityDefinition[]>([]);
  const [workflow, setWorkflow] = useState<OperationalWorkflowPreview | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);
  const [loadingCapabilities, setLoadingCapabilities] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const selectedService = useMemo(() => {
    return services.find((service) => service.id === selectedServiceId) ?? services[0] ?? null;
  }, [selectedServiceId, services]);

  const loadCapabilities = useCallback(async () => {
    setLoadingCapabilities(true);

    try {
      const response = await operationalWorkflowsApi.capabilities();
      setCapabilities(response);
    } catch (error) {
      setMessage({
        type: 'warning',
        title: 'Não foi possível carregar capacidades operacionais',
        description:
          error instanceof Error
            ? error.message
            : 'A API de capabilities não respondeu nesta sessão.',
      });
    } finally {
      setLoadingCapabilities(false);
    }
  }, []);

  const loadPreview = useCallback(async () => {
    if (!selectedServiceId) return;

    setLoadingPreview(true);
    setMessage(null);

    const payload: ServiceEvaluationInput = {
      serviceIds: [selectedServiceId],
      plan,
      activeCustomer,
      contractedAt,
      periodStart,
      municipalityDigital,
      physicalProtocolRequired,
    };

    try {
      const response = await operationalWorkflowsApi.preview(payload);
      setWorkflow(response);
      setMessage({
        type: 'success',
        title: 'Workflow operacional atualizado',
        description: `${response.serviceName} foi classificado com risco ${response.operationalRisk}.`,
      });
    } catch (error) {
      setWorkflow(null);
      setMessage({
        type: 'error',
        title: 'Não foi possível gerar o workflow',
        description:
          error instanceof Error
            ? error.message
            : 'A API de workflows operacionais não retornou uma prévia válida.',
      });
    } finally {
      setLoadingPreview(false);
    }
  }, [
    activeCustomer,
    contractedAt,
    municipalityDigital,
    periodStart,
    physicalProtocolRequired,
    plan,
    selectedServiceId,
  ]);

  useEffect(() => {
    loadCapabilities();
  }, [loadCapabilities]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const visibleCapabilities = useMemo(() => {
    if (!workflow) return capabilities.slice(0, 6);

    const required = new Set(workflow.requiredCapabilities);
    return capabilities.filter((capability) => required.has(capability.code));
  }, [capabilities, workflow]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/dashboard/modules"
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Enterprise Schema Coverage
            </Link>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              bCost Operations Layer
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Workflows Operacionais
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              Orquestração por serviço para separar execução automatizada, integração oficial,
              RPA governamental, validação CRC, backoffice e ação do cliente, com evidências
              obrigatórias antes de qualquer promessa produtiva.
            </p>
          </div>

          <button
            type="button"
            onClick={loadPreview}
            disabled={loadingPreview}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-300"
          >
            {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar workflow
          </button>
        </header>

        {message && (
          <div
            className={`rounded-lg border p-4 text-sm ${
              message.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : message.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : message.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-blue-200 bg-blue-50 text-blue-800'
            }`}
          >
            <div className="font-black">{message.title}</div>
            {message.description && <div className="mt-1 opacity-90">{message.description}</div>}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Etapas"
            value={workflow?.operationalSummary.totalStages ?? '—'}
            icon={<Route className="h-5 w-5" />}
          />
          <MetricCard
            label="Etapas humanas"
            value={workflow?.operationalSummary.humanStages ?? '—'}
            icon={<UserCheck className="h-5 w-5" />}
          />
          <MetricCard
            label="Evidências"
            value={workflow?.operationalSummary.evidenceArtifacts ?? '—'}
            icon={<FileCheck2 className="h-5 w-5" />}
          />
          <MetricCard
            label="Capacidades"
            value={workflow?.operationalSummary.requiredCapabilities ?? capabilities.length}
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <Workflow className="h-4 w-4" />
              Parâmetros de execução
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-bold text-slate-700">Serviço</span>
              <select
                value={selectedServiceId}
                onChange={(event) => setSelectedServiceId(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              {selectedService && (
                <span className="text-xs text-slate-500">{selectedService.macroServiceName}</span>
              )}
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-bold text-slate-700">Plano</span>
              <select
                value={plan}
                onChange={(event) => setPlan(event.target.value as BcostPlan)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {PLAN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-bold text-slate-700">Data de contratação</span>
              <input
                type="date"
                value={contractedAt}
                onChange={(event) => setContractedAt(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-bold text-slate-700">Competência ou fato gerador</span>
              <input
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <label className="flex items-center justify-between gap-3">
                <span className="font-bold text-slate-700">Empresa ativa na base</span>
                <input
                  type="checkbox"
                  checked={activeCustomer}
                  onChange={(event) => setActiveCustomer(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="font-bold text-slate-700">Prefeitura digital</span>
                <input
                  type="checkbox"
                  checked={municipalityDigital}
                  onChange={(event) => setMunicipalityDigital(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="font-bold text-slate-700">Protocolo físico exigido</span>
                <input
                  type="checkbox"
                  checked={physicalProtocolRequired}
                  onChange={(event) => setPhysicalProtocolRequired(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>
            </div>
          </aside>

          <div className="space-y-6">
            {loadingPreview && !workflow ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                <div className="mt-3 text-sm font-bold">Gerando workflow operacional...</div>
              </div>
            ) : workflow ? (
              <>
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="text-xs font-black uppercase text-slate-500">
                        {workflow.macroServiceName}
                      </div>
                      <h2 className="mt-1 text-2xl font-black text-slate-950">
                        {workflow.serviceName}
                      </h2>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                        <span className={`rounded-lg border px-3 py-1 ${riskTone(workflow.operationalRisk)}`}>
                          Risco {workflow.operationalRisk}
                        </span>
                        <span className={`rounded-lg border px-3 py-1 ${statusTone(workflow.productionReadiness)}`}>
                          {workflow.productionReadiness}
                        </span>
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                          {workflow.automationLevel}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        {workflow.gates.requiresCrcValidation ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                        CRC
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        {workflow.gates.requiresOfficialCredential ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                        Credencial
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        {workflow.gates.requiresCustomerAction ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                        Cliente
                      </span>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-black text-slate-950">Esteira de execução</h2>
                    <span className="text-xs font-bold uppercase text-slate-500">
                      Gerado em {new Date(workflow.generatedAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {workflow.stages.map((stage, index) => (
                    <StageCard key={stage.id} stage={stage} index={index} />
                  ))}
                </section>
              </>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
                Nenhum workflow operacional foi carregado.
              </div>
            )}
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Capacidades produtivas</h2>
              <p className="mt-1 text-sm text-slate-600">
                Inventário técnico necessário para executar serviços contábeis reais com evidência,
                autorização, trilha de auditoria e validação profissional quando exigida.
              </p>
            </div>
            {loadingCapabilities && <Loader2 className="h-5 w-5 animate-spin text-slate-500" />}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleCapabilities.map((capability) => (
              <CapabilityCard key={capability.code} capability={capability} />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

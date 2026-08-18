'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Cpu,
  FileCheck2,
  KeyRound,
  Loader2,
  MapPinned,
  Milestone,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';

import {
  MacroServiceDefinition,
  MicroServiceDefinition,
  ServiceCondition,
  ServiceEvaluationResult,
  ServiceExecutionProfile,
  serviceCatalogApi,
} from '@/lib/api/service-catalog';
import {
  OperationalCapabilityDefinition,
  OperationalWorkflowPreview,
  operationalWorkflowsApi,
} from '@/lib/api/operational-workflows';

type UiMessage = {
  type: 'error' | 'warning' | 'success';
  title: string;
  description?: string;
};

type FlatService = MicroServiceDefinition & {
  macroServiceId: number;
  macroServiceName: string;
};

const PLAN_OPTIONS = [
  { value: 'STANDARD', label: 'Padrão' },
  { value: 'EXPERTS', label: 'Experts' },
  { value: 'MULTIBENEFITS', label: 'Multibenefícios' },
  { value: 'BASIC', label: 'Básico' },
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function flattenCatalog(catalog: MacroServiceDefinition[]): FlatService[] {
  return catalog.flatMap((macro) =>
    macro.microServices.map((service) => ({
      ...service,
      macroServiceId: macro.id,
      macroServiceName: macro.name,
    })),
  );
}

function conditionTone(severity: ServiceCondition['severity']) {
  if (severity === 'BLOCKER') {
    return {
      border: 'border-red-200',
      bg: 'bg-red-50',
      text: 'text-red-800',
      icon: <ShieldAlert className="h-4 w-4" />,
    };
  }

  if (severity === 'WARNING') {
    return {
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      icon: <AlertTriangle className="h-4 w-4" />,
    };
  }

  return {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    icon: <CheckCircle2 className="h-4 w-4" />,
  };
}

function flagLabel(service: MicroServiceDefinition) {
  const flags: string[] = [];

  if (service.governmentFeesMayApply) flags.push('taxas externas');
  if (service.addOnService) flags.push('avulso');
  if (service.expertsHonorariumWaivable) flags.push('Experts');
  if (service.retroactiveSensitive) flags.push('retroativo');
  if (service.municipalDependency) flags.push('município');
  if (service.physicalProtocolMayApply) flags.push('protocolo físico');

  return flags;
}

function serviceNotes(service: MicroServiceDefinition) {
  return service.notes ?? [];
}

const AUTOMATION_LABEL: Record<ServiceExecutionProfile['automationLevel'], string> = {
  FULL_AUTOMATION_CANDIDATE: 'Automação total candidata',
  ASSISTED_AUTOMATION: 'Automação assistida',
  HUMAN_VALIDATED: 'Validação CRC',
  HUMAN_LED: 'Operação humana',
};

const READINESS_LABEL: Record<ServiceExecutionProfile['productionReadiness'], string> = {
  READY_FOR_INTERNAL_WORKFLOW: 'Workflow interno pronto',
  INTEGRATION_REQUIRED: 'Integração necessária',
  BACKOFFICE_REQUIRED: 'Backoffice obrigatório',
  PLANNED: 'Planejado',
};

const RISK_LABEL: Record<ServiceExecutionProfile['operationalRisk'], string> = {
  LOW: 'Baixo',
  MEDIUM: 'Médio',
  HIGH: 'Alto',
  CRITICAL: 'Crítico',
};

function executionTone(profile: ServiceExecutionProfile) {
  if (profile.operationalRisk === 'CRITICAL') return 'border-red-200 bg-red-50 text-red-800';
  if (profile.operationalRisk === 'HIGH') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (profile.operationalRisk === 'MEDIUM') return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

function capabilityTone(capability?: OperationalCapabilityDefinition) {
  if (capability?.criticality === 'CRITICAL') return 'border-red-100 bg-red-50 text-red-700';
  if (capability?.criticality === 'HIGH') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (capability?.criticality === 'MEDIUM') return 'border-blue-100 bg-blue-50 text-blue-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
        </div>
        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">{icon}</div>
      </div>
    </div>
  );
}

export default function ServiceCatalogWorkspace() {
  const [catalog, setCatalog] = useState<MacroServiceDefinition[]>([]);
  const [selectedMacroId, setSelectedMacroId] = useState<number>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('company-opening');
  const [plan, setPlan] = useState<string>('STANDARD');
  const [activeCustomer, setActiveCustomer] = useState<boolean>(true);
  const [municipalityDigital, setMunicipalityDigital] = useState<boolean>(true);
  const [physicalProtocolRequired, setPhysicalProtocolRequired] = useState<boolean>(false);
  const [contractedAt, setContractedAt] = useState<string>(todayInputValue());
  const [periodStart, setPeriodStart] = useState<string>(todayInputValue());
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [message, setMessage] = useState<UiMessage | null>(null);
  const [evaluation, setEvaluation] = useState<ServiceEvaluationResult | null>(null);
  const [workflow, setWorkflow] = useState<OperationalWorkflowPreview | null>(null);

  const flatServices = useMemo(() => flattenCatalog(catalog), [catalog]);

  const visibleServices = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return flatServices.filter((service) => {
      const matchesMacro = service.macroServiceId === selectedMacroId;
      if (!matchesMacro) return false;
      if (!needle) return true;

      return `${service.name} ${service.id} ${service.macroServiceName}`.toLowerCase().includes(needle);
    });
  }, [flatServices, query, selectedMacroId]);

  const selectedService = useMemo(
    () => flatServices.find((service) => service.id === selectedServiceId) ?? null,
    [flatServices, selectedServiceId],
  );

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await serviceCatalogApi.catalog();
      setCatalog(response.catalog);

      if (response.status === 'OK_LOCAL_FALLBACK') {
        setMessage({
          type: 'warning',
          title: 'Catálogo local em uso',
          description:
            'A API de catálogo não respondeu nesta sessão. A tela continua funcionando com a fonte local do frontend.',
        });
      }

      const firstMacro = response.catalog[0];
      const firstService = firstMacro?.microServices[0];

      if (firstMacro && !response.catalog.some((macro) => macro.id === selectedMacroId)) {
        setSelectedMacroId(firstMacro.id);
      }

      if (firstService && !flattenCatalog(response.catalog).some((service) => service.id === selectedServiceId)) {
        setSelectedServiceId(firstService.id);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        title: 'Falha ao carregar catálogo',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível consultar o catálogo de serviços.',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedMacroId, selectedServiceId]);

  const evaluate = useCallback(
    async (serviceId = selectedServiceId) => {
      if (!serviceId) return;

      setEvaluating(true);
      setMessage(null);

      try {
        const result = await serviceCatalogApi.evaluate({
          serviceIds: [serviceId],
          plan,
          activeCustomer,
          contractedAt,
          periodStart,
          municipalityDigital,
          physicalProtocolRequired,
        });
        let workflowPreview: OperationalWorkflowPreview | null = null;

        try {
          workflowPreview = await operationalWorkflowsApi.preview({
            serviceIds: [serviceId],
            plan,
            activeCustomer,
            contractedAt,
            periodStart,
            municipalityDigital,
            physicalProtocolRequired,
          });
        } catch {
          workflowPreview = null;
        }

        setEvaluation(result);
        setWorkflow(workflowPreview);
        setSelectedServiceId(serviceId);
      } catch (error) {
        setWorkflow(null);
        setMessage({
          type: 'error',
          title: 'Falha ao avaliar serviço',
          description:
            error instanceof Error
              ? error.message
              : 'Não foi possível avaliar as condicionantes do serviço.',
        });
      } finally {
        setEvaluating(false);
      }
    },
    [
      activeCustomer,
      contractedAt,
      municipalityDigital,
      periodStart,
      physicalProtocolRequired,
      plan,
      selectedServiceId,
    ],
  );

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!loading && selectedServiceId) {
      evaluate(selectedServiceId);
    }
  }, [activeCustomer, contractedAt, evaluate, loading, municipalityDigital, periodStart, physicalProtocolRequired, plan, selectedServiceId]);

  const conditionByService = useMemo(() => {
    return (evaluation?.conditions ?? []).reduce<Record<string, ServiceCondition[]>>((acc, condition) => {
      const key = condition.serviceId ?? 'global';
      if (!acc[key]) acc[key] = [];
      acc[key].push(condition);
      return acc;
    }, {});
  }, [evaluation]);

  const selectedEvaluatedService = useMemo(() => {
    return (
      evaluation?.selectedServices.find((service) => service.id === selectedServiceId) ??
      evaluation?.selectedServices[0] ??
      null
    );
  }, [evaluation?.selectedServices, selectedServiceId]);

  const capabilityDetailsByCode = useMemo(() => {
    return (workflow?.capabilityDetails ?? []).reduce<Record<string, OperationalCapabilityDefinition>>(
      (acc, capability) => {
        acc[capability.code] = capability;
        return acc;
      },
      {},
    );
  }, [workflow?.capabilityDetails]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-6">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
                <BookOpen className="h-4 w-4" />
                Catálogo de Serviços
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                Regras de negócio e escopo de serviços
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Fonte operacional própria para classificar solicitações, validar escopo comercial
                e identificar condicionantes antes de orientar o cliente.
              </p>
            </div>

            <button
              type="button"
              onClick={loadCatalog}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </button>
          </div>

          {message && (
            <div
              className={`mt-4 rounded-lg border p-3 text-sm ${
                message.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : message.type === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              <div className="font-semibold">{message.title}</div>
              {message.description && <div className="mt-1 opacity-90">{message.description}</div>}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Macroserviços" value={catalog.length} icon={<Building2 className="h-5 w-5" />} />
          <Metric label="Microserviços" value={flatServices.length} icon={<SlidersHorizontal className="h-5 w-5" />} />
          <Metric label="Validação CRC" value={evaluation?.summary.crcValidationServices ?? 0} icon={<UserCheck className="h-5 w-5" />} />
          <Metric label="Credencial oficial" value={evaluation?.summary.officialCredentialServices ?? 0} icon={<KeyRound className="h-5 w-5" />} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <SlidersHorizontal className="h-4 w-4" />
              Avaliação
            </div>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Plano</span>
                <select
                  value={plan}
                  onChange={(event) => setPlan(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                >
                  {PLAN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Data de contratação</span>
                <input
                  type="date"
                  value={contractedAt}
                  onChange={(event) => setContractedAt(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Competência ou fato gerador</span>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </label>

              <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <label className="flex items-center justify-between gap-3">
                  <span>Empresa ativa na base</span>
                  <input
                    type="checkbox"
                    checked={activeCustomer}
                    onChange={(event) => setActiveCustomer(event.target.checked)}
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between gap-3">
                  <span>Prefeitura digital</span>
                  <input
                    type="checkbox"
                    checked={municipalityDigital}
                    onChange={(event) => setMunicipalityDigital(event.target.checked)}
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between gap-3">
                  <span>Protocolo físico exigido</span>
                  <input
                    type="checkbox"
                    checked={physicalProtocolRequired}
                    onChange={(event) => setPhysicalProtocolRequired(event.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
              </div>

              {selectedService && (
                <button
                  type="button"
                  onClick={() => evaluate(selectedService.id)}
                  disabled={evaluating}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
                >
                  {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                  Avaliar serviço
                </button>
              )}
            </div>
          </aside>

          <section className="grid gap-6">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  {catalog.map((macro) => (
                    <button
                      key={macro.id}
                      type="button"
                      onClick={() => {
                        setSelectedMacroId(macro.id);
                        setQuery('');
                        const firstService = macro.microServices[0];
                        if (firstService) setSelectedServiceId(firstService.id);
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                        selectedMacroId === macro.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {macro.id}. {macro.name}
                    </button>
                  ))}
                </div>

                <label className="relative block min-w-64">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar microserviço"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
                  />
                </label>
              </div>
            </div>

            {loading ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                Carregando catálogo...
              </div>
            ) : (
              <div className="grid gap-3">
                {visibleServices.map((service) => {
                  const flags = flagLabel(service);
                  const serviceConditions = conditionByService[service.id] ?? [];

                  return (
                    <article
                      key={service.id}
                      className={`rounded-lg border bg-white p-4 transition ${
                        selectedServiceId === service.id ? 'border-emerald-500' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <button
                          type="button"
                          onClick={() => evaluate(service.id)}
                          className="text-left"
                        >
                          <div className="text-xs font-semibold uppercase text-slate-400">
                            Macroserviço {service.macroServiceId}
                          </div>
                          <h2 className="mt-1 text-base font-bold text-slate-950">{service.name}</h2>
                          <div className="mt-1 text-xs text-slate-500">{service.id}</div>
                        </button>

                        <div className="flex flex-wrap gap-2">
                          {flags.length === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              recorrente
                            </span>
                          ) : (
                            flags.map((flag) => (
                              <span
                                key={flag}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600"
                              >
                                {flag === 'taxas externas' ? (
                                  <CircleDollarSign className="h-3.5 w-3.5" />
                                ) : flag === 'município' ? (
                                  <MapPinned className="h-3.5 w-3.5" />
                                ) : flag === 'retroativo' ? (
                                  <CalendarDays className="h-3.5 w-3.5" />
                                ) : (
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                )}
                                {flag}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      {service.notes && service.notes.length > 0 && (
                        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                          <div className="grid gap-1">
                            {serviceNotes(service).map((note) => (
                              <div key={note}>{note}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {service.complianceTags && service.complianceTags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {service.complianceTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {service.officialSources && service.officialSources.length > 0 && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                          <div className="mb-2 font-bold uppercase text-slate-500">
                            Fontes oficiais
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {service.officialSources.map((source) => (
                              <a
                                key={source.url}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                              >
                                {source.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedServiceId === service.id && (
                        <div className="mt-4 grid gap-2">
                          {selectedEvaluatedService?.executionProfile && (
                            <div
                              className={`rounded-lg border p-3 text-sm ${executionTone(
                                selectedEvaluatedService.executionProfile,
                              )}`}
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <div className="flex items-center gap-2 font-bold">
                                    <Cpu className="h-4 w-4" />
                                    Engenharia de execução
                                  </div>
                                  <div className="mt-2 grid gap-1 text-xs leading-5">
                                    <span>
                                      {AUTOMATION_LABEL[selectedEvaluatedService.executionProfile.automationLevel]}
                                    </span>
                                    <span>
                                      {READINESS_LABEL[selectedEvaluatedService.executionProfile.productionReadiness]}
                                    </span>
                                    <span>
                                      Risco operacional: {RISK_LABEL[selectedEvaluatedService.executionProfile.operationalRisk]}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {selectedEvaluatedService.executionProfile.requiresCrcValidation && (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-white/60 bg-white/70 px-2 py-1 text-xs font-bold">
                                      <UserCheck className="h-3.5 w-3.5" />
                                      CRC
                                    </span>
                                  )}
                                  {selectedEvaluatedService.executionProfile.requiresOfficialCredential && (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-white/60 bg-white/70 px-2 py-1 text-xs font-bold">
                                      <KeyRound className="h-3.5 w-3.5" />
                                      credencial
                                    </span>
                                  )}
                                  {selectedEvaluatedService.executionProfile.requiresCustomerAction && (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-white/60 bg-white/70 px-2 py-1 text-xs font-bold">
                                      <FileCheck2 className="h-3.5 w-3.5" />
                                      cliente
                                    </span>
                                  )}
                                </div>
                              </div>

                              {selectedEvaluatedService.executionProfile.integrationTargets.length > 0 && (
                                <div className="mt-3 border-t border-current/15 pt-3 text-xs leading-5">
                                  <div className="font-bold uppercase opacity-75">Integrações</div>
                                  {selectedEvaluatedService.executionProfile.integrationTargets.map((target) => (
                                    <div key={target}>{target}</div>
                                  ))}
                                </div>
                              )}

                              <div className="mt-3 border-t border-current/15 pt-3 text-xs leading-5">
                                <div className="font-bold uppercase opacity-75">Evidências</div>
                                {selectedEvaluatedService.executionProfile.evidenceArtifacts
                                  .slice(0, 3)
                                  .map((artifact) => (
                                    <div key={artifact}>{artifact}</div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {workflow && workflow.serviceId === service.id && (
                            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="flex items-center gap-2 font-bold text-slate-900">
                                  <Milestone className="h-4 w-4" />
                                  Esteira operacional oficial
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-bold text-slate-700">
                                    {workflow.operationalSummary.totalStages} etapas
                                  </span>
                                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-bold text-slate-700">
                                    {workflow.operationalSummary.humanStages} humanas
                                  </span>
                                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-bold text-slate-700">
                                    {workflow.operationalSummary.evidenceArtifacts} evidências
                                  </span>
                                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-bold text-slate-700">
                                    {workflow.operationalSummary.requiredCapabilities} capacidades
                                  </span>
                                </div>
                              </div>
                              {workflow.requiredCapabilities.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                                  {workflow.requiredCapabilities.map((capability) => (
                                    <span
                                      key={capability}
                                      title={capabilityDetailsByCode[capability]?.description}
                                      className={`rounded-lg border px-2 py-1 text-xs font-bold ${capabilityTone(
                                        capabilityDetailsByCode[capability],
                                      )}`}
                                    >
                                      {capabilityDetailsByCode[capability]?.label ?? capability}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="mt-3 grid gap-2">
                                {workflow.stages.map((stage, index) => (
                                  <div
                                    key={stage.id}
                                    className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 md:grid-cols-[32px_minmax(0,1fr)_160px]"
                                  >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-white">
                                      {index + 1}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-950">{stage.title}</div>
                                      <div className="mt-1 text-xs text-slate-500">
                                        {stage.executionEngine} · {stage.actor}
                                      </div>
                                      <div className="mt-2 text-xs font-semibold text-slate-700">
                                        Status operacional: {stage.runtimeStatus}
                                      </div>
                                      {stage.requiredCapabilities.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {stage.requiredCapabilities.map((capability) => (
                                            <span
                                              key={capability}
                                              title={capabilityDetailsByCode[capability]?.description}
                                              className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${capabilityTone(
                                                capabilityDetailsByCode[capability],
                                              )}`}
                                            >
                                              {capabilityDetailsByCode[capability]?.label ?? capability}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {stage.evidenceRequired[0] && (
                                        <div className="mt-2 text-xs leading-5 text-slate-600">
                                          {stage.evidenceRequired[0]}
                                        </div>
                                      )}
                                      {stage.blockingReason && (
                                        <div className="mt-2 text-xs leading-5 text-amber-700">
                                          {stage.blockingReason}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-left md:text-right">
                                      <span className="inline-flex rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700">
                                        {stage.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {evaluating ? (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                              Avaliando condicionantes...
                            </div>
                          ) : serviceConditions.length > 0 ? (
                            serviceConditions.map((condition) => {
                              const tone = conditionTone(condition.severity);

                              return (
                                <div
                                  key={`${condition.code}-${condition.serviceId}`}
                                  className={`rounded-lg border p-3 text-sm ${tone.border} ${tone.bg} ${tone.text}`}
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="mt-0.5 flex-none">{tone.icon}</span>
                                    <div>
                                      <div className="font-bold">{condition.code}</div>
                                      <div className="mt-1 leading-5">{condition.message}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                              <div className="flex items-center gap-2 font-semibold">
                                <CheckCircle2 className="h-4 w-4" />
                                Sem condicionantes críticas para o cenário informado.
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

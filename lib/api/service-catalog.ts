'use strict';

import { api } from '@/services/api';
import { BCOST_SERVICE_CATALOG } from './service-catalog-data';

export type BcostPlan =
  | 'BASIC'
  | 'STANDARD'
  | 'EXPERTS'
  | 'MULTIBENEFITS'
  | 'FREE'
  | 'PRO'
  | 'ENTERPRISE'
  | 'UNKNOWN';

export type ServiceConditionSeverity = 'INFO' | 'WARNING' | 'BLOCKER';

export type ServiceExecutionEngine =
  | 'SOFTWARE_WORKFLOW'
  | 'OFFICIAL_API'
  | 'GOVERNMENT_PORTAL_RPA'
  | 'MUNICIPAL_RPA'
  | 'CERTIFICATE_AUTH'
  | 'BANKING_AS_A_SERVICE'
  | 'OPEN_FINANCE'
  | 'HUMAN_CRC_REVIEW'
  | 'MANUAL_PROTOCOL';

export type ServiceAutomationLevel =
  | 'FULL_AUTOMATION_CANDIDATE'
  | 'ASSISTED_AUTOMATION'
  | 'HUMAN_VALIDATED'
  | 'HUMAN_LED';

export type ServiceProductionReadiness =
  | 'READY_FOR_INTERNAL_WORKFLOW'
  | 'INTEGRATION_REQUIRED'
  | 'BACKOFFICE_REQUIRED'
  | 'PLANNED';

export type ServiceOperationalRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ServiceCondition = {
  code: string;
  severity: ServiceConditionSeverity;
  message: string;
  serviceId?: string;
};

export type MicroServiceDefinition = {
  id: string;
  name: string;
  notes?: string[];
  officialSources?: Array<{
    label: string;
    url: string;
  }>;
  complianceTags?: string[];
  governmentFeesMayApply?: boolean;
  addOnService?: boolean;
  expertsHonorariumWaivable?: boolean;
  retroactiveSensitive?: boolean;
  municipalDependency?: boolean;
  physicalProtocolMayApply?: boolean;
  activeCustomersOnly?: boolean;
};

export type MacroServiceDefinition = {
  id: number;
  name: string;
  description: string;
  microServices: MicroServiceDefinition[];
};

export type ServiceExecutionProfile = {
  automationLevel: ServiceAutomationLevel;
  productionReadiness: ServiceProductionReadiness;
  operationalRisk: ServiceOperationalRisk;
  executionEngines: ServiceExecutionEngine[];
  integrationTargets: string[];
  evidenceArtifacts: string[];
  requiresCrcValidation: boolean;
  requiresOfficialCredential: boolean;
  requiresCustomerAction: boolean;
};

export type ServiceCatalogResponse = {
  status: string;
  catalog: MacroServiceDefinition[];
  generatedAt: string;
};

export type ServiceEvaluationInput = {
  macroServiceIds?: number[];
  serviceIds?: string[];
  plan?: string;
  activeCustomer?: boolean;
  contractedAt?: string;
  eventDate?: string;
  periodStart?: string;
  municipalityDigital?: boolean;
  physicalProtocolRequired?: boolean;
};

export type EvaluatedMicroService = MicroServiceDefinition & {
  macroServiceId: number;
  macroServiceName: string;
  executionProfile: ServiceExecutionProfile;
};

export type ServiceEvaluationResult = {
  status: 'OK';
  plan: BcostPlan;
  selectedServices: EvaluatedMicroService[];
  conditions: ServiceCondition[];
  summary: {
    totalServices: number;
    blockers: number;
    warnings: number;
    infos: number;
    requiresHumanReview: boolean;
    crcValidationServices: number;
    customerActionServices: number;
    officialCredentialServices: number;
  };
  generatedAt: string;
};

function normalizePlan(plan?: string): BcostPlan {
  const normalized = String(plan || 'UNKNOWN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '_');

  if (['PADRAO', 'STANDARD'].includes(normalized)) return 'STANDARD';
  if (['EXPERT', 'EXPERTS'].includes(normalized)) return 'EXPERTS';
  if (['MULTIBENEFICIOS', 'MULTIBENEFITS'].includes(normalized)) return 'MULTIBENEFITS';
  if (['BASICO', 'BASIC'].includes(normalized)) return 'BASIC';
  if (normalized === 'FREE') return 'FREE';
  if (normalized === 'PRO') return 'PRO';
  if (normalized === 'ENTERPRISE') return 'ENTERPRISE';

  return 'UNKNOWN';
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildExecutionProfile(service: MicroServiceDefinition): ServiceExecutionProfile {
  const tags = new Set((service.complianceTags ?? []).map((tag) => tag.toUpperCase()));
  const executionEngines = new Set<ServiceExecutionEngine>(['SOFTWARE_WORKFLOW']);
  const integrationTargets = new Set<string>();
  const evidenceArtifacts = new Set<string>([
    'Registro de solicitação com usuário, empresa, competência e timestamp.',
    'Log de execução e resultado do workflow.',
  ]);

  let requiresCrcValidation = false;
  let requiresOfficialCredential = false;
  let requiresCustomerAction = Boolean(service.physicalProtocolMayApply);
  let operationalRisk: ServiceOperationalRisk = 'LOW';

  if (service.officialSources?.length || service.complianceTags?.length) {
    evidenceArtifacts.add('Fonte oficial, leiaute ou norma usada na validação.');
    operationalRisk = 'MEDIUM';
  }

  if (service.governmentFeesMayApply) {
    evidenceArtifacts.add('Comprovante de taxa pública quando aplicável.');
    operationalRisk = 'MEDIUM';
  }

  if (service.municipalDependency) {
    executionEngines.add('MUNICIPAL_RPA');
    integrationTargets.add('Prefeitura municipal ou emissor nacional quando disponível.');
    evidenceArtifacts.add('Protocolo municipal, recibo ou comprovante de deferimento.');
    requiresOfficialCredential = true;
    operationalRisk = 'HIGH';
  }

  if (service.physicalProtocolMayApply) {
    executionEngines.add('MANUAL_PROTOCOL');
    evidenceArtifacts.add('Comprovante de protocolo físico ou orientação enviada ao cliente.');
    requiresCustomerAction = true;
    operationalRisk = 'HIGH';
  }

  if (
    [
      'SPED',
      'ECD',
      'ECF',
      'DCTFWEB',
      'EFD-REINF',
      'EFD ICMS IPI',
      'EFD CONTRIBUIÇÕES',
      'PGDAS-D',
      'DAS',
      'DEFIS',
      'ESOCIAL',
      'FGTS DIGITAL',
    ].some((tag) => tags.has(tag))
  ) {
    executionEngines.add('GOVERNMENT_PORTAL_RPA');
    executionEngines.add('CERTIFICATE_AUTH');
    executionEngines.add('HUMAN_CRC_REVIEW');
    integrationTargets.add('Portal oficial da Receita Federal, SPED, eSocial ou FGTS Digital.');
    evidenceArtifacts.add('Recibo oficial de transmissão, guia, declaração ou comprovante.');
    requiresCrcValidation = true;
    requiresOfficialCredential = true;
    operationalRisk = 'CRITICAL';
  }

  if (tags.has('NFS-E') || tags.has('NF-E') || tags.has('NFC-E') || tags.has('CT-E')) {
    executionEngines.add('OFFICIAL_API');
    executionEngines.add('GOVERNMENT_PORTAL_RPA');
    executionEngines.add('CERTIFICATE_AUTH');
    integrationTargets.add('SEFAZ, NFS-e Nacional ou prefeitura homologada.');
    evidenceArtifacts.add('XML autorizado, protocolo, recibo e evento fiscal.');
    requiresOfficialCredential = true;
    operationalRisk = 'CRITICAL';
  }

  if (
    service.id.includes('bank') ||
    service.id.includes('baas') ||
    service.name.toLowerCase().includes('open finance')
  ) {
    executionEngines.add('OPEN_FINANCE');
    executionEngines.add('BANKING_AS_A_SERVICE');
    integrationTargets.add('Instituição parceira regulada, Open Finance ou BaaS.');
    evidenceArtifacts.add('Consentimento, extrato, evento de conciliação e trilha de auditoria.');
    requiresOfficialCredential = true;
    operationalRisk = 'HIGH';
  }

  const automationLevel: ServiceAutomationLevel = executionEngines.has('MANUAL_PROTOCOL')
    ? 'HUMAN_LED'
    : requiresCrcValidation
      ? 'HUMAN_VALIDATED'
      : requiresCustomerAction || executionEngines.size > 1
        ? 'ASSISTED_AUTOMATION'
        : 'FULL_AUTOMATION_CANDIDATE';
  const productionReadiness: ServiceProductionReadiness =
    automationLevel === 'HUMAN_LED' || requiresCrcValidation
      ? 'BACKOFFICE_REQUIRED'
      : requiresOfficialCredential
        ? 'INTEGRATION_REQUIRED'
        : 'READY_FOR_INTERNAL_WORKFLOW';

  return {
    automationLevel,
    productionReadiness,
    operationalRisk,
    executionEngines: [...executionEngines],
    integrationTargets: [...integrationTargets],
    evidenceArtifacts: [...evidenceArtifacts],
    requiresCrcValidation,
    requiresOfficialCredential,
    requiresCustomerAction,
  };
}

function localEvaluate(payload: ServiceEvaluationInput): ServiceEvaluationResult {
  const plan = normalizePlan(payload.plan);
  const macroIds = new Set(payload.macroServiceIds ?? []);
  const serviceIds = new Set(payload.serviceIds ?? []);
  const selectAll = macroIds.size === 0 && serviceIds.size === 0;
  const activeCustomer = payload.activeCustomer ?? true;
  const contractedAt = parseDate(payload.contractedAt);
  const referenceDate = parseDate(payload.periodStart) ?? parseDate(payload.eventDate);
  const isRetroactive = Boolean(
    contractedAt && referenceDate && referenceDate.getTime() < contractedAt.getTime(),
  );

  const selectedServices = BCOST_SERVICE_CATALOG.flatMap((macro) => {
    if (!selectAll && macroIds.size > 0 && !macroIds.has(macro.id)) return [];

    return macro.microServices
      .filter((service) => serviceIds.size === 0 || serviceIds.has(service.id))
      .map((service) => ({
        ...service,
        macroServiceId: macro.id,
        macroServiceName: macro.name,
        executionProfile: buildExecutionProfile(service),
      }));
  });

  const conditions: ServiceCondition[] = [];

  for (const service of selectedServices) {
    if (service.officialSources?.length || service.complianceTags?.length) {
      conditions.push({
        code: 'OFFICIAL_RULE_REVIEW_REQUIRED',
        severity: 'INFO',
        serviceId: service.id,
        message:
          'Servico com base regulatoria oficial: validar leiaute, prazo, regime tributario, UF/municipio e atos vigentes antes da execucao.',
      });
    }

    if (service.governmentFeesMayApply) {
      conditions.push({
        code: 'GOVERNMENT_FEES_NOT_INCLUDED',
        severity: 'WARNING',
        serviceId: service.id,
        message:
          'Taxas publicas, cartorio, correios, certificado avulso e custos de orgaos publicos nao fazem parte da gratuidade nem da mensalidade base.',
      });
    }

    if (service.addOnService) {
      conditions.push({
        code: 'ADDON_NOT_IN_BASE_MONTHLY_FEE',
        severity: 'WARNING',
        serviceId: service.id,
        message:
          'Servico avulso nao incluso na mensalidade padrao, salvo isencao expressa do plano contratado.',
      });
    }

    if (service.activeCustomersOnly && !activeCustomer) {
      conditions.push({
        code: 'ACTIVE_CUSTOMERS_ONLY',
        severity: 'BLOCKER',
        serviceId: service.id,
        message: 'Servicos avulsos sao prestados apenas para empresas ativas na base de clientes.',
      });
    }

    if (service.retroactiveSensitive && isRetroactive) {
      conditions.push({
        code: 'RETROACTIVE_PERIOD_NOT_INCLUDED',
        severity: 'WARNING',
        serviceId: service.id,
        message:
          'Periodos anteriores a contratacao nao fazem parte do plano padrao e exigem analise/orcamento separado.',
      });
    }

    if (service.expertsHonorariumWaivable && plan === 'EXPERTS') {
      conditions.push({
        code: isRetroactive ? 'EXPERTS_NO_RETROACTIVE_WAIVER' : 'EXPERTS_HONORARIUM_WAIVER',
        severity: isRetroactive ? 'WARNING' : 'INFO',
        serviceId: service.id,
        message: isRetroactive
          ? 'A isencao do Experts nao cobre pendencias retroativas ou fatos geradores anteriores a adesao.'
          : 'No Experts, os honorarios deste servico podem ser isentos durante a vigencia do plano.',
      });
    }

    if (service.municipalDependency && payload.municipalityDigital === false) {
      conditions.push({
        code: 'MUNICIPAL_DIGITAL_DEPENDENCY',
        severity: 'WARNING',
        serviceId: service.id,
        message:
          'A execucao depende da legislacao local e do nivel de digitalizacao da prefeitura do municipio.',
      });
    }

    if (
      service.physicalProtocolMayApply &&
      (payload.physicalProtocolRequired || payload.municipalityDigital === false)
    ) {
      conditions.push({
        code: 'PHYSICAL_PROTOCOL_CUSTOMER_ACTION',
        severity: 'WARNING',
        serviceId: service.id,
        message:
          'Quando houver protocolo presencial/fisico, a plataforma fornece a documentacao e o cliente pode precisar protocolar localmente.',
      });
    }
  }

  const blockers = conditions.filter((item) => item.severity === 'BLOCKER').length;
  const warnings = conditions.filter((item) => item.severity === 'WARNING').length;
  const infos = conditions.filter((item) => item.severity === 'INFO').length;

  return {
    status: 'OK',
    plan,
    selectedServices,
    conditions,
    summary: {
      totalServices: selectedServices.length,
      blockers,
      warnings,
      infos,
      requiresHumanReview: blockers > 0 || warnings > 0,
      crcValidationServices: selectedServices.filter(
        (service) => service.executionProfile.requiresCrcValidation,
      ).length,
      customerActionServices: selectedServices.filter(
        (service) => service.executionProfile.requiresCustomerAction,
      ).length,
      officialCredentialServices: selectedServices.filter(
        (service) => service.executionProfile.requiresOfficialCredential,
      ).length,
    },
    generatedAt: new Date().toISOString(),
  };
}

export const serviceCatalogApi = {
  catalog: async (): Promise<ServiceCatalogResponse> => {
    try {
      const response = await api.get<ServiceCatalogResponse>('/service-catalog');
      return response.data;
    } catch {
      return {
        status: 'OK_LOCAL_FALLBACK',
        catalog: BCOST_SERVICE_CATALOG,
        generatedAt: new Date().toISOString(),
      };
    }
  },

  evaluate: async (payload: ServiceEvaluationInput): Promise<ServiceEvaluationResult> => {
    try {
      const response = await api.post<ServiceEvaluationResult>('/service-catalog/evaluate', payload);
      return response.data;
    } catch {
      return localEvaluate(payload);
    }
  },
};

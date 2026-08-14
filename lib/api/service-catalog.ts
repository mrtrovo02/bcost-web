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
      }));
  });

  const conditions: ServiceCondition[] = [];

  for (const service of selectedServices) {
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

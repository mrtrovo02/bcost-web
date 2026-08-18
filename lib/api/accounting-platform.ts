'use strict';

import { api } from '@/services/api';
import { OperationalCapability } from './operational-workflows';

export type AccountingPlatformBlock =
  | 'ONBOARDING_LEGALIZATION'
  | 'RECURRING_ACCOUNTING_TAX'
  | 'FINTECH_VALUE_ADDED'
  | 'SERVICE_ARCHITECTURE';

export type AccountingPlatformMaturity =
  | 'ACTIVE'
  | 'INTEGRATING'
  | 'PLANNED'
  | 'REQUIRES_PARTNER'
  | 'REQUIRES_HUMAN_OPERATION';

export type AccountingPlatformReadinessGap = {
  code: string;
  severity: 'INFO' | 'WARNING' | 'BLOCKER';
  message: string;
};

export type AccountingPlatformPriorityTier = 'P0' | 'P1' | 'P2' | 'P3';

export type AccountingPlatformCoverageItem = {
  id: string;
  block: AccountingPlatformBlock;
  title: string;
  objective: string;
  engineeringExecution: string;
  bcostModules: string[];
  serviceCatalogIds: string[];
  requiredCapabilities: OperationalCapability[];
  automationBoundary: 'SOFTWARE_ONLY' | 'ASSISTED_AUTOMATION' | 'CRC_VALIDATED' | 'HUMAN_LED';
  maturity: AccountingPlatformMaturity;
  officialEvidence: string[];
  readinessGaps?: AccountingPlatformReadinessGap[];
  nextActions?: string[];
  priorityScore?: number;
  priorityTier?: AccountingPlatformPriorityTier;
};

export type AccountingPlatformCoverageResponse = {
  status: 'OK';
  items: AccountingPlatformCoverageItem[];
  summary: {
    total: number;
    active: number;
    integrating: number;
    planned: number;
    requiresPartner: number;
    requiresHumanOperation: number;
    crcValidated: number;
    blockers: number;
    warnings: number;
    p0: number;
    p1: number;
  };
  generatedAt: string;
};

export type AccountingOfferingMarketStatus =
  | 'MARKET_READY'
  | 'ASSISTED_SELLABLE'
  | 'WAITLIST_ONLY'
  | 'INTERNAL_ROADMAP';

export type AccountingOfferingActivationStatus = 'READY' | 'REQUIRES_SETUP' | 'BLOCKED';

export type AccountingOfferingActivationRequirement = {
  code: string;
  label: string;
  owner:
    | 'PRODUCT'
    | 'BACKOFFICE'
    | 'CRC'
    | 'GOVERNMENT_INTEGRATIONS'
    | 'FINTECH_PARTNERS'
    | 'GOVERNANCE';
  status: AccountingOfferingActivationStatus;
  evidenceRequired: string[];
};

export type AccountingOfferingPlaybookStage = {
  id: string;
  title: string;
  owner: AccountingOfferingActivationRequirement['owner'];
  targetSlaHours: number;
  entryCriteria: string[];
  exitCriteria: string[];
  evidenceRequired: string[];
  status: AccountingOfferingActivationStatus;
};

export type AccountingOffering = {
  id: string;
  name: string;
  headline: string;
  targetCustomers: string[];
  blocks: AccountingPlatformBlock[];
  coverageItemIds: string[];
  includedServices: string[];
  excludedServices: string[];
  requiredCapabilities: OperationalCapability[];
  marketStatus: AccountingOfferingMarketStatus;
  marketGuardrails: string[];
  launchReadinessScore: number;
  commercialDecision: string;
  activationRequirements: AccountingOfferingActivationRequirement[];
  activationSummary: {
    total: number;
    ready: number;
    requiresSetup: number;
    blocked: number;
  };
  activationPlaybook: AccountingOfferingPlaybookStage[];
};

export type AccountingOfferingsResponse = {
  status: 'OK';
  offerings: AccountingOffering[];
  summary: {
    total: number;
    marketReady: number;
    assistedSellable: number;
    waitlistOnly: number;
    internalRoadmap: number;
  };
  generatedAt: string;
};

export const accountingPlatformApi = {
  coverage: async (): Promise<AccountingPlatformCoverageResponse> => {
    const response = await api.get<AccountingPlatformCoverageResponse>(
      '/accounting-platform/coverage',
    );

    return response.data;
  },
  offerings: async (): Promise<AccountingOfferingsResponse> => {
    const response = await api.get<AccountingOfferingsResponse>(
      '/accounting-platform/offerings',
    );

    return response.data;
  },
};

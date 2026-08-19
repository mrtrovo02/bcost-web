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

export type AccountingSetupOperation =
  | 'COMPANY_OPENING'
  | 'ACCOUNTING_MIGRATION'
  | 'MEI_TO_ME_MIGRATION';

export type AccountingSetupReadinessInput = {
  companyId?: string;
  operation?: AccountingSetupOperation;
  state?: string;
  municipalityCode?: string;
  legalNature?: 'LTDA' | 'SLU' | 'EI' | 'MEI' | 'OTHER';
  taxRegime?: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  hasPartnerDocuments?: boolean;
  hasAddressProof?: boolean;
  hasViabilityCheck?: boolean;
  hasDigitalCertificate?: boolean;
  hasCrcResponsible?: boolean;
  hasBackofficeOwner?: boolean;
  hasAuditEvidenceStore?: boolean;
  hasOfficialPortalAccess?: boolean;
  hasMunicipalCoverage?: boolean;
  hasPreviousAccountingDocs?: boolean;
  hasMeiDeregistrationEvidence?: boolean;
};

export type AccountingSetupReadinessResponse = {
  status: 'OK';
  operation: AccountingSetupOperation;
  companyId?: string;
  decision: 'READY_FOR_ASSISTED_EXECUTION' | 'REQUIRES_SETUP' | 'BLOCKED';
  score: number;
  gates: {
    code: string;
    label: string;
    status: 'PASS' | 'WARN' | 'FAIL';
    owner: 'CUSTOMER' | 'BACKOFFICE' | 'CRC' | 'GOVERNMENT_INTEGRATIONS' | 'PUBLIC_AGENCY';
    message: string;
  }[];
  stages: {
    id: string;
    title: string;
    owner: 'CUSTOMER' | 'BACKOFFICE' | 'CRC' | 'GOVERNMENT_INTEGRATIONS' | 'PUBLIC_AGENCY';
    automationBoundary: 'SOFTWARE_ONLY' | 'ASSISTED_AUTOMATION' | 'CRC_VALIDATED' | 'HUMAN_LED';
    status: 'READY' | 'REQUIRES_ACTION' | 'BLOCKED';
    evidenceRequired: string[];
  }[];
  evidenceRequired: string[];
  setupDossier: {
    id: string;
    integrityHash: string;
    requiredArtifacts: {
      code: string;
      label: string;
      status: 'READY' | 'PENDING' | 'MISSING';
      source: 'CUSTOMER' | 'BCOST' | 'CRC' | 'GOVERNMENT_PORTAL' | 'PUBLIC_AGENCY';
    }[];
  };
  officialDependencies: string[];
  nextActions: string[];
  guardrails: string[];
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

export type AccountingOfferingCompanyProfile = {
  companyId?: string;
  taxRegime?: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  cnae?: string | null;
  municipalityCode?: string;
  hasDigitalCertificate?: boolean;
  hasCrcResponsible?: boolean;
  hasBackofficeOwner?: boolean;
  hasAuditEvidenceStore?: boolean;
  hasBaasPartner?: boolean;
  hasOpenFinanceConsent?: boolean;
  hasOfficialPortalAccess?: boolean;
  hasOfficialApiProvider?: boolean;
};

export type AccountingOfferingCompanyAssessment = {
  status: 'OK';
  offeringId: string;
  offeringName: string;
  companyId?: string;
  decision: 'ACTIVATION_ALLOWED' | 'ASSISTED_REQUIRED' | 'BLOCKED';
  score: number;
  checks: {
    code: string;
    label: string;
    status: 'PASS' | 'WARN' | 'FAIL';
    message: string;
  }[];
  requiredActions: string[];
  generatedAt: string;
};

export type AccountingOfferingPortfolioAssessment = {
  status: 'OK';
  companyId?: string;
  assessments: AccountingOfferingCompanyAssessment[];
  actionQueue: {
    id: string;
    owner: AccountingOfferingActivationRequirement['owner'];
    priority: 'P0' | 'P1' | 'P2';
    action: string;
    impactedOfferings: string[];
  }[];
  ownerSummary: {
    owner: AccountingOfferingActivationRequirement['owner'];
    totalActions: number;
    p0: number;
    p1: number;
    p2: number;
    impactedOfferings: string[];
  }[];
  summary: {
    total: number;
    activationAllowed: number;
    assistedRequired: number;
    blocked: number;
    averageScore: number;
  };
  recommendedNextOffering?: {
    offeringId: string;
    offeringName: string;
    decision: AccountingOfferingCompanyAssessment['decision'];
    score: number;
  };
  generatedAt: string;
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
  setupReadiness: async (
    input: AccountingSetupReadinessInput = {},
  ): Promise<AccountingSetupReadinessResponse> => {
    const response = await api.get<AccountingSetupReadinessResponse>(
      '/accounting-platform/setup/readiness',
      {
        params: {
          ...input,
        },
      },
    );

    return response.data;
  },
  assessOffering: async (
    offeringId: string,
    profile: AccountingOfferingCompanyProfile,
  ): Promise<AccountingOfferingCompanyAssessment> => {
    const response = await api.get<AccountingOfferingCompanyAssessment>(
      `/accounting-platform/offerings/${offeringId}/assessment`,
      {
        params: {
          ...profile,
          cnae: profile.cnae ?? undefined,
        },
      },
    );

    return response.data;
  },
  assessOfferings: async (
    profile: AccountingOfferingCompanyProfile,
  ): Promise<AccountingOfferingPortfolioAssessment> => {
    const response = await api.get<AccountingOfferingPortfolioAssessment>(
      '/accounting-platform/offerings/assessment',
      {
        params: {
          ...profile,
          cnae: profile.cnae ?? undefined,
        },
      },
    );

    return response.data;
  },
};

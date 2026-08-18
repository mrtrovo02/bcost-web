'use strict';

import { api } from '@/services/api';
import { ServiceEvaluationInput } from './service-catalog';

export type OperationalWorkflowActor =
  | 'BCOST_SOFTWARE'
  | 'OFFICIAL_INTEGRATION'
  | 'BACKOFFICE_OPERATOR'
  | 'CRC_ACCOUNTANT'
  | 'CUSTOMER'
  | 'PUBLIC_AGENCY';

export type OperationalWorkflowStageStatus =
  | 'READY'
  | 'REQUIRES_INTEGRATION'
  | 'REQUIRES_BACKOFFICE'
  | 'REQUIRES_CUSTOMER'
  | 'REQUIRES_CRC';

export type OperationalWorkflowStage = {
  id: string;
  title: string;
  actor: OperationalWorkflowActor;
  status: OperationalWorkflowStageStatus;
  executionEngine: string;
  evidenceRequired: string[];
};

export type OperationalWorkflowPreview = {
  serviceId: string;
  serviceName: string;
  macroServiceId: number;
  macroServiceName: string;
  automationLevel: string;
  productionReadiness: string;
  operationalRisk: string;
  stages: OperationalWorkflowStage[];
  gates: {
    requiresCrcValidation: boolean;
    requiresOfficialCredential: boolean;
    requiresCustomerAction: boolean;
  };
  generatedAt: string;
};

export type OperationalWorkflowResponse = {
  status: 'OK';
  workflow: OperationalWorkflowPreview;
};

export const operationalWorkflowsApi = {
  preview: async (payload: ServiceEvaluationInput): Promise<OperationalWorkflowPreview> => {
    const response = await api.post<OperationalWorkflowResponse>(
      '/operations/workflows/preview',
      payload,
    );

    return response.data.workflow;
  },
};

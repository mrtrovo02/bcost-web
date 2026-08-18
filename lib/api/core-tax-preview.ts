'use strict';

import { api } from '@/services/api';

export type MonthlyTaxPreviewGateStatus = 'PASS' | 'WARN' | 'FAIL';
export type MonthlyTaxPreviewStatus = 'READY_TO_CLOSE' | 'REQUIRES_ACTION' | 'BLOCKED';

export type MonthlyTaxClosurePreview = {
  status: MonthlyTaxPreviewStatus;
  canClose: boolean;
  calculation: {
    period: string;
    companyName: string;
    revenue: number;
    rbt12: number;
    payroll: number;
    factorR: number;
    appliedAnexo: number;
    effectiveRate: number;
    taxAmount: number;
    updatedAt: string;
  };
  gates: {
    code: string;
    label: string;
    status: MonthlyTaxPreviewGateStatus;
    message: string;
  }[];
  evidenceRequired: string[];
  nextActions: string[];
  generatedAt: string;
};

export type MonthlyTaxGateParams = {
  month?: number;
  year?: number;
  hasDigitalCertificate?: boolean;
  hasCrcReview?: boolean;
  hasOfficialPortalAccess?: boolean;
  hasRevenueReconciliation?: boolean;
};

export type MonthlyTaxCloseResponse = {
  status: 'closed';
  obligation: unknown;
  snapshotId: string;
  integrityHash: string;
};

export const coreTaxPreviewApi = {
  monthlyClosurePreview: async (
    companyId: string,
    params: MonthlyTaxGateParams = {},
  ): Promise<MonthlyTaxClosurePreview> => {
    const response = await api.get<MonthlyTaxClosurePreview>(
      `/fiscal/tax/monthly-preview/${companyId}`,
      { params },
    );

    return response.data;
  },
  closeMonth: async (
    companyId: string,
    payload: MonthlyTaxGateParams,
  ): Promise<MonthlyTaxCloseResponse> => {
    const response = await api.post<MonthlyTaxCloseResponse>(
      `/fiscal/tax/close-month/${companyId}`,
      payload,
    );

    return response.data;
  },
};

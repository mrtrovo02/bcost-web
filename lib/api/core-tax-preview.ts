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

export const coreTaxPreviewApi = {
  monthlyClosurePreview: async (
    companyId: string,
    params: {
      month?: number;
      year?: number;
      hasDigitalCertificate?: boolean;
      hasCrcReview?: boolean;
      hasOfficialPortalAccess?: boolean;
      hasRevenueReconciliation?: boolean;
    } = {},
  ): Promise<MonthlyTaxClosurePreview> => {
    const response = await api.get<MonthlyTaxClosurePreview>(
      `/fiscal/tax/monthly-preview/${companyId}`,
      { params },
    );

    return response.data;
  },
};

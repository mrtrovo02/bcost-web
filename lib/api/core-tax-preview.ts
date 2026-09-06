'use strict';

import { api } from '@/services/api';
import { isRecord } from '@/lib/utils/runtime-guards';

export type MonthlyTaxPreviewGateStatus = 'PASS' | 'WARN' | 'FAIL';
export type MonthlyTaxPreviewStatus = 'READY_TO_CLOSE' | 'REQUIRES_ACTION' | 'BLOCKED';
export type MonthlyTaxEvidenceStatus = 'READY' | 'PENDING' | 'MISSING';
export type MonthlyTaxEvidenceSource = 'BCOST' | 'CUSTOMER' | 'GOVERNMENT_PORTAL' | 'CRC';

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
  evidencePacket: {
    id: string;
    closureProtocol: string;
    integrityHash: string;
    requiredArtifacts: {
      code: string;
      label: string;
      status: MonthlyTaxEvidenceStatus;
      source: MonthlyTaxEvidenceSource;
    }[];
  };
  nextActions: string[];
  generatedAt: string;
};

export type TaxObligationSummary = {
  id: string;
  companyId: string;
  name: string;
  dueDate: string;
  amount: string | number;
  status: string;
  fileUrl?: string | null;
  createdAt?: string;
  version?: number;
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
  obligation: TaxObligationSummary;
  auditTrail: {
    closureProtocol: string;
    evidencePacketId: string;
    integrityHash: string;
    period: string;
    generatedAt: string;
  };
  officialEvidence: {
    pendingArtifacts: string[];
    message: string;
  };
  snapshotId: string;
  integrityHash: string;
};

function readString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeObligation(value: unknown): TaxObligationSummary {
  if (!isRecord(value)) {
    return {
      id: 'unknown-obligation',
      companyId: '',
      name: 'Obrigação fiscal gerada',
      dueDate: '',
      amount: 0,
      status: 'PENDING',
    };
  }

  return {
    id: readString(value.id, 'unknown-obligation'),
    companyId: readString(value.companyId),
    name: readString(value.name, 'Obrigação fiscal gerada'),
    dueDate: readString(value.dueDate),
    amount:
      typeof value.amount === 'number' || typeof value.amount === 'string'
        ? value.amount
        : 0,
    status: readString(value.status, 'PENDING'),
    fileUrl: typeof value.fileUrl === 'string' ? value.fileUrl : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
    version: typeof value.version === 'number' ? value.version : undefined,
  };
}

function normalizeCloseResponse(payload: unknown): MonthlyTaxCloseResponse {
  const body = isRecord(payload) ? payload : {};
  const obligation = normalizeObligation(body.obligation);
  const auditTrail = isRecord(body.auditTrail) ? body.auditTrail : {};
  const officialEvidence = isRecord(body.officialEvidence)
    ? body.officialEvidence
    : {};
  const period = readString(auditTrail.period);
  const snapshotId = readString(body.snapshotId);
  const integrityHash = readString(body.integrityHash);
  const closureProtocol = readString(
    auditTrail.closureProtocol,
    snapshotId ? `BCOST-TAX-LEGACY-${snapshotId.slice(0, 12)}` : 'BCOST-TAX-LEGACY-PENDING',
  );

  return {
    status: 'closed',
    obligation,
    auditTrail: {
      closureProtocol,
      evidencePacketId: readString(auditTrail.evidencePacketId, closureProtocol),
      integrityHash: readString(auditTrail.integrityHash, integrityHash),
      period,
      generatedAt: readString(auditTrail.generatedAt, new Date().toISOString()),
    },
    officialEvidence: {
      pendingArtifacts: readStringArray(officialEvidence.pendingArtifacts),
      message: readString(
        officialEvidence.message,
        'Fechamento registrado. Confirme recibo PGDAS-D e guia DAS oficiais antes de concluir o dossiê.',
      ),
    },
    snapshotId,
    integrityHash,
  };
}

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

    return normalizeCloseResponse(response.data);
  },
};

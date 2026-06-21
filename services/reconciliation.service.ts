'use strict';

import { api } from './api';

export type ManualReconciliationPayload = {
  companyId?: string;
  bankTransactionId?: string;
  invoiceId?: string;
  taxObligationId?: string;
  amount?: number;
  notes?: string;
  [key: string]: unknown;
};

export type ReconciliationQueryParams = {
  companyId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
};

function authHeaders(token?: string | null) {
  if (!token) return undefined;

  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Nome legado usado por app/hooks/use-reconciliation.ts.
 *
 * Compatibilidade mantida:
 * - triggerAutoMatchApi(companyId)
 * - triggerAutoMatchApi(companyId, token)
 */
export async function triggerAutoMatchApi(companyId: string, token?: string | null) {
  const response = await api.post(`/reconciliation/auto/${companyId}`, undefined, {
    headers: authHeaders(token),
  });

  return response.data;
}

/**
 * Alias novo, mais descritivo.
 */
export async function runAutoReconciliation(companyId: string, token?: string | null) {
  return triggerAutoMatchApi(companyId, token);
}

/**
 * Compatibilidade com possíveis imports antigos.
 */
export async function triggerAutoMatch(companyId: string, token?: string | null) {
  return triggerAutoMatchApi(companyId, token);
}

/**
 * Resumo da conciliação por empresa.
 */
export async function getReconciliationSummary(companyId: string, token?: string | null) {
  const response = await api.get(`/reconciliation/summary/${companyId}`, {
    headers: authHeaders(token),
  });

  return response.data;
}

/**
 * Desfazer conciliação.
 */
export async function undoReconciliation(bankTransactionId: string, token?: string | null) {
  const response = await api.delete(`/reconciliation/undo/${bankTransactionId}`, {
    headers: authHeaders(token),
  });

  return response.data;
}

/**
 * Compatibilidade com possível nome antigo.
 */
export async function undoMatchApi(bankTransactionId: string, token?: string | null) {
  return undoReconciliation(bankTransactionId, token);
}

/**
 * Conciliação manual.
 */
export async function manualReconciliation(
  payload: ManualReconciliationPayload,
  token?: string | null,
) {
  const response = await api.post('/reconciliation/manual', payload, {
    headers: authHeaders(token),
  });

  return response.data;
}

/**
 * Compatibilidade com possível nome antigo.
 */
export async function manualReconciliationApi(
  payload: ManualReconciliationPayload,
  token?: string | null,
) {
  return manualReconciliation(payload, token);
}

/**
 * Consulta avançada de conciliações.
 */
export async function queryReconciliation(
  params?: ReconciliationQueryParams,
  token?: string | null,
) {
  const response = await api.get('/reconciliation/query', {
    params,
    headers: authHeaders(token),
  });

  return response.data;
}

/**
 * Compatibilidade com possível nome antigo.
 */
export async function queryReconciliationApi(
  params?: ReconciliationQueryParams,
  token?: string | null,
) {
  return queryReconciliation(params, token);
}

export const reconciliationService = {
  triggerAutoMatchApi,
  triggerAutoMatch,
  runAutoReconciliation,
  getReconciliationSummary,
  undoReconciliation,
  undoMatchApi,
  manualReconciliation,
  manualReconciliationApi,
  queryReconciliation,
  queryReconciliationApi,
};

export default reconciliationService;

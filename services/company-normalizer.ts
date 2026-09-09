'use strict';

export type NormalizedCompany = {
  id: string;
  name: string;
  cnpj: string;
  taxRegime?: string;
  cnae?: string | null;
  anexo?: number | null;
  role?: string;
  status?: string;
  plan?: string;
  createdAt?: string;
  active?: boolean;
  planLevel?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function firstBoolean(...values: unknown[]): boolean | undefined {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }
  }

  return undefined;
}

function optionalString(...values: unknown[]): string | undefined {
  return firstString(...values) ?? undefined;
}

function normalizeCompanyEntry(value: unknown): NormalizedCompany | null {
  if (!isRecord(value)) return null;

  const nestedCompany = isRecord(value.company) ? value.company : null;
  const source = nestedCompany ?? value;
  const id = firstString(source.id, value.companyId, value.company_id);

  if (!id) return null;

  return {
    id,
    name:
      firstString(source.name, source.razaoSocial, source.legalName, value.companyName) ??
      'Empresa vinculada',
    cnpj: firstString(source.cnpj, source.document, source.documentNumber, source.taxId) ?? '',
    taxRegime: optionalString(source.taxRegime, source.regimeTributario),
    cnae: optionalString(source.cnae, source.primaryCnae),
    anexo: firstNumber(source.anexo),
    role: optionalString(value.role, source.role),
    status: optionalString(source.status, value.status),
    plan: optionalString(source.plan, value.plan),
    createdAt: optionalString(source.createdAt, value.createdAt),
    active: firstBoolean(source.active, value.active),
    planLevel: optionalString(source.planLevel, source.plan_level, value.planLevel),
  };
}

export function normalizeCompanyPayload(payload: unknown): NormalizedCompany[] {
  if (Array.isArray(payload)) {
    return payload
      .map(normalizeCompanyEntry)
      .filter((company): company is NormalizedCompany => Boolean(company));
  }

  if (!isRecord(payload)) return [];

  for (const key of [
    'data',
    'companies',
    'companyUsers',
    'memberships',
    'linkedCompanies',
    'items',
    'records',
  ]) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return normalizeCompanyPayload(value);
    }
  }

  if (isRecord(payload.data)) {
    const dataCompanies = normalizeCompanyPayload(payload.data);
    if (dataCompanies.length > 0) {
      return dataCompanies;
    }
  }

  if (isRecord(payload.user)) {
    const userCompanies = normalizeCompanyPayload(payload.user);
    if (userCompanies.length > 0) {
      return userCompanies;
    }
  }

  const singleCompany = normalizeCompanyEntry(payload);
  return singleCompany ? [singleCompany] : [];
}

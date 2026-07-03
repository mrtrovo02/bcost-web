'use strict';

import {
  bcostSchemaModules,
  type BcostSchemaModule,
  type BcostModuleStatus,
} from '@/lib/product/schema-modules';
import type { EnterpriseModulePayload } from '@/lib/api/enterprise';
import type {
  EnterpriseModuleRecord,
  EnterpriseModuleResponse,
} from '@/lib/api/enterprise-universal';

const DEMO_COMPANY_ID = 'demo-001';

type DemoParams = {
  limit?: number;
  offset?: number;
  search?: string;
};

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function money(seed: number) {
  return 1250 * seed + 9800;
}

function normalizeSearch(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function moduleInfo(slug: string): BcostSchemaModule {
  return (
    bcostSchemaModules.find((item) => item.slug === slug) ?? {
      slug,
      title: slug,
      model: slug,
      area: 'SaaS',
      status: 'PLANNED',
      priority: 'MEDIUM',
      description: 'Módulo enterprise mapeado no catálogo bCost.',
      commercialValue: 'Disponibiliza cobertura operacional no painel enterprise.',
      route: `/dashboard/modules/${slug}`,
      mainActions: ['Consultar', 'Atualizar', 'Exportar'],
      kpis: ['Total', 'Pendentes', 'Concluídos'],
    }
  );
}

function statusFor(index: number) {
  return ['ACTIVE', 'PENDING', 'COMPLETED', 'ATTENTION'][index % 4];
}

function buildGenericRecords(module: BcostSchemaModule): EnterpriseModuleRecord[] {
  return Array.from({ length: 6 }, (_, index) => {
    const item = index + 1;

    return {
      id: `${module.slug}-${String(item).padStart(3, '0')}`,
      name: `${module.title} ${item}`,
      title: module.mainActions[index % module.mainActions.length] ?? module.title,
      description: module.description,
      module: module.title,
      area: module.area,
      model: module.model,
      status: statusFor(index),
      priority: module.priority,
      amount: money(item),
      dueDate: daysFromNow(item * 4),
      updatedAt: daysFromNow(-item),
      owner: item % 2 === 0 ? 'Operação Fiscal' : 'Equipe Contábil',
    };
  });
}

function buildAutomationRecords(module: BcostSchemaModule): EnterpriseModuleRecord[] {
  return [
    {
      id: 'job-001',
      name: 'Importação XML e classificação fiscal',
      type: 'XML_IMPORT',
      status: 'COMPLETED',
      progress: 100,
      attempts: 1,
      payload: { source: 'upload-xml', companyId: DEMO_COMPANY_ID },
      result: { imported: 128, classified: 126, pendingReview: 2 },
      createdAt: daysFromNow(-2),
      startedAt: daysFromNow(-2),
      finishedAt: daysFromNow(-2),
      companyId: DEMO_COMPANY_ID,
    },
    {
      id: 'job-002',
      name: 'Conciliação bancária assistida',
      type: 'BANK_RECONCILIATION',
      status: 'RUNNING',
      progress: 72,
      attempts: 1,
      payload: { accounts: 3, period: '2026-07' },
      result: { matched: 84, pending: 19 },
      createdAt: daysFromNow(-1),
      startedAt: daysFromNow(-1),
      finishedAt: null,
      companyId: DEMO_COMPANY_ID,
    },
    {
      id: 'job-003',
      name: 'Agenda de obrigações fiscais',
      type: 'COMPLIANCE_CALENDAR',
      status: 'QUEUED',
      progress: 0,
      attempts: 0,
      payload: { obligations: ['DAS', 'DCTFWeb', 'REINF'] },
      result: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      companyId: DEMO_COMPANY_ID,
    },
  ];
}

function buildRecords(module: BcostSchemaModule): EnterpriseModuleRecord[] {
  if (module.slug === 'automation-jobs') {
    return buildAutomationRecords(module);
  }

  if (module.slug === 'accounting-entries') {
    return buildGenericRecords(module).map((item, index) => ({
      ...item,
      debitAccount: index % 2 === 0 ? '1.1.1.01 Caixa e Bancos' : '3.1.1.01 Receita de Serviços',
      creditAccount: index % 2 === 0 ? '3.1.1.01 Receita de Serviços' : '1.1.1.01 Caixa e Bancos',
      source: index % 2 === 0 ? 'AUTOMATIC' : 'MANUAL',
    }));
  }

  if (module.area === 'Fiscal') {
    return buildGenericRecords(module).map((item, index) => ({
      ...item,
      competence: `2026-${String((index % 12) + 1).padStart(2, '0')}`,
      taxType: ['Simples Nacional', 'ICMS', 'ISS', 'PIS/COFINS'][index % 4],
      receipt: index % 3 === 0 ? 'Pendente' : `REC-${module.slug}-${index + 1}`,
    }));
  }

  if (module.area === 'Folha') {
    return buildGenericRecords(module).map((item, index) => ({
      ...item,
      employee: ['Ana Oliveira', 'Carlos Silva', 'Juliana Costa', 'Roberto Lima'][index % 4],
      grossSalary: money(index + 2),
      charges: money(index + 1) * 0.28,
    }));
  }

  if (module.area === 'Banking' || module.area === 'Financeiro') {
    return buildGenericRecords(module).map((item, index) => ({
      ...item,
      type: index % 2 === 0 ? 'CREDIT' : 'DEBIT',
      reconciled: index % 3 !== 0,
      cashImpact: money(index + 3),
    }));
  }

  return buildGenericRecords(module);
}

function filterRecords(records: EnterpriseModuleRecord[], search?: string) {
  const term = normalizeSearch(search);
  if (!term) return records;

  return records.filter((record) => JSON.stringify(record).toLowerCase().includes(term));
}

function summarize(records: EnterpriseModuleRecord[], module: BcostSchemaModule) {
  const status = records.reduce<Record<string, number>>((acc, record) => {
    const key = String(record.status ?? 'UNKNOWN');
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const totalAmount = records.reduce((sum, record) => {
    const amount = Number(record.amount ?? record.cashImpact ?? 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  return {
    fallback: true,
    mode: 'DEMO_OPERATIONAL',
    area: module.area,
    priority: module.priority,
    status,
    totals: {
      totalAmount,
    },
    message:
      'Dados demonstrativos exibidos porque a API real ainda não respondeu com dados válidos para este módulo.',
  };
}

export function getDemoEnterpriseCompanyId() {
  return DEMO_COMPANY_ID;
}

export function createDemoEnterpriseResponse(
  slug: string,
  companyId = DEMO_COMPANY_ID,
  params?: DemoParams,
): EnterpriseModuleResponse {
  const module = moduleInfo(slug);
  const allRecords = filterRecords(buildRecords(module), params?.search);
  const offset = params?.offset ?? 0;
  const limit = params?.limit ?? 100;
  const items = allRecords.slice(offset, offset + limit);

  return {
    slug,
    model: module.model,
    label: module.title,
    companyId,
    status: 'OK_WITH_FALLBACK',
    items,
    total: allRecords.length,
    limit,
    offset,
    hasMore: offset + limit < allRecords.length,
    summary: summarize(allRecords, module),
    generatedAt: new Date().toISOString(),
  };
}

export function createDemoEnterprisePayload(
  module: BcostSchemaModule,
  endpoint: string | null,
  status: BcostModuleStatus = module.status,
): EnterpriseModulePayload {
  const records = buildRecords(module);

  return {
    slug: module.slug,
    title: module.title,
    status,
    endpoint,
    connected: false,
    records,
    summary: summarize(records, module),
    raw: {
      fallback: true,
      records,
      summary: summarize(records, module),
    },
    message:
      'Módulo operacional em modo demonstração. Conecte o endpoint backend para substituir estes dados por dados reais.',
    generatedAt: new Date().toISOString(),
  };
}

export function createDemoEnterpriseCatalog() {
  return bcostSchemaModules.map((module) => ({
    slug: module.slug,
    model: module.model,
    label: module.title,
  }));
}

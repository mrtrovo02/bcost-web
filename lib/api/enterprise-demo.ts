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

type DemoRoadmapBoundary =
  | 'SOFTWARE_ONLY'
  | 'ASSISTED_AUTOMATION'
  | 'CRC_VALIDATED'
  | 'HUMAN_LED';

const NON_PRISMA_ROADMAP_MODULE_SLUGS = new Set([
  'finance-operations',
  'operational-workflows',
  'command-center',
  'audit-intelligence',
  'tax-scenarios',
  'company-formation',
]);

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

function isRoadmapModule(module: BcostSchemaModule): boolean {
  return (
    module.status === 'PLANNED' ||
    NON_PRISMA_ROADMAP_MODULE_SLUGS.has(module.slug)
  );
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

function buildAutomationRecords(): EnterpriseModuleRecord[] {
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
    return buildAutomationRecords();
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

function roadmapCanonicalOwner(module: BcostSchemaModule): string {
  if (module.slug === 'finance-operations') return 'finance-operations-enterprise';
  if (module.slug === 'operational-workflows') return 'operational-workflows';
  if (module.slug === 'command-center') return 'command-center-enterprise';
  if (module.slug === 'audit-intelligence') return 'audit-intelligence-enterprise';
  if (module.slug === 'company-formation') return 'accounting-platform';
  if (module.slug === 'banking-products') return 'banking-enterprise';
  if (module.slug === 'tax-scenarios') return 'tax-scenarios';

  if (module.area === 'Contábil' || module.area === 'Patrimônio') {
    return 'accounting-enterprise';
  }

  if (module.area === 'Fiscal') return 'fiscal-obligations-enterprise';
  if (module.area === 'Folha') return 'payroll-enterprise';

  if (module.area === 'Escritório') {
    return module.slug === 'document-management' ? 'document-management' : 'accounting-platform';
  }

  if (module.area === 'Consultoria') return 'accounting-platform';

  return 'enterprise-roadmap';
}

function roadmapBoundary(module: BcostSchemaModule): DemoRoadmapBoundary {
  if (module.slug === 'command-center' || module.slug === 'audit-intelligence') {
    return 'SOFTWARE_ONLY';
  }

  if (module.slug === 'operational-workflows' || module.slug === 'tax-scenarios') {
    return 'ASSISTED_AUTOMATION';
  }

  if (module.slug === 'company-formation') return 'CRC_VALIDATED';
  if (module.slug === 'banking-products') return 'ASSISTED_AUTOMATION';

  if (
    module.area === 'Contábil' ||
    module.area === 'Fiscal' ||
    module.area === 'Folha' ||
    module.area === 'Patrimônio'
  ) {
    return 'CRC_VALIDATED';
  }

  if (module.area === 'Consultoria') return 'HUMAN_LED';

  return 'ASSISTED_AUTOMATION';
}

function roadmapGuardrails(module: BcostSchemaModule, boundary: DemoRoadmapBoundary): string[] {
  if (module.slug === 'operational-workflows') {
    return [
      'Workflows reais devem gerar dossiê operacional, responsável interno e trilha de auditoria antes de qualquer protocolo externo.',
      'Toda automação que dependa de portal público, certificado digital ou robô deve expor status, evidência e etapa de validação humana quando aplicável.',
    ];
  }

  if (module.slug === 'tax-scenarios') {
    return [
      'Simulações tributárias são estimativas gerenciais e devem explicitar premissas, período, regime comparado e evidência de revisão quando usadas comercialmente.',
      'Cenários de Reforma Tributária, Fator R, Simples Nacional, Lucro Presumido e Lucro Real devem manter trilha de premissas antes de orientar migração de regime.',
    ];
  }

  if (module.slug === 'company-formation') {
    return [
      'Não prometer abertura 100% automática sem consulta de viabilidade, CRC responsável e evidências do órgão oficial.',
      'Toda execução real deve abrir dossiê auditável e workflow operacional por empresa antes de protocolo em Redesim, Junta ou Prefeitura.',
    ];
  }

  if (module.slug === 'banking-products') {
    return [
      'Não ativar Conta PJ, PIX, boleto ou cartão sem parceiro BaaS homologado, contrato comercial e trilha de consentimento.',
      'Toda conciliação real deve usar extrato autorizado, evidência auditável e vínculo com empresa/tenant antes de gerar lançamento contábil.',
    ];
  }

  if (module.area === 'Contábil' || module.area === 'Patrimônio') {
    return [
      'Não emitir demonstração contábil oficial sem escrituração fechada, evidências conciliadas e validação de contador responsável.',
      'Toda geração de livro, balanço, DRE, razão ou ativo deve manter trilha de auditoria, competência e vínculo com a empresa/tenant.',
    ];
  }

  if (module.area === 'Fiscal') {
    return [
      'Não declarar guia, SPED ou obrigação acessória como transmitida sem protocolo oficial, certificado válido e evidência arquivada.',
      'Apurações fiscais em roadmap devem permanecer como prévia assistida até integração com portal oficial, RPA governado ou API homologada.',
    ];
  }

  if (module.area === 'Folha') {
    return [
      'Não transmitir eSocial, FGTS Digital, DCTFWeb ou eventos trabalhistas sem conferência de folha, certificado válido e protocolo oficial.',
      'Pró-labore, INSS, FGTS e eventos de SST exigem evidência por competência e aprovação operacional antes de comunicação ao cliente.',
    ];
  }

  if (module.area === 'Automação') {
    return [
      'Automação pode classificar, priorizar e orquestrar ações, mas não substitui aprovação humana em atos oficiais regulados.',
      'Toda recomendação executada deve registrar auditoria, origem do sinal, empresa/tenant e resultado verificável.',
    ];
  }

  if (module.area === 'Consultoria') {
    return [
      'Consultoria e BPO são serviços liderados por especialistas; software organiza escopo, evidências, SLA e aprovação do cliente.',
      'Não gerar recomendação tributária final sem revisão técnica e registro das premissas usadas na análise.',
    ];
  }

  return [
    `Módulo em ${boundary}; manter contrato técnico, auditoria e escopo explícito antes de venda em produção.`,
  ];
}

function summarizeRoadmap(module: BcostSchemaModule) {
  const boundary = roadmapBoundary(module);

  return {
    fallback: true,
    roadmap: true,
    mode: 'DEMO_ROADMAP',
    area: module.area,
    priority: module.priority,
    endpoint: module.apiBase ?? null,
    canonicalOwner: roadmapCanonicalOwner(module),
    automationBoundary: boundary,
    operationalGuardrails: roadmapGuardrails(module, boundary),
    nextStep:
      'Criar modelo persistente, endpoints CRUD, auditoria e regras de permissão para este módulo.',
    message:
      'Módulo demonstrativo em roadmap técnico; sem dados fictícios para evitar confusão com execução real.',
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
  const schemaModule = moduleInfo(slug);

  if (isRoadmapModule(schemaModule)) {
    return {
      slug,
      model: schemaModule.model,
      label: schemaModule.title,
      companyId,
      status: 'OK_ROADMAP',
      items: [],
      total: 0,
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
      hasMore: false,
      summary: summarizeRoadmap(schemaModule),
      generatedAt: new Date().toISOString(),
    };
  }

  const allRecords = filterRecords(buildRecords(schemaModule), params?.search);
  const offset = params?.offset ?? 0;
  const limit = params?.limit ?? 100;
  const items = allRecords.slice(offset, offset + limit);

  return {
    slug,
    model: schemaModule.model,
    label: schemaModule.title,
    companyId,
    status: 'OK_WITH_FALLBACK',
    items,
    total: allRecords.length,
    limit,
    offset,
    hasMore: offset + limit < allRecords.length,
    summary: summarize(allRecords, schemaModule),
    generatedAt: new Date().toISOString(),
  };
}

export function createDemoEnterprisePayload(
  schemaModule: BcostSchemaModule,
  endpoint: string | null,
  status: BcostModuleStatus = schemaModule.status,
): EnterpriseModulePayload {
  const records = buildRecords(schemaModule);

  return {
    slug: schemaModule.slug,
    title: schemaModule.title,
    status,
    endpoint,
    connected: false,
    records,
    summary: summarize(records, schemaModule),
    raw: {
      fallback: true,
      records,
      summary: summarize(records, schemaModule),
    },
    message:
      'Módulo operacional em modo demonstração. Conecte o endpoint backend para substituir estes dados por dados reais.',
    generatedAt: new Date().toISOString(),
  };
}

export function createDemoEnterpriseCatalog() {
  return bcostSchemaModules.map((module) => {
    if (isRoadmapModule(module)) {
      const boundary = roadmapBoundary(module);

      return {
        slug: module.slug,
        model: module.model,
        label: module.title,
        persistence: 'ROADMAP' as const,
        endpoint: module.apiBase ?? `/enterprise/modules/${module.slug}/:companyId`,
        area: module.area,
        priority: module.priority,
        canonicalOwner: roadmapCanonicalOwner(module),
        automationBoundary: boundary,
        operationalGuardrails: roadmapGuardrails(module, boundary),
      };
    }

    return {
      slug: module.slug,
      model: module.model,
      label: module.title,
      persistence: 'PRISMA' as const,
      endpoint: `/enterprise/modules/${module.slug}/:companyId`,
      canonicalOwner: 'enterprise-modules',
      automationBoundary: 'SOFTWARE_ONLY' as const,
      operationalGuardrails: [
        'Endpoint persistido exige autenticação JWT, empresa válida e filtros por companyId antes de expor dados.',
      ],
    };
  });
}

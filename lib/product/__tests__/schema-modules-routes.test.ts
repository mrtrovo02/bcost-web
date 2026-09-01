import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  bcostSchemaModules,
  getAreaMarketSummaries,
  getModuleCommercialActionLabel,
  getModuleMarketReadiness,
  getModuleMarketReadinessLabel,
  getModulesByArea,
  getModuleStats,
  getSellableModules,
  sortModulesByMarketPriority,
} from '../schema-modules';

function routeHasPage(route: string) {
  const appDir = path.join(process.cwd(), 'app');
  const relativeRoute = route.replace(/^\//, '');
  const staticPage = path.join(appDir, relativeRoute, 'page.tsx');

  if (existsSync(staticPage)) return true;

  if (route.startsWith('/dashboard/modules/')) {
    return existsSync(path.join(appDir, 'dashboard', 'modules', '[slug]', 'page.tsx'));
  }

  if (route.startsWith('/dashboard/enterprise/modules/')) {
    return existsSync(path.join(appDir, 'dashboard', 'enterprise', 'modules', '[slug]', 'page.tsx'));
  }

  return false;
}

describe('bcostSchemaModules routes', () => {
  it('usa slugs unicos', () => {
    const slugs = bcostSchemaModules.map((module) => module.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('aponta todas as rotas internas para paginas existentes ou rotas dinamicas cobertas', () => {
    const missingRoutes = bcostSchemaModules
      .map((module) => module.route)
      .filter((route) => route.startsWith('/'))
      .filter((route) => !routeHasPage(route));

    expect(missingRoutes).toEqual([]);
  });

  it('usa a pagina estatica do modulo quando ela existe', () => {
    const appDir = path.join(process.cwd(), 'app');
    const modulesWithStaticPages = bcostSchemaModules
      .filter((module) =>
        existsSync(path.join(appDir, 'dashboard', 'modules', module.slug, 'page.tsx')),
      )
      .filter((module) => module.route.startsWith('/dashboard/modules/'));

    expect(modulesWithStaticPages.length).toBeGreaterThan(0);

    for (const schemaModule of modulesWithStaticPages) {
      expect(schemaModule.route).toBe(`/dashboard/modules/${schemaModule.slug}`);
    }
  });

  it('mantem a rota enterprise legada coberta por redirecionamento', () => {
    const legacyWrapper = path.join(
      process.cwd(),
      'app',
      'dashboard',
      'enterprise',
      'modules',
      '[slug]',
      'page.tsx',
    );

    expect(existsSync(legacyWrapper)).toBe(true);
  });

  it('mantem apiBase alinhado aos endpoints enterprise canonicos', () => {
    const apiBaseBySlug = Object.fromEntries(
      bcostSchemaModules.map((schemaModule) => [schemaModule.slug, schemaModule.apiBase]),
    );

    expect(apiBaseBySlug['account-plan']).toBe('/accounting/enterprise/account-plan');
    expect(apiBaseBySlug['accounting-entries']).toBe('/accounting/enterprise/entries');
    expect(apiBaseBySlug['balance-locks']).toBe('/accounting/enterprise/locks');
    expect(apiBaseBySlug.employees).toBe('/payroll/enterprise/employees');
    expect(apiBaseBySlug['payroll-entries']).toBe('/payroll/enterprise/entries');
    expect(apiBaseBySlug['tax-obligations']).toBe('/obligations/enterprise/tax');
    expect(apiBaseBySlug['fiscal-obligations']).toBe('/obligations/enterprise/fiscal');
    expect(apiBaseBySlug['company-formation']).toBe('/accounting-platform/setup/readiness');
    expect(apiBaseBySlug['banking-products']).toBe('/banking/enterprise/products');
  });

  it('mantem a pagina enterprise com linguagem comercial sem fallback demonstrativo', () => {
    const pageSource = readFileSync(
      path.join(process.cwd(), 'app', 'dashboard', 'enterprise', 'page.tsx'),
      'utf8',
    );

    expect(pageSource).toContain('getModuleMarketReadinessLabel');
    expect(getModuleMarketReadinessLabel('ACTIVE')).toBe('Vendável');
    expect(getModuleMarketReadinessLabel('INTEGRATING')).toBe('Beta assistido');
    expect(getModuleMarketReadinessLabel('PLANNED')).toBe('Roadmap bloqueado');
    expect(pageSource.toLowerCase()).not.toContain('fallback');
  });

  it('deriva maturidade comercial sem permitir venda direta de roadmap', () => {
    expect(getModuleMarketReadiness('ACTIVE')).toBe('SELLABLE');
    expect(getModuleMarketReadiness('INTEGRATING')).toBe('ASSISTED_BETA');
    expect(getModuleMarketReadiness('PLANNED')).toBe('ROADMAP_LOCKED');
    expect(getModuleMarketReadinessLabel('ACTIVE')).toBe('Vendável');
    expect(getModuleMarketReadinessLabel('INTEGRATING')).toBe('Beta assistido');
    expect(getModuleMarketReadinessLabel('PLANNED')).toBe('Roadmap bloqueado');
    expect(getModuleCommercialActionLabel('ACTIVE')).toBe('Abrir módulo');
    expect(getModuleCommercialActionLabel('INTEGRATING')).toBe('Ver escopo assistido');
    expect(getModuleCommercialActionLabel('PLANNED')).toBe('Ver roadmap');
  });

  it('mantem estatisticas de mercado coerentes com o catalogo', () => {
    const stats = getModuleStats();
    const sellable = bcostSchemaModules.filter((module) => module.status === 'ACTIVE').length;
    const assistedBeta = bcostSchemaModules.filter(
      (module) => module.status === 'INTEGRATING',
    ).length;
    const roadmapLocked = bcostSchemaModules.filter(
      (module) => module.status === 'PLANNED',
    ).length;

    expect(stats.sellable).toBe(sellable);
    expect(stats.assistedBeta).toBe(assistedBeta);
    expect(stats.roadmapLocked).toBe(roadmapLocked);
    expect(stats.sellable + stats.assistedBeta + stats.roadmapLocked).toBe(stats.total);
  });

  it('mantem a prateleira vendavel restrita a modulos ativos com rota e api', () => {
    const sellableModules = getSellableModules();

    expect(sellableModules.length).toBeGreaterThan(0);

    for (const module of sellableModules) {
      expect(module.status).toBe('ACTIVE');
      expect(module.route).toMatch(/^\/dashboard\//);
      expect(module.apiBase).toMatch(/^\/[a-z0-9/-]+$/);
      expect(routeHasPage(module.route)).toBe(true);
    }
  });

  it('mantem catalogo universal enriquecido com maturidade comercial', async () => {
    const { createDemoEnterpriseCatalog } = await import('@/lib/api/enterprise-demo');
    const catalog = createDemoEnterpriseCatalog();
    const readinessBySlug = Object.fromEntries(
      catalog.map((module) => [module.slug, module.marketReadiness]),
    );

    for (const module of bcostSchemaModules) {
      expect(readinessBySlug[module.slug]).toBe(getModuleMarketReadiness(module.status));
    }
  });

  it('ordena modulos por prontidao comercial, prioridade e titulo', () => {
    const sorted = sortModulesByMarketPriority([
      {
        slug: 'z-roadmap',
        title: 'Z Roadmap',
        model: 'Roadmap',
        area: 'SaaS',
        status: 'PLANNED',
        priority: 'CRITICAL',
        description: 'Roadmap',
        commercialValue: 'Roadmap',
        route: '/dashboard/modules/z-roadmap',
        apiBase: '/roadmap/z',
        mainActions: ['Ver'],
        kpis: ['Status'],
      },
      {
        slug: 'b-sellable',
        title: 'B Vendavel',
        model: 'Sellable',
        area: 'SaaS',
        status: 'ACTIVE',
        priority: 'HIGH',
        description: 'Vendavel',
        commercialValue: 'Vendavel',
        route: '/dashboard/modules/b-sellable',
        apiBase: '/sellable/b',
        mainActions: ['Abrir'],
        kpis: ['Status'],
      },
      {
        slug: 'a-sellable',
        title: 'A Vendavel',
        model: 'Sellable',
        area: 'SaaS',
        status: 'ACTIVE',
        priority: 'CRITICAL',
        description: 'Vendavel',
        commercialValue: 'Vendavel',
        route: '/dashboard/modules/a-sellable',
        apiBase: '/sellable/a',
        mainActions: ['Abrir'],
        kpis: ['Status'],
      },
    ]);

    expect(sorted.map((module) => module.slug)).toEqual([
      'a-sellable',
      'b-sellable',
      'z-roadmap',
    ]);
  });

  it('lista areas ja ordenadas para a vitrine enterprise', () => {
    const fiscalModules = getModulesByArea('Fiscal');
    const firstRoadmapIndex = fiscalModules.findIndex((module) => module.status === 'PLANNED');
    const lastSellableIndex = fiscalModules.reduce(
      (lastIndex, module, index) => (module.status === 'ACTIVE' ? index : lastIndex),
      -1,
    );

    if (firstRoadmapIndex !== -1 && lastSellableIndex !== -1) {
      expect(lastSellableIndex).toBeLessThan(firstRoadmapIndex);
    }
  });

  it('mantem resumo comercial por area coerente com o catalogo enterprise', () => {
    const summaries = getAreaMarketSummaries();
    const summarizedTotal = summaries.reduce((total, summary) => total + summary.total, 0);

    expect(summaries.length).toBeGreaterThan(0);
    expect(summarizedTotal).toBe(bcostSchemaModules.length);

    for (const summary of summaries) {
      const modulesByArea = bcostSchemaModules.filter((module) => module.area === summary.area);
      const sellable = modulesByArea.filter((module) => module.status === 'ACTIVE').length;
      const assistedBeta = modulesByArea.filter((module) => module.status === 'INTEGRATING').length;
      const roadmapLocked = modulesByArea.filter((module) => module.status === 'PLANNED').length;
      const critical = modulesByArea.filter((module) => module.priority === 'CRITICAL').length;

      expect(summary.total).toBe(modulesByArea.length);
      expect(summary.sellable).toBe(sellable);
      expect(summary.assistedBeta).toBe(assistedBeta);
      expect(summary.roadmapLocked).toBe(roadmapLocked);
      expect(summary.critical).toBe(critical);
      expect(summary.sellable + summary.assistedBeta + summary.roadmapLocked).toBe(
        summary.total,
      );
    }
  });
});

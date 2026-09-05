import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import enterpriseUniversalApi, {
  createEnterpriseCommercialLanesFromCatalog,
} from '../enterprise-universal';
import { api, isDemoSession } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
  getActiveCompanyId: vi.fn(() => null),
  getToken: vi.fn(() => null),
  isDemoSession: vi.fn(() => false),
  setActiveCompanyId: vi.fn(),
}));

const apiGetMock = vi.mocked(api.get);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('enterpriseUniversalApi', () => {
  const originalDemoFallback = process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK;

  beforeEach(() => {
    vi.clearAllMocks();
    enterpriseUniversalApi.clearCatalogCache();
    isDemoSessionMock.mockReturnValue(false);
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
  });

  afterEach(() => {
    if (originalDemoFallback === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = originalDemoFallback;
    }
  });

  it('does not return module demo data for real companies when the endpoint is unavailable', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 404 } });

    await expect(enterpriseUniversalApi.getModule('users', 'company-123')).rejects.toThrow(
      'Modulo enterprise indisponivel e fallback demonstrativo desabilitado neste ambiente.',
    );
  });

  it('returns enriched catalog metadata when the enterprise catalog endpoint is unavailable', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 404 } });

    const catalog = await enterpriseUniversalApi.catalog();
    const bankingProducts = catalog.find((item) => item.slug === 'banking-products');
    const companies = catalog.find((item) => item.slug === 'companies');

    expect(bankingProducts).toMatchObject({
      persistence: 'ROADMAP',
      endpoint: '/banking/enterprise/products',
      marketReadiness: 'ROADMAP_LOCKED',
      canonicalOwner: 'banking-enterprise',
      automationBoundary: 'ASSISTED_AUTOMATION',
      operationalGuardrails: expect.arrayContaining([
        expect.stringContaining('parceiro BaaS homologado'),
      ]),
    });
    expect(companies).toMatchObject({
      persistence: 'PRISMA',
      endpoint: '/enterprise/modules/companies/:companyId',
      marketReadiness: 'SELLABLE',
      canonicalOwner: 'enterprise-modules',
      automationBoundary: 'SOFTWARE_ONLY',
    });
  });

  it('serves catalog and commercial lanes locally during demo sessions', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';
    isDemoSessionMock.mockReturnValue(true);

    const [catalog, lanes] = await Promise.all([
      enterpriseUniversalApi.catalog(),
      enterpriseUniversalApi.commercialLanes(),
    ]);

    expect(catalog.length).toBeGreaterThan(0);
    expect(lanes.map((lane) => lane.id)).toEqual([
      'direct-sale',
      'assisted-validation',
      'blocked-roadmap',
    ]);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('caches successful enterprise catalog responses to reduce duplicate requests', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: [
        {
          slug: 'companies',
          model: 'Company',
          label: 'Empresas',
          persistence: 'PRISMA',
          endpoint: '/enterprise/modules/companies/:companyId',
        },
      ],
    });

    const [first, second] = await Promise.all([
      enterpriseUniversalApi.catalog(),
      enterpriseUniversalApi.catalog(),
    ]);
    const third = await enterpriseUniversalApi.catalog();

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(third).toHaveLength(1);
    expect(apiGetMock).toHaveBeenCalledTimes(1);
  });

  it('force refresh bypasses enterprise catalog cache', async () => {
    apiGetMock
      .mockResolvedValueOnce({
        data: [
          {
            slug: 'companies',
            model: 'Company',
            label: 'Empresas',
            persistence: 'PRISMA',
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            slug: 'banking-products',
            model: 'BankingProduct',
            label: 'Banking e Fintech',
            persistence: 'ROADMAP',
          },
        ],
      });

    const first = await enterpriseUniversalApi.catalog();
    const refreshed = await enterpriseUniversalApi.catalog({ forceRefresh: true });

    expect(first[0]?.slug).toBe('companies');
    expect(refreshed[0]?.slug).toBe('banking-products');
    expect(apiGetMock).toHaveBeenCalledTimes(2);
  });

  it('returns cached commercial lanes from the enterprise endpoint', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: [
        {
          id: 'direct-sale',
          title: 'Venda direta',
          description: 'Módulos vendáveis.',
          marketReadiness: 'SELLABLE',
          automationBoundaries: ['SOFTWARE_ONLY'],
          modules: [
            {
              slug: 'companies',
              model: 'Company',
              label: 'Empresas',
              persistence: 'PRISMA',
              endpoint: '/enterprise/modules/companies/:companyId',
              marketReadiness: 'SELLABLE',
              automationBoundary: 'SOFTWARE_ONLY',
            },
          ],
          primaryAction: 'Abrir módulo',
          operationalGate: 'Plano ativo.',
        },
      ],
    });

    const [first, second] = await Promise.all([
      enterpriseUniversalApi.commercialLanes(),
      enterpriseUniversalApi.commercialLanes(),
    ]);
    const third = await enterpriseUniversalApi.commercialLanes();

    expect(first[0]?.id).toBe('direct-sale');
    expect(second[0]?.modules[0]?.slug).toBe('companies');
    expect(third[0]?.marketReadiness).toBe('SELLABLE');
    expect(apiGetMock).toHaveBeenCalledTimes(1);
    expect(apiGetMock).toHaveBeenCalledWith('/enterprise/modules/commercial-lanes');
  });

  it('derives commercial lanes from catalog metadata without selling roadmap as ready', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 404 } });

    const lanes = await enterpriseUniversalApi.commercialLanes();
    const modulesInLanes = lanes.flatMap((lane) => lane.modules);

    expect(lanes.map((lane) => lane.id)).toEqual([
      'direct-sale',
      'assisted-validation',
      'blocked-roadmap',
    ]);
    expect(modulesInLanes.length).toBeGreaterThan(0);

    for (const lane of lanes) {
      for (const catalogModule of lane.modules) {
        if (lane.id === 'direct-sale') {
          expect(catalogModule.marketReadiness).toBe('SELLABLE');
        } else if (lane.id === 'assisted-validation') {
          expect(['ASSISTED_BETA', 'ROADMAP_LOCKED']).toContain(
            catalogModule.marketReadiness,
          );
        } else {
          expect(catalogModule.marketReadiness).toBe('ROADMAP_LOCKED');
        }
      }
    }
  });

  it('blocks commercial lanes fallback when the environment disables it', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';
    apiGetMock.mockRejectedValueOnce({ response: { status: 404 } });

    await expect(enterpriseUniversalApi.commercialLanes()).rejects.toThrow(
      'Trilhas comerciais enterprise indisponiveis e fallback demonstrativo desabilitado neste ambiente.',
    );
  });

  it('creates commercial lanes directly from enterprise catalog items', async () => {
    const catalog = await enterpriseUniversalApi.catalog();
    const lanes = createEnterpriseCommercialLanesFromCatalog(catalog);

    expect(lanes.map((lane) => lane.id)).toEqual([
      'direct-sale',
      'assisted-validation',
      'blocked-roadmap',
    ]);
    expect(lanes.flatMap((lane) => lane.modules).length).toBe(catalog.length);
  });

  it('blocks operational demo fallback when the environment disables it', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';
    apiGetMock.mockRejectedValueOnce({ response: { status: 404 } });

    await expect(enterpriseUniversalApi.getModule('users', 'company-123')).rejects.toThrow(
      'Modulo enterprise indisponivel e fallback demonstrativo desabilitado neste ambiente.',
    );
  });

  it('surfaces feature paywall errors without falling back to demo data', async () => {
    apiGetMock.mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          status: 'FEATURE_LOCKED',
          message: 'Feature exige plano mínimo ENTERPRISE.',
          feature: 'digital.certificates',
          planLevel: 'PRO',
          requiredPlan: 'ENTERPRISE',
        },
      },
    });

    await expect(
      enterpriseUniversalApi.getModule('digital-certificates', 'company-123'),
    ).rejects.toThrow('Feature exige plano mínimo ENTERPRISE.');
  });

  it('surfaces roadmap-locked feature errors without falling back to demo data', async () => {
    apiGetMock.mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          status: 'FEATURE_ROADMAP_LOCKED',
          message:
            'Não prometer automação fiscal baseada em certificado até existir cofre seguro.',
          feature: 'digital.certificates',
          planLevel: 'ENTERPRISE',
          requiredPlan: 'ENTERPRISE',
          marketReadiness: 'ROADMAP_LOCKED',
        },
      },
    });

    await expect(
      enterpriseUniversalApi.getModule('digital-certificates', 'company-123'),
    ).rejects.toThrow(
      'Não prometer automação fiscal baseada em certificado até existir cofre seguro.',
    );
  });

  it('surfaces unknown feature contract errors without falling back to demo data', async () => {
    apiGetMock.mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          status: 'FEATURE_UNKNOWN',
          feature: 'enterprise.unmapped',
          planLevel: 'ENTERPRISE',
        },
      },
    });

    await expect(
      enterpriseUniversalApi.getModule('digital-certificates', 'company-123'),
    ).rejects.toThrow(
      'Feature bloqueada para o plano atual (enterprise.unmapped). Feature sem contrato comercial mapeado para liberação produtiva.',
    );
  });

  it('does not return summary or health demo data for real companies', async () => {
    apiGetMock.mockRejectedValue({ response: { status: 404 } });

    await expect(enterpriseUniversalApi.summary('users', 'company-123')).rejects.toThrow(
      'Resumo enterprise indisponivel e fallback demonstrativo desabilitado neste ambiente.',
    );
    await expect(enterpriseUniversalApi.health('users', 'company-123')).rejects.toThrow(
      'Health enterprise indisponivel e fallback demonstrativo desabilitado neste ambiente.',
    );
  });

  it('serves explicit demo company modules locally even when global fallback is disabled', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';

    const [catalogModule, summary, health] = await Promise.all([
      enterpriseUniversalApi.getModule('users', 'demo-001'),
      enterpriseUniversalApi.summary('users', 'demo-001'),
      enterpriseUniversalApi.health('users', 'demo-001'),
    ]);

    expect(catalogModule.status).toBe('OK_WITH_FALLBACK');
    expect(catalogModule.companyId).toBe('demo-001');
    expect(catalogModule.items.length).toBeGreaterThan(0);
    expect(summary).toMatchObject({ fallback: true, mode: 'DEMO_OPERATIONAL' });
    expect(health).toMatchObject({
      slug: 'users',
      companyId: 'demo-001',
      status: 'OK_WITH_FALLBACK',
    });
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('serves regulated roadmap modules without fake operational records in demo mode', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';

    const [bankingProducts, balanceSheet, operationalWorkflows, taxScenarios] = await Promise.all([
      enterpriseUniversalApi.getModule('banking-products', 'demo-001'),
      enterpriseUniversalApi.getModule('balance-sheet', 'demo-001'),
      enterpriseUniversalApi.getModule('operational-workflows', 'demo-001'),
      enterpriseUniversalApi.getModule('tax-scenarios', 'demo-001'),
    ]);

    expect(bankingProducts).toMatchObject({
      status: 'OK_ROADMAP',
      total: 0,
      items: [],
      summary: {
        roadmap: true,
        mode: 'DEMO_ROADMAP',
        endpoint: '/banking/enterprise/products',
        marketReadiness: 'ROADMAP_LOCKED',
        canonicalOwner: 'banking-enterprise',
        automationBoundary: 'ASSISTED_AUTOMATION',
        operationalGuardrails: expect.arrayContaining([
          expect.stringContaining('parceiro BaaS homologado'),
        ]),
      },
    });
    expect(balanceSheet).toMatchObject({
      status: 'OK_ROADMAP',
      total: 0,
      items: [],
      summary: {
        roadmap: true,
        mode: 'DEMO_ROADMAP',
        canonicalOwner: 'accounting-enterprise',
        automationBoundary: 'CRC_VALIDATED',
        operationalGuardrails: expect.arrayContaining([
          expect.stringContaining('demonstração contábil oficial'),
        ]),
      },
    });
    expect(operationalWorkflows).toMatchObject({
      status: 'OK_ROADMAP',
      total: 0,
      items: [],
      summary: {
        roadmap: true,
        mode: 'DEMO_ROADMAP',
        endpoint: '/operations/workflows',
        canonicalOwner: 'operational-workflows',
        automationBoundary: 'ASSISTED_AUTOMATION',
        operationalGuardrails: expect.arrayContaining([
          expect.stringContaining('dossiê operacional'),
        ]),
      },
    });
    expect(taxScenarios).toMatchObject({
      status: 'OK_ROADMAP',
      total: 0,
      items: [],
      summary: {
        roadmap: true,
        mode: 'DEMO_ROADMAP',
        endpoint: '/tax-scenarios/simulate',
        canonicalOwner: 'tax-scenarios',
        automationBoundary: 'ASSISTED_AUTOMATION',
        operationalGuardrails: expect.arrayContaining([expect.stringContaining('Fator R')]),
      },
    });
    expect(apiGetMock).not.toHaveBeenCalled();
  });
});

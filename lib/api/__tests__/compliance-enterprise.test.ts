import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, isDemoSession } from '@/services/api';
import { complianceEnterpriseApi } from '../compliance-enterprise';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  isDemoSession: vi.fn(() => false),
}));

vi.mock('@/lib/config/demo-policy', () => ({
  assertOperationalDemoFallbackEnabled: vi.fn((message?: string) => {
    if (process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK === 'false') {
      throw new Error(message || 'Fallback demonstrativo desabilitado.');
    }
  }),
  isDemoEntityId: (value?: string | null) =>
    typeof value === 'string' && value.toLowerCase().startsWith('demo-'),
}));

const apiGetMock = vi.mocked(api.get);
const apiPostMock = vi.mocked(api.post);
const apiPatchMock = vi.mocked(api.patch);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('complianceEnterpriseApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';
    isDemoSessionMock.mockReturnValue(false);
    window.localStorage.clear();
  });

  it('serves summary, rules and checks locally for demo companies', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
    isDemoSessionMock.mockReturnValue(true);

    const [summary, rules, checks] = await Promise.all([
      complianceEnterpriseApi.summary('demo-001'),
      complianceEnterpriseApi.listRules('demo-001'),
      complianceEnterpriseApi.listChecks('demo-001'),
    ]);

    expect(summary.rules.count).toBeGreaterThan(0);
    expect(summary.checks.count).toBeGreaterThan(0);
    expect(rules.items.length).toBeGreaterThan(0);
    expect(checks.items.length).toBeGreaterThan(0);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('keeps rule and check writes local in demo mode', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
    isDemoSessionMock.mockReturnValue(true);

    const rule = await complianceEnterpriseApi.createRule('demo-001', {
      name: 'Regra demo de teste',
      description: 'Gera check em ambiente demo',
      condition: { type: 'demo' },
      action: { createComplianceCheck: true, severity: 'WARNING' },
      enabled: true,
    });

    const disabled = await complianceEnterpriseApi.disableRule('demo-001', rule.item?.id || '');

    const check = await complianceEnterpriseApi.createCheck('demo-001', {
      checkName: 'Check demo manual',
      severity: 'WARNING',
      status: 'OPEN',
      description: 'Verificação manual demo',
    });

    const resolved = await complianceEnterpriseApi.resolveCheck('demo-001', check.item?.id || '');

    expect(rule.item?.name).toBe('Regra demo de teste');
    expect(disabled.item?.enabled).toBe(false);
    expect(check.item?.status).toBe('OPEN');
    expect(resolved.item?.status).toBe('RESOLVED');
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it('runs compliance engine locally in demo mode', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
    isDemoSessionMock.mockReturnValue(true);

    const response = await complianceEnterpriseApi.runEngine('demo-001', {
      createChecks: true,
      includeResolved: false,
      resolveStaleEngineChecks: true,
    });

    expect(Number(response.totals?.findings || 0)).toBeGreaterThan(0);
    expect(response.audit?.recorded).toBe(true);
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('blocks stale demo company ids outside explicit demo sessions', async () => {
    await expect(complianceEnterpriseApi.summary('demo-001')).rejects.toThrow(
      'Compliance demonstrativo indisponivel e fallback demonstrativo desabilitado neste ambiente.',
    );

    await expect(
      complianceEnterpriseApi.createCheck('demo-001', {
        checkName: 'Check demo bloqueado',
        severity: 'WARNING',
        status: 'OPEN',
        description: 'Verificação bloqueada',
      }),
    ).rejects.toThrow(
      'Compliance demonstrativo indisponivel e fallback demonstrativo desabilitado neste ambiente.',
    );

    expect(apiGetMock).not.toHaveBeenCalled();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('keeps real companies on backend compliance endpoints', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        status: 'success',
        module: 'compliance-enterprise-summary',
        companyId: 'real-company',
        rules: {
          count: 0,
          enabled: 0,
          disabled: 0,
          totalTriggerCount: 0,
        },
        checks: {
          count: 0,
          open: 0,
          resolved: 0,
          ignored: 0,
          inProgress: 0,
          info: 0,
          warning: 0,
          critical: 0,
          riskScore: 100,
          bySeverity: {},
          byStatus: {},
        },
        generatedAt: '2026-08-24T00:00:00.000Z',
      },
    });

    const response = await complianceEnterpriseApi.summary('real-company');

    expect(response.companyId).toBe('real-company');
    expect(apiGetMock).toHaveBeenCalledWith('/compliance/enterprise/summary/real-company');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, isDemoSession } from '@/services/api';
import { complianceEnterpriseApi } from '../compliance-enterprise';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  isDemoSession: vi.fn(() => true),
}));

vi.mock('@/lib/config/demo-policy', () => ({
  isOperationalDemoFallbackEnabled: vi.fn(() => true),
}));

const apiGetMock = vi.mocked(api.get);
const apiPostMock = vi.mocked(api.post);
const apiPatchMock = vi.mocked(api.patch);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('complianceEnterpriseApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    isDemoSessionMock.mockReturnValue(true);
  });

  it('serves summary, rules and checks locally for demo companies', async () => {
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
    const response = await complianceEnterpriseApi.runEngine('demo-001', {
      createChecks: true,
      includeResolved: false,
      resolveStaleEngineChecks: true,
    });

    expect(Number(response.totals?.findings || 0)).toBeGreaterThan(0);
    expect(response.audit?.recorded).toBe(true);
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});

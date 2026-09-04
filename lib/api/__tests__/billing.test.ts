import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, getToken, isDemoSession } from '@/services/api';
import { billingApi, getDemoBillingEntitlements } from '../billing';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
  getToken: vi.fn(() => 'real-token'),
  isDemoSession: vi.fn(() => false),
}));

vi.mock('@/lib/config/demo-policy', () => ({
  assertOperationalDemoFallbackEnabled: vi.fn((message?: string) => {
    if (process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK === 'false') {
      const error = new Error(message || 'Fallback demonstrativo desabilitado.');
      Object.assign(error, { code: 'DEMO_FALLBACK_DISABLED' });
      throw error;
    }
  }),
  isDemoEntityId: (value?: string | null) =>
    typeof value === 'string' && value.toLowerCase().startsWith('demo-'),
}));

const apiGetMock = vi.mocked(api.get);
const apiPatchMock = vi.mocked(api.patch);
const getTokenMock = vi.mocked(getToken);
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('billingApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';
    getTokenMock.mockReturnValue('real-token');
    isDemoSessionMock.mockReturnValue(false);
  });

  it('serves demo entitlements, feature checks and plan changes locally for demo companies', async () => {
    const [entitlements, feature, planChange] = await Promise.all([
      billingApi.entitlements('demo-001'),
      billingApi.checkFeature('demo-001', 'ai.copilot'),
      billingApi.updatePlan('demo-001', 'PRO', 'teste demo'),
    ]);

    expect(entitlements.companyId).toBe('demo-001');
    expect(entitlements.planLevel).toBe('ENTERPRISE');
    expect(feature.allowed).toBe(true);
    expect(planChange.newPlan).toBe('PRO');
    expect(planChange.audit.recorded).toBe(true);
    expect(apiGetMock).not.toHaveBeenCalled();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it('keeps commercial billing features aligned with module market readiness', () => {
    const entitlements = getDemoBillingEntitlements({ id: 'demo-001' });
    const digitalCertificates = entitlements.features.find(
      (item) => item.key === 'digital.certificates',
    );
    const copilot = entitlements.features.find((item) => item.key === 'ai.copilot');

    expect(digitalCertificates).toMatchObject({
      enabled: true,
      marketReadiness: 'ROADMAP_LOCKED',
      commercialGuardrail:
        'Feature não deve ser prometida como operação produtiva até o módulo sair do roadmap bloqueado.',
    });
    expect(copilot).toMatchObject({
      enabled: true,
      marketReadiness: 'ROADMAP_LOCKED',
      commercialGuardrail: expect.stringContaining('Não vender como automação fiscal autônoma'),
    });
  });

  it('does not mask plans endpoint failures for real authenticated sessions', async () => {
    apiGetMock.mockRejectedValueOnce({ response: { status: 503 } });

    await expect(billingApi.plans()).rejects.toThrow(
      'Planos comerciais indisponiveis e fallback demonstrativo desabilitado neste ambiente.',
    );
  });

  it('keeps real company entitlements on backend endpoints', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        status: 'OK',
        companyId: 'real-company',
        company: {
          id: 'real-company',
          name: 'Empresa Real',
          cnpj: '12.345.678/0001-90',
        },
        plan: {
          level: 'PRO',
          label: 'Pro',
          description: 'Plano profissional',
          limits: {
            companies: 3,
            users: 10,
            invoicesPerMonth: 500,
            bankTransactionsPerMonth: 2000,
            automationJobsPerMonth: 300,
            auditRetentionDays: 180,
            aiQuestionsPerMonth: 500,
          },
        },
        planLevel: 'PRO',
        features: [],
        enabledFeatures: [],
        lockedFeatures: [],
        limits: {
          companies: 3,
          users: 10,
          invoicesPerMonth: 500,
          bankTransactionsPerMonth: 2000,
          automationJobsPerMonth: 300,
          auditRetentionDays: 180,
          aiQuestionsPerMonth: 500,
        },
        commercial: {
          canUpgrade: true,
          recommendedPlan: 'ENTERPRISE',
          upgradeReasons: [],
        },
        generatedAt: '2026-08-23T00:00:00.000Z',
      },
    });

    const response = await billingApi.entitlements('real-company');

    expect(response.companyId).toBe('real-company');
    expect(apiGetMock).toHaveBeenCalledWith('/billing/entitlements/real-company');
  });

  it('does not return demo entitlements for real companies in demo sessions', async () => {
    getTokenMock.mockReturnValue('demo-token-local');
    isDemoSessionMock.mockReturnValue(true);
    apiGetMock.mockRejectedValueOnce({ response: { status: 404 } });

    await expect(billingApi.entitlements('real-company')).rejects.toThrow(
      'Entitlements comerciais indisponiveis e fallback demonstrativo desabilitado neste ambiente.',
    );
  });
});

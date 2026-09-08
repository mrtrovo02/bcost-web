import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, isDemoSession } from '@/services/api';
import { auditIntelligenceEnterpriseApi } from '../audit-intelligence-enterprise';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
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
const isDemoSessionMock = vi.mocked(isDemoSession);

describe('auditIntelligenceEnterpriseApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'false';
    isDemoSessionMock.mockReturnValue(false);
  });

  it('serves executive audit intelligence locally for demo companies', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
    isDemoSessionMock.mockReturnValue(true);

    const response = await auditIntelligenceEnterpriseApi.executive('demo-001', {
      lookback: 300,
      limit: 2,
      includeRecommendations: true,
    });

    expect(response.status).toBe('OK_DEMO');
    expect(response.companyId).toBe('demo-001');
    expect(response.quality.recordsAnalyzed).toBeGreaterThanOrEqual(300);
    expect(response.findings).toHaveLength(2);
    expect(response.recommendations.length).toBeGreaterThan(0);
    expect(response.topBreakdowns.byModule.length).toBeGreaterThan(0);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('honors demo recommendation flag', async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK = 'true';
    isDemoSessionMock.mockReturnValue(true);

    const response = await auditIntelligenceEnterpriseApi.executive('demo-001', {
      includeRecommendations: false,
    });

    expect(response.recommendations).toEqual([]);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('blocks stale demo company ids outside explicit demo sessions', async () => {
    await expect(auditIntelligenceEnterpriseApi.executive('demo-001')).rejects.toThrow(
      'Auditoria demonstrativa indisponivel e fallback demonstrativo desabilitado neste ambiente.',
    );

    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('keeps real companies on backend endpoints', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        status: 'OK',
        module: 'audit-intelligence',
        companyId: 'real-company',
        quality: {
          qualityScore: 100,
          qualityStatus: 'HEALTHY',
          recordsAnalyzed: 0,
          criticalEvents: 0,
          warningEvents: 0,
          activeSignals: 0,
          historicalNoise: 0,
          serverErrors: 0,
          clientErrors: 0,
        },
        totals: {
          records: 0,
          statusBuckets: {},
          severityBuckets: {},
          modules: 0,
          actions: 0,
          endpoints: 0,
        },
        findings: [],
        recommendations: [],
        supportingSignals: {
          notifications: { total: 0, critical: 0, warning: 0, unread: 0 },
          automationJobs: { total: 0, failed: 0, queued: 0, running: 0 },
          complianceChecks: { total: 0, critical: 0, warning: 0, open: 0 },
        },
        topBreakdowns: {
          byModule: [],
          byAction: [],
          byEndpoint: [],
          byDay: [],
        },
        payloadProfile: {
          optimizedFor: 'test',
          rawSamplesIncluded: false,
          fullEvidenceIncluded: false,
          latestEvidenceMode: 'empty',
        },
        generatedAt: '2026-08-24T00:00:00.000Z',
      },
    });

    const response = await auditIntelligenceEnterpriseApi.executive('real-company', {
      lookback: 100,
      includeRecommendations: true,
    });

    expect(response.companyId).toBe('real-company');
    expect(apiGetMock).toHaveBeenCalledWith(
      '/audit/intelligence/real-company/executive?lookback=100&includeRecommendations=true',
    );
  });
});

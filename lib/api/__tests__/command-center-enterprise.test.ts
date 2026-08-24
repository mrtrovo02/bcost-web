import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, isDemoSession } from '@/services/api';
import { isOperationalDemoFallbackEnabled } from '@/lib/config/demo-policy';
import { commandCenterEnterpriseApi } from '../command-center-enterprise';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
  isDemoSession: vi.fn(() => false),
}));

vi.mock('@/lib/config/demo-policy', () => ({
  isDemoEntityId: (value?: string | null) =>
    typeof value === 'string' && value.toLowerCase().startsWith('demo-'),
  isOperationalDemoFallbackEnabled: vi.fn(() => false),
}));

vi.mock('@/lib/api/enterprise-demo', () => ({
  createDemoEnterpriseCatalog: () => [
    { slug: 'notifications', label: 'Notificações', model: 'Notification' },
    { slug: 'webhooks', label: 'Webhooks', model: 'WebhookEndpoint' },
    { slug: 'audit-intelligence', label: 'Audit Intelligence', model: 'AuditLog' },
    { slug: 'compliance-checks', label: 'Compliance Checks', model: 'ComplianceCheck' },
  ],
}));

const apiGetMock = vi.mocked(api.get);
const isDemoSessionMock = vi.mocked(isDemoSession);
const isFallbackEnabledMock = vi.mocked(isOperationalDemoFallbackEnabled);

describe('commandCenterEnterpriseApi demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoSessionMock.mockReturnValue(false);
    isFallbackEnabledMock.mockReturnValue(false);
  });

  it('serves command center views locally for demo companies when global fallback is disabled', async () => {
    const [summary, risks, modules, activity] = await Promise.all([
      commandCenterEnterpriseApi.summary('demo-001', {
        includeAudit: true,
        includeHealth: true,
        limit: 15,
      }),
      commandCenterEnterpriseApi.risks('demo-001'),
      commandCenterEnterpriseApi.modules('demo-001'),
      commandCenterEnterpriseApi.activity('demo-001'),
    ]);

    expect(summary.executiveSummary.availableModules).toBeGreaterThan(0);
    expect(summary.modules.length).toBeGreaterThan(0);
    expect(summary.activity.length).toBeGreaterThan(0);
    expect(summary.auditIntelligence?.available).toBe(true);
    expect(risks.risks.length).toBeGreaterThan(0);
    expect(modules.modules.length).toBeGreaterThan(0);
    expect(activity.activity.length).toBeGreaterThan(0);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('keeps real companies on backend endpoints', async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        status: 'OK',
        module: 'command-center',
        companyId: 'real-company',
        company: { id: 'real-company' },
        executiveSummary: {
          executiveScore: 100,
          executiveStatus: 'HEALTHY',
          availableModules: 0,
          unavailableModules: 0,
          healthyModules: 0,
          attentionModules: 0,
          criticalModules: 0,
          totalRecords: 0,
          totalCritical: 0,
          totalWarning: 0,
          totalFailed: 0,
          totalUnread: 0,
          topRisks: [],
        },
        modules: [],
        risks: [],
        activity: [],
        audit: [],
        health: null,
        generatedAt: '2026-08-23T00:00:00.000Z',
      },
    });

    const response = await commandCenterEnterpriseApi.summary('real-company', {
      includeAudit: true,
      includeHealth: true,
      includeSamples: false,
      limit: 15,
    });

    expect(response.companyId).toBe('real-company');
    expect(apiGetMock).toHaveBeenCalledWith(
      '/operations/command-center/real-company?includeSamples=false&includeAudit=true&includeHealth=true&limit=15',
    );
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommandCenterEnterpriseWorkspace from '../CommandCenterEnterpriseWorkspace';
import { commandCenterEnterpriseApi } from '@/lib/api/command-center-enterprise';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';

vi.mock('@/lib/api/command-center-enterprise', () => ({
  commandCenterEnterpriseApi: {
    summary: vi.fn(),
  },
}));

vi.mock('@/lib/api/enterprise-company', () => ({
  resolveEnterpriseCompanyIdWithFallback: vi.fn(),
}));

const summaryMock = vi.mocked(commandCenterEnterpriseApi.summary);
const resolveCompanyIdMock = vi.mocked(resolveEnterpriseCompanyIdWithFallback);

describe('CommandCenterEnterpriseWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCompanyIdMock.mockResolvedValue('company-001');
  });

  it('does not expose operational navigation for roadmap locked modules selected in the command center', async () => {
    summaryMock.mockResolvedValueOnce({
      status: 'OK',
      module: 'command-center',
      companyId: 'company-001',
      company: {
        id: 'company-001',
        name: 'Empresa Real LTDA',
        planLevel: 'ENTERPRISE',
      },
      executiveSummary: {
        executiveScore: 82,
        executiveStatus: 'ATTENTION',
        availableModules: 1,
        unavailableModules: 0,
        healthyModules: 0,
        attentionModules: 1,
        criticalModules: 0,
        totalRecords: 12,
        totalCritical: 0,
        totalWarning: 1,
        totalFailed: 0,
        totalUnread: 0,
        topRisks: [],
      },
      modules: [
        {
          slug: 'webhooks',
          label: 'Webhooks',
          prismaKey: 'WebhookConfig',
          available: false,
          total: 0,
          riskScore: 74,
          status: 'ATTENTION',
        },
      ],
      risks: [],
      activity: [],
      audit: [],
      auditIntelligence: {
        available: false,
        quality: null,
        findings: [],
        recommendations: [],
        route: '/dashboard/modules/audit-intelligence',
        apiBase: '/audit/intelligence',
      },
      health: {
        api: 'UP',
        database: 'UP',
        commandCenter: 'UP',
        generatedAt: '2026-09-04T00:00:00.000Z',
      },
      generatedAt: '2026-09-04T00:00:00.000Z',
    });

    render(<CommandCenterEnterpriseWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Selected Module')).toBeInTheDocument();
    });

    expect(screen.getByText('Ver roadmap')).toBeInTheDocument();
    expect(
      screen.getByText('Roadmap bloqueado: módulo sem navegação operacional neste ambiente.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Abrir módulo' })).not.toBeInTheDocument();
  });
});

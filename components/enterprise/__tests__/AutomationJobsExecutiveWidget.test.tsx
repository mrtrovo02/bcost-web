import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AutomationJobsExecutiveWidget from '../AutomationJobsExecutiveWidget';
import { automationJobsApi } from '@/lib/api/automation-jobs';
import { resolveEnterpriseCompanyIdWithFallback } from '@/lib/api/enterprise-company';

vi.mock('@/lib/api/automation-jobs', () => ({
  automationJobsApi: {
    list: vi.fn(),
    audit: vi.fn(),
  },
}));

vi.mock('@/lib/api/enterprise-company', () => ({
  resolveEnterpriseCompanyIdWithFallback: vi.fn(),
}));

const listMock = vi.mocked(automationJobsApi.list);
const auditMock = vi.mocked(automationJobsApi.audit);
const resolveCompanyIdMock = vi.mocked(resolveEnterpriseCompanyIdWithFallback);

describe('AutomationJobsExecutiveWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCompanyIdMock.mockResolvedValue('company-001');
    listMock.mockResolvedValue({
      status: 'OK',
      module: 'automation-jobs',
      model: 'AutomationJob',
      companyId: 'company-001',
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
      hasMore: false,
      summary: {},
      generatedAt: '2026-09-04T00:00:00.000Z',
    });
    auditMock.mockResolvedValue({
      items: [],
      total: 0,
      limit: 5,
      offset: 0,
      generatedAt: '2026-09-04T00:00:00.000Z',
    });
  });

  it('shows roadmap state instead of an operational link while automation jobs is not sellable', async () => {
    render(<AutomationJobsExecutiveWidget />);

    await waitFor(() => {
      expect(screen.getByText('Operação de automações enterprise')).toBeInTheDocument();
    });

    expect(screen.getByText('Ver roadmap')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /abrir central/i })).not.toBeInTheDocument();
  });
});

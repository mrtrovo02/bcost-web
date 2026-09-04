import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnterpriseModuleClient from '../EnterpriseModuleClient';
import {
  enterpriseUniversalApi,
  resolveEnterpriseCompanyId,
} from '@/lib/api/enterprise-universal';

vi.mock('@/lib/api/enterprise-universal', () => ({
  enterpriseUniversalApi: {
    catalog: vi.fn(),
    getModule: vi.fn(),
  },
  getEnterpriseModuleLabel: vi.fn((slug: string) => slug),
  getEnterpriseModuleModel: vi.fn((slug: string) => slug),
  resolveEnterpriseCompanyId: vi.fn(),
}));

vi.mock('@/lib/api/automation-jobs', () => ({
  automationJobsApi: {
    retry: vi.fn(),
  },
}));

vi.mock('@/lib/config/demo-policy', () => ({
  isDemoEntityId: vi.fn((value?: string | null) => Boolean(value?.startsWith('demo-'))),
}));

vi.mock('@/services/api', () => ({
  getToken: vi.fn(() => 'real-token'),
  isDemoSession: vi.fn(() => false),
}));

const catalogMock = vi.mocked(enterpriseUniversalApi.catalog);
const getModuleMock = vi.mocked(enterpriseUniversalApi.getModule);
const resolveCompanyMock = vi.mocked(resolveEnterpriseCompanyId);

describe('EnterpriseModuleClient dynamic page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders module governance from the enriched enterprise catalog', async () => {
    resolveCompanyMock.mockResolvedValueOnce('company-123');
    catalogMock.mockResolvedValueOnce([
      {
        slug: 'users',
        model: 'User',
        label: 'Usuários',
        persistence: 'PRISMA',
        endpoint: '/enterprise/modules/users/:companyId',
        canonicalOwner: 'enterprise-modules',
        automationBoundary: 'SOFTWARE_ONLY',
        operationalGuardrails: [
          'Endpoint persistido exige autenticação JWT, empresa válida e filtros por companyId antes de expor dados.',
        ],
      },
    ]);
    getModuleMock.mockResolvedValueOnce({
      slug: 'users',
      model: 'User',
      label: 'Usuários',
      companyId: 'company-123',
      status: 'OK',
      items: [
        {
          id: 'user-1',
          name: 'Amanda Contábil',
          email: 'amandacontabil@bcost.com.br',
          active: true,
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
      hasMore: false,
      summary: { count: 1 },
      generatedAt: '2026-08-24T00:00:00.000Z',
    });

    render(<EnterpriseModuleClient slug="users" />);

    await waitFor(() => {
      expect(screen.getByText('Governança do contrato enterprise')).toBeInTheDocument();
    });

    expect(screen.getByText('enterprise-modules')).toBeInTheDocument();
    expect(screen.getByText('/enterprise/modules/users/:companyId')).toBeInTheDocument();
    expect(screen.getByText('Amanda Contábil')).toBeInTheDocument();
    expect(catalogMock).toHaveBeenCalledTimes(1);
    expect(resolveCompanyMock).toHaveBeenCalledTimes(1);
    expect(getModuleMock).toHaveBeenCalledWith('users', 'company-123', {
      limit: 100,
      offset: 0,
    });
  });

  it('renders roadmap state locally for planned modules without calling operational API', async () => {
    resolveCompanyMock.mockResolvedValueOnce('company-123');
    catalogMock.mockResolvedValueOnce([
      {
        slug: 'digital-certificates',
        model: 'DigitalCertificate',
        label: 'Certificados Digitais',
        persistence: 'ROADMAP',
        endpoint: '/digital-certificates/enterprise',
        canonicalOwner: 'integrations',
        automationBoundary: 'CRC_VALIDATED',
        marketReadiness: 'ROADMAP_LOCKED',
        operationalGuardrails: [
          'Exige cofre seguro, criptografia e política de rotação antes de uso produtivo.',
        ],
      },
    ]);

    render(<EnterpriseModuleClient slug="digital-certificates" />);

    await waitFor(() => {
      expect(screen.getByText('Roadmap técnico controlado')).toBeInTheDocument();
    });

    expect(screen.getByText('Certificados Digitais está mapeado, mas ainda não opera com persistência própria')).toBeInTheDocument();
    expect(screen.getAllByText('/digital-certificates/enterprise')).toHaveLength(2);
    expect(
      screen.getAllByText(
        'Exige cofre seguro, criptografia e política de rotação antes de uso produtivo.',
      ),
    ).toHaveLength(2);
    expect(getModuleMock).not.toHaveBeenCalled();
  });
});

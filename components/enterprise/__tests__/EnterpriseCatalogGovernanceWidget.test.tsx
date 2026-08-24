import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EnterpriseCatalogGovernanceWidget from '../EnterpriseCatalogGovernanceWidget';
import { enterpriseUniversalApi } from '@/lib/api/enterprise-universal';

vi.mock('@/lib/api/enterprise-universal', () => ({
  enterpriseUniversalApi: {
    catalog: vi.fn(),
  },
}));

const catalogMock = vi.mocked(enterpriseUniversalApi.catalog);

describe('EnterpriseCatalogGovernanceWidget', () => {
  it('renders enriched enterprise catalog governance metadata', async () => {
    catalogMock.mockResolvedValueOnce([
      {
        slug: 'companies',
        model: 'Company',
        label: 'Empresas',
        persistence: 'PRISMA',
        endpoint: '/enterprise/modules/companies/:companyId',
        canonicalOwner: 'enterprise-modules',
        automationBoundary: 'SOFTWARE_ONLY',
        operationalGuardrails: ['Endpoint persistido exige autenticação JWT.'],
      },
      {
        slug: 'banking-products',
        model: 'BankingProduct',
        label: 'Banking e Fintech',
        persistence: 'ROADMAP',
        endpoint: '/banking/enterprise/products',
        area: 'Banking',
        priority: 'CRITICAL',
        canonicalOwner: 'banking-enterprise',
        automationBoundary: 'ASSISTED_AUTOMATION',
        operationalGuardrails: ['Não ativar Conta PJ sem parceiro BaaS homologado.'],
      },
    ]);

    render(<EnterpriseCatalogGovernanceWidget />);

    expect(screen.getByText('Carregando contrato enterprise...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Banking e Fintech')).toBeInTheDocument();
    });

    expect(screen.getByText('Governança de catálogo')).toBeInTheDocument();
    expect(screen.getByText('banking-enterprise')).toBeInTheDocument();
    expect(screen.getByText('/banking/enterprise/products')).toBeInTheDocument();
    expect(screen.getByText('P0 Roadmap')).toBeInTheDocument();
  });
});

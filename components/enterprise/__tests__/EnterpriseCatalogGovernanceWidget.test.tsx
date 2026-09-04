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
        marketReadiness: 'SELLABLE',
        canonicalOwner: 'enterprise-modules',
        automationBoundary: 'SOFTWARE_ONLY',
        operationalGuardrails: ['Endpoint persistido exige autenticação JWT.'],
        launchGate: {
          status: 'PASS',
          canSell: true,
          requiredEvidence: ['endpoint produtivo'],
          blockers: [],
        },
      },
      {
        slug: 'banking-products',
        model: 'BankingProduct',
        label: 'Banking e Fintech',
        persistence: 'ROADMAP',
        endpoint: '/banking/enterprise/products',
        area: 'Banking',
        priority: 'CRITICAL',
        marketReadiness: 'ROADMAP_LOCKED',
        canonicalOwner: 'banking-enterprise',
        automationBoundary: 'ASSISTED_AUTOMATION',
        operationalGuardrails: ['Não ativar Conta PJ sem parceiro BaaS homologado.'],
        launchGate: {
          status: 'BLOCK',
          canSell: false,
          requiredEvidence: ['integração homologada'],
          blockers: ['módulo em roadmap não pode ser vendido como automação pronta'],
        },
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
    expect(
      screen.getByText('Roadmap bloqueado: sem navegação operacional neste ambiente.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /banking e fintech/i })).not.toBeInTheDocument();
    expect(screen.getByText('P0 Roadmap')).toBeInTheDocument();
    expect(screen.getByText('Vendáveis')).toBeInTheDocument();
    expect(screen.getByText('Bloqueados')).toBeInTheDocument();
    expect(screen.getByText('Roadmap bloqueado')).toBeInTheDocument();
    expect(screen.getByText(/Gate comercial: BLOCK/)).toBeInTheDocument();
    expect(
      screen.getByText(/módulo em roadmap não pode ser vendido como automação pronta/),
    ).toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EnterpriseCommercialLanesWidget from '../EnterpriseCommercialLanesWidget';
import { enterpriseUniversalApi } from '@/lib/api/enterprise-universal';

vi.mock('@/lib/api/enterprise-universal', () => ({
  enterpriseUniversalApi: {
    commercialLanes: vi.fn(),
  },
}));

const commercialLanesMock = vi.mocked(enterpriseUniversalApi.commercialLanes);

describe('EnterpriseCommercialLanesWidget', () => {
  it('renders enterprise commercial lanes returned by the api client', async () => {
    commercialLanesMock.mockResolvedValueOnce([
      {
        id: 'direct-sale',
        title: 'Venda direta',
        description: 'Módulos vendáveis para clientes reais.',
        marketReadiness: 'SELLABLE',
        automationBoundaries: ['SOFTWARE_ONLY'],
        summary: {
          total: 3,
          critical: 2,
          high: 1,
          regulated: 1,
        },
        modules: [
          {
            slug: 'companies',
            model: 'Company',
            label: 'Empresas',
            persistence: 'PRISMA',
            endpoint: '/enterprise/modules/companies/:companyId',
            marketReadiness: 'SELLABLE',
            automationBoundary: 'SOFTWARE_ONLY',
            priority: 'CRITICAL',
          },
        ],
        primaryAction: 'Abrir módulo',
        operationalGate: 'Plano ativo, empresa autorizada e endpoint produtivo.',
      },
      {
        id: 'assisted-validation',
        title: 'Validação assistida',
        description: 'Módulos que exigem validação operacional.',
        marketReadiness: 'ROADMAP_LOCKED',
        automationBoundaries: ['CRC_VALIDATED'],
        modules: [
          {
            slug: 'balance-sheet',
            model: 'BalanceSheet',
            label: 'Balanço Patrimonial',
            persistence: 'ROADMAP',
            endpoint: '/accounting/enterprise/balance-sheet',
            marketReadiness: 'ROADMAP_LOCKED',
            automationBoundary: 'CRC_VALIDATED',
            priority: 'HIGH',
          },
        ],
        primaryAction: 'Validar escopo assistido',
        operationalGate: 'SLA interno e validação de contador responsável.',
      },
      {
        id: 'blocked-roadmap',
        title: 'Roadmap bloqueado',
        description: 'Módulos ainda indisponíveis para venda direta.',
        marketReadiness: 'ROADMAP_LOCKED',
        automationBoundaries: ['HUMAN_LED'],
        modules: [],
        primaryAction: 'Planejar entrega',
        operationalGate: 'Integração homologada e teste de compliance pendentes.',
      },
    ]);

    render(<EnterpriseCommercialLanesWidget />);

    expect(screen.getByText('Carregando trilhas comerciais...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Venda direta')).toBeInTheDocument();
    });

    expect(screen.getByText('Trilhas comerciais e operacionais')).toBeInTheDocument();
    expect(screen.getByText('Empresas')).toBeInTheDocument();
    expect(screen.getByText('Balanço Patrimonial')).toBeInTheDocument();
    expect(screen.getByText('3 módulos')).toBeInTheDocument();
    expect(screen.getAllByText('Alta prioridade')).toHaveLength(3);
    expect(screen.getAllByText('Regulados')).toHaveLength(3);
    expect(screen.getByText('Abrir módulo')).toBeInTheDocument();
    expect(screen.getByText('Validar escopo assistido')).toBeInTheDocument();
    expect(commercialLanesMock).toHaveBeenCalledWith({ forceRefresh: false });
  });
});

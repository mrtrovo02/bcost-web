import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompanyProvider, useCompany, type Company } from '../CompanyContext';
import { clearActiveCompanyId, getActiveCompanyId, isDemoSession } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    defaults: {
      headers: {
        common: {},
      },
    },
  },
  clearActiveCompanyId: vi.fn(),
  getActiveCompanyId: vi.fn(() => null),
  isDemoSession: vi.fn(() => false),
  setActiveCompanyId: vi.fn(),
}));

vi.mock('@/lib/config/demo-policy', () => ({
  isDemoEntityId: (value?: string | null) =>
    typeof value === 'string' && value.toLowerCase().startsWith('demo-'),
  isOperationalDemoFallbackEnabled: () => true,
}));

vi.mock('@/lib/utils/telemetry', () => ({
  trackEvent: vi.fn(),
}));

const isDemoSessionMock = vi.mocked(isDemoSession);
const clearActiveCompanyIdMock = vi.mocked(clearActiveCompanyId);
const getActiveCompanyIdMock = vi.mocked(getActiveCompanyId);

function CompanyContextProbe() {
  const { selectedCompany, companies, setCompanies, setSelectedCompany, isLoading } = useCompany();
  const demoCompany: Company = {
    id: 'demo-001',
    name: 'Empresa Demo',
    cnpj: '00.000.000/0001-91',
  };

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="selected">{selectedCompany?.id ?? 'none'}</span>
      <span data-testid="companies">{companies.map((company) => company.id).join(',')}</span>
      <button type="button" onClick={() => setCompanies([demoCompany])}>
        seed demo list
      </button>
      <button type="button" onClick={() => setSelectedCompany(demoCompany)}>
        select demo
      </button>
    </div>
  );
}

describe('CompanyProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    isDemoSessionMock.mockReturnValue(false);
    getActiveCompanyIdMock.mockReturnValue(null);
  });

  it('blocks demo company selection in real sessions even when demo fallback is enabled', async () => {
    render(
      <CompanyProvider>
        <CompanyContextProbe />
      </CompanyProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    fireEvent.click(screen.getByText('seed demo list'));
    fireEvent.click(screen.getByText('select demo'));

    expect(screen.getByTestId('selected')).toHaveTextContent('none');
    expect(screen.getByTestId('companies')).toHaveTextContent('');
    expect(window.localStorage.getItem('bcost_active_company_data')).toBeNull();
    expect(clearActiveCompanyIdMock).toHaveBeenCalled();
  });

  it('sanitizes stale demo companies from storage during real session hydration', async () => {
    getActiveCompanyIdMock.mockReturnValue('real-company-001');
    window.localStorage.setItem(
      'bcost_companies',
      JSON.stringify([
        {
          id: 'demo-001',
          name: 'Empresa Demo',
          cnpj: '00.000.000/0001-91',
        },
        {
          id: 'real-company-001',
          name: 'Empresa Real',
          cnpj: '11.222.333/0001-44',
        },
      ]),
    );

    render(
      <CompanyProvider>
        <CompanyContextProbe />
      </CompanyProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('real-company-001');
    });

    expect(screen.getByTestId('companies')).toHaveTextContent('real-company-001');
    expect(window.localStorage.getItem('bcost_companies')).toBe(
      JSON.stringify([
        {
          id: 'real-company-001',
          name: 'Empresa Real',
          cnpj: '11.222.333/0001-44',
        },
      ]),
    );
  });
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompanyProvider, useCompany, type Company } from '../CompanyContext';
import {
  api,
  clearActiveCompanyId,
  getActiveCompanyId,
  isDemoSession,
  setActiveCompanyId,
} from '@/services/api';

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
const setActiveCompanyIdMock = vi.mocked(setActiveCompanyId);
const apiDefaultsHeaders = api.defaults.headers.common as Record<string, string | undefined>;

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
    delete apiDefaultsHeaders['x-company-id'];
    delete apiDefaultsHeaders.CompanyId;
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

  it('blocks direct demo company list injection in real sessions', async () => {
    render(
      <CompanyProvider>
        <CompanyContextProbe />
      </CompanyProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    fireEvent.click(screen.getByText('seed demo list'));

    expect(screen.getByTestId('companies')).toHaveTextContent('');
    expect(window.localStorage.getItem('bcost_companies')).toBeNull();
    expect(window.localStorage.getItem('companies')).toBeNull();
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
    expect(apiDefaultsHeaders['x-company-id']).toBeUndefined();
    expect(window.localStorage.getItem('bcost_companies')).toContain('real-company-001');
    expect(window.localStorage.getItem('bcost_companies')).not.toContain('demo-001');
  });

  it('persists selected real company only in storage and leaves axios tenant defaults empty', async () => {
    const realCompany: Company = {
      id: 'real-company-002',
      name: 'Empresa Real 2',
      cnpj: '22.333.444/0001-55',
    };

    function RealCompanyProbe() {
      const { selectedCompany, setSelectedCompany } = useCompany();

      return (
        <div>
          <span data-testid="selected-real">{selectedCompany?.id ?? 'none'}</span>
          <button type="button" onClick={() => setSelectedCompany(realCompany)}>
            select real
          </button>
        </div>
      );
    }

    render(
      <CompanyProvider>
        <RealCompanyProbe />
      </CompanyProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('selected-real')).toHaveTextContent('none');
    });

    fireEvent.click(screen.getByText('select real'));

    expect(screen.getByTestId('selected-real')).toHaveTextContent('real-company-002');
    expect(window.localStorage.getItem('bcost_active_company_data')).toBe(
      JSON.stringify(realCompany),
    );
    expect(apiDefaultsHeaders['x-company-id']).toBeUndefined();
  });

  it('restores selected company from stored authenticated user companies', async () => {
    getActiveCompanyIdMock.mockReturnValue('company-amel');
    window.localStorage.setItem(
      'bcost_user',
      JSON.stringify({
        id: 'user-amanda',
        email: 'amandacontabil@bcost.com.br',
        name: 'Amanda Narvaes',
        companies: [
          {
            id: 'company-amel',
            name: 'Amel Contabilidade Digital LTDA',
            cnpj: '12.345.678/0001-90',
          },
        ],
      }),
    );

    render(
      <CompanyProvider>
        <CompanyContextProbe />
      </CompanyProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('company-amel');
    });

    expect(screen.getByTestId('companies')).toHaveTextContent('company-amel');
    expect(window.localStorage.getItem('bcost_active_company_data')).toContain(
      'Amel Contabilidade Digital LTDA',
    );
  });

  it('keeps the active stored company visible in the company list when storage has no list', async () => {
    window.localStorage.setItem(
      'bcost_active_company_data',
      JSON.stringify({
        id: 'company-amel',
        name: 'Amel Contabilidade Digital LTDA',
        cnpj: '12.345.678/0001-90',
      }),
    );

    render(
      <CompanyProvider>
        <CompanyContextProbe />
      </CompanyProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('company-amel');
    });

    expect(screen.getByTestId('companies')).toHaveTextContent('company-amel');
    expect(window.localStorage.getItem('bcost_companies')).toContain('company-amel');
    expect(window.localStorage.getItem('companies')).toContain('company-amel');
    expect(setActiveCompanyIdMock).toHaveBeenCalledWith('company-amel');
  });

  it('reacts to user session updates when companies arrive after initial hydration', async () => {
    render(
      <CompanyProvider>
        <CompanyContextProbe />
      </CompanyProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('none');
    });

    getActiveCompanyIdMock.mockReturnValue('company-amel');
    window.localStorage.setItem(
      'bcost_user',
      JSON.stringify({
        id: 'user-amanda',
        email: 'amandacontabil@bcost.com.br',
        companies: [
          {
            id: 'company-amel',
            name: 'Amel Contabilidade Digital LTDA',
            cnpj: '12.345.678/0001-90',
          },
        ],
      }),
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent('bcost:user-session-updated'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('company-amel');
    });
  });
});

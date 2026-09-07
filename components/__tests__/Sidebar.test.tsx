import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '../Sidebar';

type TestCompany = {
  id: string;
  name: string;
  cnpj: string;
};

const testState = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  setCompanies: vi.fn(),
  setSelectedCompany: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  clearSession: vi.fn(),
  getToken: vi.fn(() => 'real-jwt-token'),
  isDemoSession: false,
  companies: [{ id: '1', name: 'Empresa Demo', cnpj: '12.345.678/0001-99' }] as TestCompany[],
  selectedCompany: {
    id: '1',
    name: 'Empresa Demo',
    cnpj: '12.345.678/0001-99',
  } as TestCompany | null,
  demoFallbackEnabled: true,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/intelligence',
  useRouter: () => ({ push: testState.mockPush, replace: testState.mockReplace }),
}));

vi.mock('@/app/context/CompanyContext', () => ({
  useCompany: () => ({
    companies: testState.companies,
    setCompanies: testState.setCompanies,
    selectedCompany: testState.selectedCompany,
    setSelectedCompany: testState.setSelectedCompany,
    isDemoSession: testState.isDemoSession,
  }),
}));

vi.mock('@/services/api', () => ({
  api: {
    defaults: { headers: { common: {} } },
    get: testState.apiGet,
    post: testState.apiPost,
  },
  clearSession: testState.clearSession,
  clearActiveCompanyId: vi.fn(),
  deleteCookie: vi.fn(),
  getActiveCompanyId: vi.fn(() => '1'),
  getToken: testState.getToken,
  setActiveCompanyId: vi.fn(),
}));

vi.mock('@/lib/config/demo-policy', () => ({
  isOperationalDemoFallbackEnabled: () => testState.demoFallbackEnabled,
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.isDemoSession = false;
    testState.companies = [{ id: '1', name: 'Empresa Demo', cnpj: '12.345.678/0001-99' }];
    testState.selectedCompany = {
      id: '1',
      name: 'Empresa Demo',
      cnpj: '12.345.678/0001-99',
    };
    testState.apiGet.mockResolvedValue({ data: testState.companies });
    testState.apiPost.mockResolvedValue({ data: { message: 'Logged out successfully' } });
    testState.getToken.mockReturnValue('real-jwt-token');
    testState.demoFallbackEnabled = true;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        replace: vi.fn(),
      },
    });
  });

  it('renders the main navigation and company name', () => {
    render(<Sidebar />);

    expect(screen.getAllByText('Empresa Demo').length).toBeGreaterThan(0);
    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(screen.getByText('Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Documentos XML')).toBeInTheDocument();
  });

  it('routes service catalog navigation to the enterprise storefront instead of a roadmap module', () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByText('Regras & Catálogo'));

    expect(testState.mockPush).toHaveBeenCalledWith('/dashboard/enterprise');
    expect(testState.mockPush).not.toHaveBeenCalledWith('/dashboard/modules/business-rules');
  });

  it('does not apply demo companies when a real session cannot load companies from the API', async () => {
    testState.isDemoSession = false;
    testState.companies = [];
    testState.selectedCompany = null;
    testState.apiGet.mockRejectedValueOnce({ response: { status: 401 } });

    render(<Sidebar />);

    await waitFor(() => {
      expect(testState.setCompanies).toHaveBeenCalledWith([]);
    });

    expect(testState.setCompanies).not.toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Tech Solutions Ltda',
        }),
      ]),
    );
  });

  it('normalizes enveloped company API responses so real companies appear in the sidebar', async () => {
    testState.isDemoSession = false;
    testState.companies = [];
    testState.selectedCompany = null;
    testState.apiGet.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'amel-company-id',
            name: 'Amel Contabilidade Digital LTDA',
            cnpj: '12.345.678/0001-10',
          },
        ],
      },
    });

    render(<Sidebar />);

    await waitFor(() => {
      expect(testState.setCompanies).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'amel-company-id',
          name: 'Amel Contabilidade Digital LTDA',
        }),
      ]);
    });
  });

  it('keeps demo companies local when the session is explicitly demonstrative', async () => {
    testState.isDemoSession = true;
    testState.companies = [];
    testState.selectedCompany = null;

    render(<Sidebar />);

    await waitFor(() => {
      expect(testState.setCompanies).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Tech Solutions Ltda',
          }),
        ]),
      );
    });

    expect(testState.apiGet).not.toHaveBeenCalled();
  });

  it('does not show demo companies when demo fallback is disabled', async () => {
    testState.isDemoSession = true;
    testState.demoFallbackEnabled = false;
    testState.companies = [];
    testState.selectedCompany = null;

    render(<Sidebar />);

    await waitFor(() => {
      expect(testState.setCompanies).toHaveBeenCalledWith([]);
    });

    expect(testState.apiGet).not.toHaveBeenCalled();
  });

  it('revokes the current token on logout before clearing the browser session', async () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByText('Sair do Terminal'));

    await waitFor(() => {
      expect(testState.apiPost).toHaveBeenCalledWith('/auth/logout', {
        token: 'real-jwt-token',
      });
    });
    expect(testState.clearSession).toHaveBeenCalled();
    expect(window.location.replace).toHaveBeenCalledWith('/login');
  });
});

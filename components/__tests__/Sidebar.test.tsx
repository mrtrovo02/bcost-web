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
  isDemoSession: false,
  companies: [{ id: '1', name: 'Empresa Demo', cnpj: '12.345.678/0001-99' }] as TestCompany[],
  selectedCompany: {
    id: '1',
    name: 'Empresa Demo',
    cnpj: '12.345.678/0001-99',
  } as TestCompany | null,
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
  },
  clearActiveCompanyId: vi.fn(),
  deleteCookie: vi.fn(),
  getActiveCompanyId: vi.fn(() => '1'),
  setActiveCompanyId: vi.fn(),
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
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from '../Sidebar';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/intelligence',
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock('@/app/context/CompanyContext', () => ({
  useCompany: () => ({
    companies: [{ id: '1', name: 'Empresa Demo', cnpj: '12.345.678/0001-99' }],
    setCompanies: vi.fn(),
    selectedCompany: { id: '1', name: 'Empresa Demo', cnpj: '12.345.678/0001-99' },
    setSelectedCompany: vi.fn(),
  }),
}));

vi.mock('@/services/api', () => ({
  api: {
    defaults: { headers: { common: {} } },
    get: vi.fn(),
  },
  clearActiveCompanyId: vi.fn(),
  deleteCookie: vi.fn(),
  getActiveCompanyId: vi.fn(() => '1'),
  setActiveCompanyId: vi.fn(),
}));

describe('Sidebar', () => {
  it('renders the main navigation and company name', () => {
    render(<Sidebar />);

    expect(screen.getAllByText('Empresa Demo').length).toBeGreaterThan(0);
    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(screen.getByText('Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Documentos XML')).toBeInTheDocument();
  });
});

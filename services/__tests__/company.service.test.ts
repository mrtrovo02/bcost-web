import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGetMock = vi.fn();
const demoPolicyMock = vi.fn();
const isDemoSessionMock = vi.fn();

vi.mock('../api', () => ({
  api: {
    get: apiGetMock,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  getActiveCompanyId: vi.fn(() => null),
  setActiveCompanyId: vi.fn(),
  isDemoSession: isDemoSessionMock,
}));

vi.mock('@/lib/config/demo-policy', () => ({
  assertOperationalDemoFallbackEnabled: demoPolicyMock,
}));

describe('companyService demo policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDemoSessionMock.mockReturnValue(false);
    demoPolicyMock.mockImplementation(() => undefined);
  });

  it('usa API real para listar empresas fora da sessão demo', async () => {
    const { companyService } = await import('../company.service');
    apiGetMock.mockResolvedValueOnce({ data: [{ id: 'real-1', name: 'Empresa Real' }] });

    const companies = await companyService.getAll();

    expect(companies).toHaveLength(1);
    expect(companies[0]?.id).toBe('real-1');
    expect(demoPolicyMock).not.toHaveBeenCalled();
  });

  it('normaliza vinculos multiempresa retornados pelo backend', async () => {
    const { companyService } = await import('../company.service');
    apiGetMock.mockResolvedValueOnce({
      data: {
        data: [
          {
            companyId: 'amel-company-id',
            role: 'OWNER',
            company: {
              id: 'amel-company-id',
              name: 'Amel Contabilidade Digital LTDA',
              cnpj: '12.345.678/0001-10',
              taxRegime: 'SIMPLES_NACIONAL',
            },
          },
        ],
      },
    });

    const companies = await companyService.getAll();

    expect(companies).toEqual([
      expect.objectContaining({
        id: 'amel-company-id',
        name: 'Amel Contabilidade Digital LTDA',
        cnpj: '12.345.678/0001-10',
        role: 'OWNER',
      }),
    ]);
  });

  it('exige fallback operacional habilitado antes de retornar empresas demo', async () => {
    const { companyService } = await import('../company.service');
    isDemoSessionMock.mockReturnValue(true);

    await companyService.getAll();

    expect(demoPolicyMock).toHaveBeenCalledWith(
      'Empresas demonstrativas indisponíveis neste ambiente. Entre com uma conta real para acessar CNPJs de produção.',
    );
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('bloqueia empresas demo quando o fallback operacional esta desabilitado', async () => {
    const { companyService } = await import('../company.service');
    isDemoSessionMock.mockReturnValue(true);
    demoPolicyMock.mockImplementation(() => {
      throw new Error('DEMO_FALLBACK_DISABLED');
    });

    await expect(companyService.getAll()).rejects.toThrow('DEMO_FALLBACK_DISABLED');
    expect(apiGetMock).not.toHaveBeenCalled();
  });
});

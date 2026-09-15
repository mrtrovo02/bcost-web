import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  clearSession,
  createBcostTraceId,
  formatBcostApiErrorMessage,
  getBcostTraceIdFromError,
  getToken,
  isDemoSession,
  isMfaRequiredResponse,
  login,
  persistAuthResponse,
  resolveRequestAuthMetadata,
  resolveRequestCompanyId,
  resolveRequestHeaders,
  setStoredUser,
  setStoredToken,
  switchActiveCompany,
  verifyMfa,
} from '../api';

describe('isDemoSession', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'bcost_token=; path=/; max-age=0';
    document.cookie = 'bcost_access_token=; path=/; max-age=0';
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'true');
    vi.restoreAllMocks();
  });

  it('does not treat missing auth as a demo session', () => {
    expect(isDemoSession()).toBe(false);
  });

  it('does not enable demo implicitly on official bCost domains', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
        pathname: '/login',
        search: '',
        replace: vi.fn(),
      },
    });
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'false');
    localStorage.setItem('bcost_token', 'demo-token-local');

    expect(isDemoSession()).toBe(false);
  });

  it('drops stale demo tokens on official bCost domains when demo is disabled', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
        pathname: '/dashboard',
        search: '',
        replace: vi.fn(),
      },
    });
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'false');
    localStorage.setItem('bcost_token', 'demo-token-local');

    expect(getToken()).toBeNull();
    expect(resolveRequestHeaders(getToken(), 'demo-001')).toEqual({});
  });

  it('ignores readable real tokens on official bCost domains to avoid stale Authorization headers', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
        pathname: '/dashboard',
        search: '',
        replace: vi.fn(),
      },
    });
    localStorage.setItem('bcost_token', 'stale-real-jwt-with-null-company');

    expect(getToken()).toBeNull();
    expect(localStorage.getItem('bcost_token')).toBeNull();
    expect(resolveRequestHeaders(getToken(), 'company-real-001')).toEqual({});
  });

  it('does not classify stale demo company storage as demo session on official bCost domains', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
        pathname: '/dashboard',
        search: '',
        replace: vi.fn(),
      },
    });
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'true');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'true');
    vi.stubEnv('NEXT_PUBLIC_DEMO_ACCESS_MODE', 'controlled');
    localStorage.setItem('bcost_active_company', 'demo-001');
    localStorage.setItem('companyId', 'demo-001');

    expect(isDemoSession()).toBe(false);
    expect(resolveRequestHeaders(getToken(), 'demo-001')).toEqual({});
  });

  it('clears readable demo cookies when a real token is persisted on official bCost domains', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
        pathname: '/login',
        search: '',
        replace: vi.fn(),
      },
    });
    localStorage.setItem('bcost_token', 'demo-token-local');

    setStoredToken('real-jwt-token');

    expect(localStorage.getItem('bcost_token')).toBeNull();
    expect(getToken()).toBeNull();
  });

  it('purges stale demo token when a real user is stored on official bCost domains', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
        pathname: '/dashboard',
        search: '',
        replace: vi.fn(),
      },
    });
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'true');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK', 'true');
    vi.stubEnv('NEXT_PUBLIC_DEMO_ACCESS_MODE', 'controlled');
    localStorage.setItem('bcost_token', 'demo-token-local');
    localStorage.setItem(
      'bcost_user',
      JSON.stringify({
        id: '4e76c6d3-78c4-4d5d-b626-51aa3d760710',
        email: 'amandacontabil@bcost.com.br',
      }),
    );

    expect(getToken()).toBeNull();
    expect(isDemoSession()).toBe(false);
    expect(localStorage.getItem('bcost_token')).toBeNull();
  });

  it('does not persist stale demo company context for authenticated real users', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
        pathname: '/dashboard',
        search: '',
        replace: vi.fn(),
      },
    });
    localStorage.setItem('bcost_company_id', 'demo-001');
    localStorage.setItem('bcost_active_company', 'demo-001');
    localStorage.setItem(
      'bcost_active_company_data',
      JSON.stringify({
        id: 'demo-001',
        name: 'Empresa Demo',
      }),
    );

    setStoredUser({
      id: '4e76c6d3-78c4-4d5d-b626-51aa3d760710',
      email: 'amandacontabil@bcost.com.br',
      name: 'Amanda Narvaes',
      companyId: 'demo-001',
      activeCompanyId: 'demo-001',
      company: {
        id: 'demo-001',
        name: 'Empresa Demo',
      },
      companies: [
        {
          id: 'demo-001',
          name: 'Empresa Demo',
        },
      ],
    });

    expect(localStorage.getItem('bcost_company_id')).toBeNull();
    expect(localStorage.getItem('bcost_active_company')).toBeNull();
    expect(localStorage.getItem('bcost_active_company_data')).toBeNull();
    expect(localStorage.getItem('bcost_companies')).toBeNull();
    expect(localStorage.getItem('companies')).toBeNull();
    expect(localStorage.getItem('bcost_user')).toContain('Amanda Narvaes');
    expect(localStorage.getItem('bcost_user')).not.toContain('demo-001');
  });

  it('persists top-level real company over stale demo company embedded in authenticated user payload', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
        pathname: '/dashboard',
        search: '',
        replace: vi.fn(),
      },
    });

    persistAuthResponse({
      access_token: 'real-jwt-token',
      companyId: 'company-amel',
      companies: [
        {
          id: 'company-amel',
          name: 'Amel Contabilidade Digital LTDA',
          cnpj: '41.702.512/0001-87',
        },
      ],
      user: {
        id: '4e76c6d3-78c4-4d5d-b626-51aa3d760710',
        email: 'amandacontabil@bcost.com.br',
        name: 'Amanda Narvaes',
        companyId: 'demo-001',
        activeCompanyId: 'demo-001',
        company: {
          id: 'demo-001',
          name: 'Empresa Demo',
        },
        companies: [
          {
            id: 'demo-001',
            name: 'Empresa Demo',
          },
        ],
      },
    });

    expect(localStorage.getItem('bcost_company_id')).toBe('company-amel');
    expect(localStorage.getItem('bcost_active_company_data')).toContain(
      'Amel Contabilidade Digital LTDA',
    );
    expect(localStorage.getItem('bcost_user')).toContain('company-amel');
    expect(localStorage.getItem('bcost_user')).not.toContain('demo-001');
    expect(localStorage.getItem('bcost_companies')).not.toContain('Empresa Demo');
  });

  it('keeps local demo support on localhost during development', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'localhost',
        pathname: '/login',
        search: '',
        replace: vi.fn(),
      },
    });
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO', 'false');
    localStorage.setItem('bcost_token', 'demo-token-local');

    expect(isDemoSession()).toBe(true);
  });

  it('detects an explicit demo token as a demo session', () => {
    localStorage.setItem('bcost_token', 'demo-token-local');

    expect(isDemoSession()).toBe(true);
  });

  it('adds demo auth metadata for demo company context without a real token', () => {
    expect(resolveRequestAuthMetadata(null, 'demo-001')).toEqual({
      token: 'demo-token-local',
      isDemoRequest: true,
    });
  });

  it('does not downgrade a real token to demo auth even with stale demo company context', () => {
    expect(resolveRequestAuthMetadata('real-jwt-token', 'demo-001')).toEqual({
      token: 'real-jwt-token',
      isDemoRequest: false,
    });
  });

  it('does not send stale demo company id with real tokens', () => {
    expect(resolveRequestCompanyId('real-jwt-token', 'demo-001')).toBeNull();
  });

  it('keeps real company id with real tokens', () => {
    expect(resolveRequestCompanyId('real-jwt-token', 'company-real-001')).toBe(
      'company-real-001',
    );
  });

  it('does not send stale real company id without an authenticated token', () => {
    expect(resolveRequestCompanyId(null, 'company-real-001')).toBeNull();
    expect(resolveRequestHeaders(null, 'company-real-001')).toEqual({});
  });

  it('keeps demo company id when request has no real token', () => {
    expect(resolveRequestCompanyId(null, 'demo-001')).toBe('demo-001');
  });

  it('does not send a demo bypass header for explicit demo requests', () => {
    expect(resolveRequestHeaders('demo-token-local', 'demo-001')).toEqual({
      Authorization: 'Bearer demo-token-local',
      'x-company-id': 'demo-001',
    });
  });

  it('does not send demo session headers when a real token has stale demo context', () => {
    expect(resolveRequestHeaders('real-jwt-token', 'demo-001')).toEqual({
      Authorization: 'Bearer real-jwt-token',
    });
  });

  it('creates frontend trace IDs with the bCost web prefix', () => {
    expect(createBcostTraceId()).toMatch(/^web-/);
  });

  it('reuses the frontend trace ID during a short browser session', () => {
    const firstTraceId = createBcostTraceId();
    const secondTraceId = createBcostTraceId();

    expect(secondTraceId).toBe(firstTraceId);
    expect(sessionStorage.getItem('bcost_trace_id')).toBe(firstTraceId);
  });

  it('clears the frontend trace correlation when the auth session is cleared', () => {
    createBcostTraceId();

    clearSession();

    expect(sessionStorage.getItem('bcost_trace_id')).toBeNull();
    expect(sessionStorage.getItem('bcost_trace_id_expires_at')).toBeNull();
  });

  it('clears company storage before publishing the final empty session context', () => {
    const contextEvents: Array<{
      companyId?: string;
      companies?: unknown[];
      storedCompanyId: string | null;
    }> = [];
    window.localStorage.setItem('bcost_user', JSON.stringify({ id: 'user-real', email: 'real@bcost.com.br' }));
    window.localStorage.setItem('bcost_company_id', 'company-real-001');
    window.localStorage.setItem(
      'bcost_active_company_data',
      JSON.stringify({ id: 'company-real-001', name: 'Empresa Real' }),
    );
    window.addEventListener('bcost:company-context-updated', (event) => {
      const detail = (event as CustomEvent<{ companyId?: string; companies?: unknown[] }>).detail;
      contextEvents.push({
        ...detail,
        storedCompanyId: window.localStorage.getItem('bcost_company_id'),
      });
    });

    clearSession();

    expect(window.localStorage.getItem('bcost_company_id')).toBeNull();
    expect(window.localStorage.getItem('bcost_active_company_data')).toBeNull();
    expect(contextEvents.at(-1)).toEqual({
      companyId: undefined,
      companies: [],
      storedCompanyId: null,
    });
  });

  it('overwrites stale per-call auth and tenant headers through the axios interceptor', async () => {
    localStorage.setItem('bcost_token', 'real-jwt-token');
    localStorage.setItem('bcost_company_id', 'company-real-001');

    let capturedHeaders: Record<string, string | undefined> = {};

    await api.get('/secure-route', {
      headers: {
        Authorization: 'Bearer stale-token',
        'x-company-id': 'demo-001',
        'x-demo-session': 'true',
        'x-bcost-trace-id': 'stale-trace-id',
      },
      adapter: async (config) => {
        capturedHeaders = JSON.parse(JSON.stringify(config.headers)) as Record<
          string,
          string | undefined
        >;

        return {
          data: {},
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      },
    });

    expect(capturedHeaders.Authorization).toBe('Bearer real-jwt-token');
    expect(capturedHeaders['x-company-id']).toBe('company-real-001');
    expect(capturedHeaders['x-demo-session']).toBeUndefined();
    expect(capturedHeaders['x-bcost-trace-id']).toMatch(/^web-/);
    expect(capturedHeaders['x-bcost-trace-id']).not.toBe('stale-trace-id');
  });

  it('exposes the backend trace ID on failed API responses', async () => {
    const traceId = 'api-trace-001';
    const error = await api
      .get('/fails-with-trace', {
        adapter: async (config) => {
          throw {
            isAxiosError: true,
            config,
            response: {
              status: 500,
              headers: {
                'x-bcost-trace-id': traceId,
              },
              data: {
                message: 'database unavailable',
              },
            },
          };
        },
      })
      .catch((caught: unknown) => caught);

    expect(getBcostTraceIdFromError(error)).toBe(traceId);
    expect(error).toMatchObject({ bcostTraceId: traceId });
  });

  it('does not attempt refresh when the backend reports a revoked session', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'app.bcost.com.br',
        pathname: '/dashboard',
        search: '',
        replace: vi.fn(),
      },
    });
    localStorage.setItem('bcost_user', JSON.stringify({ id: 'user-real', email: 'real@bcost.com.br' }));
    localStorage.setItem('bcost_company_id', 'company-real-001');
    const postSpy = vi.spyOn(api, 'post');

    await api
      .get('/auth/me', {
        adapter: async (config) => {
          throw {
            isAxiosError: true,
            config,
            response: {
              status: 401,
              headers: {
                'x-bcost-trace-id': 'revoked-trace-001',
              },
              data: {
                statusCode: 401,
                message: 'Sessão revogada: faça login novamente para continuar.',
              },
            },
          };
        },
      })
      .catch((caught: unknown) => caught);

    expect(postSpy).not.toHaveBeenCalledWith('/auth/refresh');
    expect(localStorage.getItem('bcost_user')).toBeNull();
    expect(localStorage.getItem('bcost_company_id')).toBeNull();
    expect(window.location.replace).toHaveBeenCalledWith(
      expect.stringContaining('/login?session=expired'),
    );
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        hostname: 'localhost',
        pathname: '/login',
        search: '',
        replace: vi.fn(),
      },
    });
  });

  it('falls back to the request trace ID when the response has no trace header', async () => {
    const error = await api
      .get('/fails-without-response-trace', {
        adapter: async (config) => {
          throw {
            isAxiosError: true,
            config,
            response: {
              status: 503,
              headers: {},
              data: {
                message: 'upstream unavailable',
              },
            },
          };
        },
      })
      .catch((caught: unknown) => caught);

    expect(getBcostTraceIdFromError(error)).toMatch(/^web-/);
    expect(error).toMatchObject({ bcostTraceId: expect.stringMatching(/^web-/) });
  });

  it('reads the backend trace ID from RFC 7807 problem details when headers are unavailable', async () => {
    const error = await api
      .get('/fails-with-problem-details', {
        adapter: async (config) => {
          throw {
            isAxiosError: true,
            config,
            response: {
              status: 400,
              headers: {},
              data: {
                type: 'https://docs.bcost.com.br/problems/bad-request',
                title: 'Bad Request',
                status: 400,
                traceId: 'problem-trace-001',
                requestId: 'problem-trace-001',
                message: 'payload invalido',
              },
            },
          };
        },
      })
      .catch((caught: unknown) => caught);

    expect(getBcostTraceIdFromError(error)).toBe('problem-trace-001');
    expect(error).toMatchObject({ bcostTraceId: 'problem-trace-001' });
  });

  it('formats API errors with problem detail messages and support trace IDs', () => {
    const message = formatBcostApiErrorMessage(
      {
        isAxiosError: true,
        config: {},
        response: {
          status: 503,
          headers: {},
          data: {
            type: 'https://docs.bcost.com.br/problems/service-unavailable',
            title: 'Service Unavailable',
            status: 503,
            traceId: 'problem-trace-002',
            message: 'Gateway de pagamento indisponível.',
          },
        },
      },
      'Não foi possível processar a operação.',
    );

    expect(message).toBe('Gateway de pagamento indisponível. Código de suporte: problem-trace-002');
  });

  it('formats non-Axios errors without inventing support codes', () => {
    expect(
      formatBcostApiErrorMessage(
        new Error('Empresa ativa não encontrada para iniciar cobrança.'),
        'Não foi possível processar a operação.',
      ),
    ).toBe('Empresa ativa não encontrada para iniciar cobrança.');
  });

  it('does not persist an MFA challenge as an authenticated session', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        access_token: null,
        mfaRequired: true,
        mfaSession: 'mfa-session-001',
        user: {
          id: 'user-001',
          email: 'amandacontabil@bcost.com.br',
          name: 'Amanda',
        },
      },
    });

    const response = await login('amandacontabil@bcost.com.br', 'secure-password');

    expect(isMfaRequiredResponse(response)).toBe(true);
    expect(getToken()).toBeNull();
    expect(localStorage.getItem('bcost_user')).toBeNull();
  });

  it('persists the authenticated session only after MFA verification', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'jwt-after-mfa',
        refresh_token: 'refresh-after-mfa',
        user: {
          id: 'user-001',
          email: 'amandacontabil@bcost.com.br',
          name: 'Amanda',
          companyId: 'company-amel',
        },
        companyId: 'company-amel',
        companies: [
          {
            id: 'company-amel',
            name: 'Amel Contabilidade Digital LTDA',
            cnpj: '00.000.000/0001-00',
          },
        ],
      },
    });

    const response = await verifyMfa('mfa-session-001', '123456');

    expect(response.access_token).toBe('jwt-after-mfa');
    expect(getToken()).toBe('jwt-after-mfa');
    expect(localStorage.getItem('bcost_company_id')).toBe('company-amel');
  });

  it('persists normalized linked companies from real login responses', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'real-jwt-token',
        user: {
          id: 'user-001',
          email: 'amandacontabil@bcost.com.br',
          name: 'Amanda Narvaes',
          companies: [
            {
              companyId: 'company-amel',
              role: 'ACCOUNTANT',
              company: {
                id: 'company-amel',
                name: 'Amel Contabilidade Digital LTDA',
                cnpj: '12.345.678/0001-10',
              },
            },
          ],
        },
      },
    });

    await login('amandacontabil@bcost.com.br', 'secure-password');

    const storedCompanies = JSON.parse(localStorage.getItem('bcost_companies') ?? '[]') as Array<{
      id: string;
      name: string;
      role?: string;
    }>;

    expect(localStorage.getItem('bcost_company_id')).toBe('company-amel');
    expect(storedCompanies).toEqual([
      expect.objectContaining({
        id: 'company-amel',
        name: 'Amel Contabilidade Digital LTDA',
        role: 'ACCOUNTANT',
      }),
    ]);
  });

  it('filters stale demo companies from real login responses before persisting context', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'real-jwt-token',
        companyId: 'demo-001',
        user: {
          id: 'user-amanda',
          email: 'amandacontabil@bcost.com.br',
          name: 'Amanda Narvaes',
          activeCompanyId: 'demo-001',
          companies: [
            {
              id: 'demo-001',
              name: 'Empresa Demo',
            },
            {
              id: 'company-amel',
              name: 'Amel Contabilidade Digital LTDA',
              cnpj: '41.702.512/0001-87',
            },
          ],
        },
      },
    });

    await login('amandacontabil@bcost.com.br', 'secure-password');

    expect(localStorage.getItem('bcost_company_id')).toBe('company-amel');
    expect(localStorage.getItem('bcost_active_company_data')).toContain('company-amel');
    expect(localStorage.getItem('bcost_active_company_data')).not.toContain('demo-001');
    expect(localStorage.getItem('bcost_companies')).toContain('company-amel');
    expect(localStorage.getItem('bcost_companies')).not.toContain('demo-001');
  });

  it('persists the complete auth contract returned by switch-company', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'jwt-company-amel',
        companyId: 'company-amel',
        activeCompanyId: 'company-amel',
        companies: [
          {
            id: 'company-amel',
            name: 'Amel Contabilidade Digital LTDA',
            cnpj: '12.345.678/0001-10',
          },
        ],
        user: {
          id: 'user-amanda',
          email: 'amandacontabil@bcost.com.br',
          name: 'Amanda Narvaes',
          activeCompanyId: 'company-amel',
          companies: [
            {
              id: 'company-amel',
              name: 'Amel Contabilidade Digital LTDA',
              cnpj: '12.345.678/0001-10',
            },
          ],
        },
      },
    });

    await switchActiveCompany('company-amel');

    expect(api.post).toHaveBeenCalledWith('/auth/switch-company', { companyId: 'company-amel' }, undefined);
    expect(getToken()).toBe('jwt-company-amel');
    expect(localStorage.getItem('bcost_company_id')).toBe('company-amel');
    expect(localStorage.getItem('bcost_active_company_data')).toContain(
      'Amel Contabilidade Digital LTDA',
    );
  });

  it('stores the active company on the user profile instead of the first company', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'jwt-company-amel',
        companyId: 'company-amel',
        activeCompanyId: 'company-amel',
        companies: [
          {
            id: 'company-first',
            name: 'Primeira Empresa LTDA',
            cnpj: '11.111.111/0001-91',
          },
          {
            id: 'company-amel',
            name: 'Amel Contabilidade Digital LTDA',
            cnpj: '22.222.222/0001-91',
          },
        ],
        user: {
          id: 'user-amanda',
          email: 'amandacontabil@bcost.com.br',
          name: 'Amanda Narvaes',
          activeCompanyId: 'company-amel',
          companies: [
            {
              id: 'company-first',
              name: 'Primeira Empresa LTDA',
              cnpj: '11.111.111/0001-91',
            },
            {
              id: 'company-amel',
              name: 'Amel Contabilidade Digital LTDA',
              cnpj: '22.222.222/0001-91',
            },
          ],
        },
      },
    });

    await switchActiveCompany('company-amel');

    const storedUser = JSON.parse(localStorage.getItem('bcost_user') ?? '{}') as {
      company?: { id?: string; name?: string };
    };

    expect(storedUser.company).toEqual(
      expect.objectContaining({
        id: 'company-amel',
        name: 'Amel Contabilidade Digital LTDA',
      }),
    );
  });
});

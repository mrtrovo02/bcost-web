import { describe, expect, it } from 'vitest';

import { normalizeCompanyPayload } from '../company-normalizer';

describe('normalizeCompanyPayload', () => {
  it('normaliza empresas vindas de vinculos companyUsers', () => {
    const companies = normalizeCompanyPayload({
      companyUsers: [
        {
          role: 'MANAGER',
          companyId: 'company-amel',
          company: {
            id: 'company-amel',
            name: 'Amel Contabilidade Digital LTDA',
            cnpj: '22222222000191',
            taxRegime: 'SIMPLES_NACIONAL',
          },
        },
      ],
    });

    expect(companies).toEqual([
      expect.objectContaining({
        id: 'company-amel',
        name: 'Amel Contabilidade Digital LTDA',
        cnpj: '22222222000191',
        role: 'MANAGER',
        taxRegime: 'SIMPLES_NACIONAL',
      }),
    ]);
  });

  it('normaliza envelopes data.user.companies usados por APIs autenticadas', () => {
    const companies = normalizeCompanyPayload({
      data: {
        user: {
          companies: [
            {
              id: 'company-amel',
              name: 'Amel Contabilidade Digital LTDA',
              cnpj: '22222222000191',
            },
          ],
        },
      },
    });

    expect(companies).toEqual([
      expect.objectContaining({
        id: 'company-amel',
        name: 'Amel Contabilidade Digital LTDA',
      }),
    ]);
  });

  it('normaliza paginas data.items com vinculos companyUsers retornados por /company', () => {
    const companies = normalizeCompanyPayload({
      data: {
        items: [
          {
            companyId: 'company-amel',
            role: 'OWNER',
            status: 'ACTIVE',
            company: {
              id: 'company-amel',
              legalName: 'Amel Contabilidade Digital LTDA',
              documentNumber: '41.702.512/0001-87',
              regimeTributario: 'SIMPLES_NACIONAL',
              planLevel: 'ENTERPRISE',
            },
          },
        ],
        total: 1,
        limit: 25,
        offset: 0,
      },
    });

    expect(companies).toEqual([
      expect.objectContaining({
        id: 'company-amel',
        name: 'Amel Contabilidade Digital LTDA',
        cnpj: '41.702.512/0001-87',
        taxRegime: 'SIMPLES_NACIONAL',
        role: 'OWNER',
        status: 'ACTIVE',
        planLevel: 'ENTERPRISE',
      }),
    ]);
  });

  it('normaliza records paginados com campos snake_case sem descartar empresa real', () => {
    const companies = normalizeCompanyPayload({
      records: [
        {
          company_id: 'company-amel',
          companyName: 'Amel Contabilidade Digital LTDA',
          role: 'ACCOUNTANT',
          plan: 'PRO',
        },
      ],
      hasMore: false,
    });

    expect(companies).toEqual([
      expect.objectContaining({
        id: 'company-amel',
        name: 'Amel Contabilidade Digital LTDA',
        role: 'ACCOUNTANT',
        plan: 'PRO',
      }),
    ]);
  });
});

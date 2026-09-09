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
});

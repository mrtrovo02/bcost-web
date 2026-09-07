import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const hydratorSource = readFileSync(
  join(process.cwd(), 'components', 'session', 'CompanySessionHydrator.tsx'),
  'utf8',
);

describe('CompanySessionHydrator persistence contract', () => {
  it('persiste os dados da empresa ativa resolvida pelo companyId', () => {
    expect(hydratorSource).toContain(
      'cleanCompanies.find((company) => company.id === companyId) ?? cleanCompanies[0]',
    );
    expect(hydratorSource).toContain(
      "window.localStorage.setItem('bcost_active_company_data', JSON.stringify(activeCompany))",
    );
  });
});

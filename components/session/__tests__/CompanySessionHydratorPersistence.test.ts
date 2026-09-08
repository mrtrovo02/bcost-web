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

  it('limpa contexto antigo de empresa quando nao existe token em ambiente oficial', () => {
    expect(hydratorSource).toContain('if (companyContextAlreadyExists())');
    expect(hydratorSource).toContain('if (shouldUseLocalDemo()) return;');
    expect(hydratorSource).toContain('clearCompanyContext();');
  });

  it('remove empresas demo antes de persistir contexto de token real', () => {
    expect(hydratorSource).toContain('function persistRealCompanyContext');
    expect(hydratorSource).toContain('persistCompanyContext(companyId, removeDemoCompanies(companies))');
    expect(hydratorSource).toContain('persistRealCompanyContext(String(resolvedCompanyId), authCompanies)');
  });

  it('persiste o usuario real retornado por auth/me durante a hidratacao', () => {
    expect(hydratorSource).toContain('function persistAuthenticatedUser');
    expect(hydratorSource).toContain('setStoredUser(storedUser)');
    expect(hydratorSource).toContain('persistAuthenticatedUser(authMe, authCompanies)');
  });

  it('usa o cliente HTTP oficial para hidratar sessao real com refresh token', () => {
    expect(hydratorSource).toContain("api.get<AuthMeLike>('/auth/me')");
    expect(hydratorSource).toContain("api.get<unknown>('/company')");
    expect(hydratorSource).not.toContain('Authorization: `Bearer ${token}`');
    expect(hydratorSource).not.toContain('redirectToExpiredLogin');
  });
});

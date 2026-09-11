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

  it('normaliza payloads de empresas salvos no storage antes de restaurar a sessao', () => {
    expect(hydratorSource).toContain('const companies = normalizeCompanies(parsed);');
    expect(hydratorSource).toContain('if (companies.length > 0)');
    expect(hydratorSource).not.toContain('return parsed.filter((company) => company?.id);');
  });

  it('usa o cliente HTTP oficial para hidratar sessao real com refresh token', () => {
    expect(hydratorSource).toContain("api.get<AuthMeLike>('/auth/me')");
    expect(hydratorSource).toContain("api.get<unknown>('/company')");
    expect(hydratorSource).not.toContain('Authorization: `Bearer ${token}`');
    expect(hydratorSource).not.toContain('redirectToExpiredLogin');
  });

  it('sonda sessao real HttpOnly no host oficial mesmo sem token legivel', () => {
    expect(hydratorSource).toContain('function isOfficialBcostHost');
    expect(hydratorSource).toContain('if (isOfficialBcostHost())');
    expect(hydratorSource).toContain('const hydratedRealSession = await hydrateOfficialRealSession(() => cancelled)');
    expect(hydratorSource).toContain('const authMe = await fetchAuthMe().catch(() => null)');
    expect(hydratorSource).toContain('if (authCompanyId && !isDemoCompanyId(authCompanyId))');
  });

  it('remove token demo contaminado quando existe usuario real armazenado no host oficial', () => {
    expect(hydratorSource).toContain('function hasStoredRealUser');
    expect(hydratorSource).toContain(
      'if (cookieToken === DEMO_TOKEN && isOfficialBcostHost() && hasStoredRealUser())',
    );
    expect(hydratorSource).toContain(
      'if (legacyToken === DEMO_TOKEN && isOfficialBcostHost() && hasStoredRealUser())',
    );
  });

  it('cria contexto minimo quando auth/me possui empresa ativa mas lista ainda nao chegou', () => {
    expect(hydratorSource).toContain('const authCompanyId = firstString(');
    expect(hydratorSource).toContain(
      'if (authCompanies.length === 0 && authCompanyId && !isDemoCompanyId(authCompanyId))',
    );
    expect(hydratorSource).toContain("name: 'Empresa vinculada'");
  });

  it('nao força reload da pagina ao hidratar empresa real', () => {
    expect(hydratorSource).not.toContain('window.location.reload()');
    expect(hydratorSource).not.toContain('bcost_company_context_reloaded_once');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const apiSource = readFileSync(join(process.cwd(), 'services', 'api.ts'), 'utf8');

describe('api source contract', () => {
  it('never sends legacy demo session headers to the backend', () => {
    expect(apiSource).toContain("delete config.headers['x-demo-session']");
    expect(apiSource).not.toContain("config.headers['x-demo-session'] =");
    expect(apiSource).not.toContain('"x-demo-session":');
    expect(apiSource).not.toContain("'x-demo-session':");
  });

  it('keeps real-token precedence over demo company context', () => {
    expect(apiSource).toContain('const hasRealToken = Boolean(token && token !== DEMO_TOKEN)');
    expect(apiSource).toContain('if (hasRealToken && isDemoId(companyId)) return null;');
    expect(apiSource).toContain('if (token && !hasDemoToken) return false;');
  });

  it('keeps logout deterministic and clears all client-readable session context', () => {
    expect(apiSource).toContain("await apiPost('/auth/logout').catch(() => undefined);");
    expect(apiSource).toContain('clearSession();');
    expect(apiSource).toContain('clearToken();');
    expect(apiSource).toContain('clearRefreshToken();');
    expect(apiSource).toContain('clearStoredCompanyData();');
    expect(apiSource).toContain('clearStoredUser();');
    expect(apiSource).toContain("window.sessionStorage.removeItem('bcost_company_context_reloaded_once');");
  });
});

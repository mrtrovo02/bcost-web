import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('CompaniesPage company loading contract', () => {
  it('delegates company loading to TanStack Query so demo and real sessions share policy rules', () => {
    const source = readFileSync(join(process.cwd(), 'app/dashboard/companies/page.tsx'), 'utf8');

    expect(source).toContain('useCompaniesQuery()');
    expect(source).not.toContain('await companyService.getAll()');
    expect(source).not.toContain('if (isDemoSession) {\n        return;\n      }');
  });
});

import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { bcostSchemaModules } from '../schema-modules';

function routeHasPage(route: string) {
  const appDir = path.join(process.cwd(), 'app');
  const relativeRoute = route.replace(/^\//, '');
  const staticPage = path.join(appDir, relativeRoute, 'page.tsx');

  if (existsSync(staticPage)) return true;

  if (route.startsWith('/dashboard/modules/')) {
    return existsSync(path.join(appDir, 'dashboard', 'modules', '[slug]', 'page.tsx'));
  }

  if (route.startsWith('/dashboard/enterprise/modules/')) {
    return existsSync(path.join(appDir, 'dashboard', 'enterprise', 'modules', '[slug]', 'page.tsx'));
  }

  return false;
}

describe('bcostSchemaModules routes', () => {
  it('usa slugs unicos', () => {
    const slugs = bcostSchemaModules.map((module) => module.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('aponta todas as rotas internas para paginas existentes ou rotas dinamicas cobertas', () => {
    const missingRoutes = bcostSchemaModules
      .map((module) => module.route)
      .filter((route) => route.startsWith('/'))
      .filter((route) => !routeHasPage(route));

    expect(missingRoutes).toEqual([]);
  });
});

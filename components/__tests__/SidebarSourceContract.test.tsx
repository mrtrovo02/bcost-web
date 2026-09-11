import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sidebarSource = readFileSync(
  join(process.cwd(), 'components', 'Sidebar.tsx'),
  'utf8',
);

describe('Sidebar source contract', () => {
  it('nao usa limpeza global de storage no logout', () => {
    expect(sidebarSource).not.toContain('localStorage.clear()');
    expect(sidebarSource).not.toContain('sessionStorage.clear()');
    expect(sidebarSource).toContain('clearSession()');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Sidebar navigation responsiveness contract', () => {
  const source = readFileSync(join(process.cwd(), 'components', 'Sidebar.tsx'), 'utf8');

  it('keeps logout redirect timeout under one second', () => {
    expect(source).toContain('const LOGOUT_REDIRECT_TIMEOUT_MS = 800;');
  });

  it('keeps sidebar route prefetch disabled for heavy dashboard navigation', () => {
    expect(source).toContain('prefetch={false}');
  });
});

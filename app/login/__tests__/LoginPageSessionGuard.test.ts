import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const loginPageSource = readFileSync(join(process.cwd(), 'app', 'login', 'page.tsx'), 'utf8');

describe('LoginPage session guard', () => {
  it('limpa sessão demonstrativa bloqueada pelo proxy em host oficial', () => {
    expect(loginPageSource).toContain("params.get('session') === 'demo-disabled'");
    expect(loginPageSource).toContain('clearSession()');
    expect(loginPageSource).toContain("window.history.replaceState(null, '', '/login')");
    expect(loginPageSource).toContain('conta real');
  });
});

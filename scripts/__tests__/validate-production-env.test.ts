import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

type ReleaseCheckResult = {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
};

const scriptPath = resolve(process.cwd(), 'scripts', 'validate-production-env.cjs');
const tempDirectories: string[] = [];
const protectedProxySource = `
export const config = {
  matcher: ['/dashboard/:path*', '/upload-xml/:path*', '/login'],
};
const demoToken = 'demo-token-local';
const demoDisabledReason = 'demo-disabled';
function isControlledDemoAccessEnabled() {
  return true;
}
const disallowedDemoSessionOnOfficialHost = false;
const companyCookie = 'bcost_company_id';
void demoToken;
void demoDisabledReason;
void isControlledDemoAccessEnabled;
void disallowedDemoSessionOnOfficialHost;
void companyCookie;
`;

const baseEnv: NodeJS.ProcessEnv = {
  PATH: process.env.PATH,
  Path: process.env.Path,
  SystemRoot: process.env.SystemRoot,
  WINDIR: process.env.WINDIR,
  NODE_ENV: 'production',
  NEXT_PUBLIC_API_URL: 'https://api.bcost.com.br/api/v1',
  NEXT_PUBLIC_API_BASE_URL: 'https://api.bcost.com.br/api/v1',
  INTERNAL_API_URL: 'http://127.0.0.1:5000',
  NEXT_PUBLIC_SOCKET_URL: 'https://api.bcost.com.br',
  NEXT_PUBLIC_ENABLE_DEMO: 'false',
  NEXT_PUBLIC_ENABLE_DEMO_FALLBACK: 'false',
  NEXT_PUBLIC_DEMO_ACCESS_MODE: 'disabled',
  NEXT_PUBLIC_APP_URL: 'https://app.bcost.com.br',
};

function runReleaseCheck(
  overrides: Partial<NodeJS.ProcessEnv> = {},
  options: {
    readonly writeProxy?: boolean;
    readonly proxySource?: string;
    readonly nextConfigSource?: string;
  } = {},
): ReleaseCheckResult {
  const tempDirectory = mkdtempSync(join(tmpdir(), 'bcost-web-release-check-'));
  tempDirectories.push(tempDirectory);

  if (options.writeProxy !== false) {
    writeFileSync(
      join(tempDirectory, 'proxy.ts'),
      options.proxySource ?? protectedProxySource,
      'utf8',
    );
  }

  if (options.nextConfigSource) {
    writeFileSync(join(tempDirectory, 'next.config.ts'), options.nextConfigSource, 'utf8');
  }

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: tempDirectory,
    env: {
      ...baseEnv,
      ...overrides,
    },
    encoding: 'utf8',
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('frontend production release gate', () => {
  it('aprova um ambiente oficial com API, app e demo corretamente configurados', () => {
    const result = runReleaseCheck();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Release check aprovado');
  });

  it('bloqueia API pública sem o prefixo /api/v1', () => {
    const result = runReleaseCheck({
      NEXT_PUBLIC_API_URL: 'https://api.bcost.com.br',
      NEXT_PUBLIC_API_BASE_URL: 'https://api.bcost.com.br',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_API_URL');
    expect(result.stderr).toContain('/api/v1');
  });

  it('bloqueia drift entre NEXT_PUBLIC_API_URL e NEXT_PUBLIC_API_BASE_URL', () => {
    const result = runReleaseCheck({
      NEXT_PUBLIC_API_URL: 'https://api.bcost.com.br/api/v1',
      NEXT_PUBLIC_API_BASE_URL: 'https://api.bcost.com.br/api/v1/',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_API_BASE_URL');
    expect(result.stderr).toContain('evitar drift');
  });

  it('bloqueia build oficial fora de NODE_ENV production', () => {
    const result = runReleaseCheck({ NODE_ENV: 'development' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NODE_ENV');
  });

  it('bloqueia demo pública habilitada no host oficial', () => {
    const result = runReleaseCheck({ NEXT_PUBLIC_ENABLE_DEMO: 'true' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_ENABLE_DEMO');
  });

  it('aprova demo controlada quando demo e fallback estao explicitamente alinhados', () => {
    const result = runReleaseCheck({
      NEXT_PUBLIC_ENABLE_DEMO: 'true',
      NEXT_PUBLIC_ENABLE_DEMO_FALLBACK: 'true',
      NEXT_PUBLIC_DEMO_ACCESS_MODE: 'controlled',
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('Demo controlada habilitada');
  });

  it('bloqueia demo parcial sem modo controlled', () => {
    const result = runReleaseCheck({
      NEXT_PUBLIC_ENABLE_DEMO: 'true',
      NEXT_PUBLIC_ENABLE_DEMO_FALLBACK: 'true',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_DEMO_ACCESS_MODE');
  });

  it('bloqueia producao estrita sem modo de demo explicitamente disabled', () => {
    const result = runReleaseCheck({
      NEXT_PUBLIC_DEMO_ACCESS_MODE: '',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_DEMO_ACCESS_MODE');
    expect(result.stderr).toContain('disabled');
  });

  it('bloqueia app público apontando para origem não oficial', () => {
    const result = runReleaseCheck({ NEXT_PUBLIC_APP_URL: 'https://preview.bcost.com.br' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_APP_URL');
    expect(result.stderr).toContain('https://app.bcost.com.br');
  });

  it('bloqueia release oficial sem proteção server-side das rotas privadas', () => {
    const result = runReleaseCheck({}, { writeProxy: false });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('proxy.ts');
    expect(result.stderr).toContain('/dashboard/*');
  });

  it('bloqueia proxy sem regra explicita para demo controlada no host oficial', () => {
    const result = runReleaseCheck({}, {
      proxySource: `
export const config = {
  matcher: ['/dashboard/:path*', '/upload-xml/:path*', '/login'],
};
const demoToken = 'demo-token-local';
const demoDisabledReason = 'demo-disabled';
const companyCookie = 'bcost_company_id';
void demoToken;
void demoDisabledReason;
void companyCookie;
`,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('isControlledDemoAccessEnabled');
  });

  it('bloqueia CSP permissiva quando o gate enterprise e explicitamente ativado', () => {
    const result = runReleaseCheck(
      { BCOST_ENFORCE_STRICT_CSP: 'true' },
      {
        nextConfigSource: `
export default {
  async headers() {
    return [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: "script-src 'self' 'unsafe-inline' 'unsafe-eval'" }] }];
  },
};
`,
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Content-Security-Policy');
    expect(result.stderr).toContain('venda enterprise ampla');
  });
});

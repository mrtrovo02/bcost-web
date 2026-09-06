import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
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
  NEXT_PUBLIC_APP_URL: 'https://app.bcost.com.br',
};

function runReleaseCheck(overrides: Partial<NodeJS.ProcessEnv> = {}): ReleaseCheckResult {
  const tempDirectory = mkdtempSync(join(tmpdir(), 'bcost-web-release-check-'));
  tempDirectories.push(tempDirectory);

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

  it('bloqueia demo pública habilitada no host oficial', () => {
    const result = runReleaseCheck({ NEXT_PUBLIC_ENABLE_DEMO: 'true' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_ENABLE_DEMO');
  });

  it('bloqueia app público apontando para origem não oficial', () => {
    const result = runReleaseCheck({ NEXT_PUBLIC_APP_URL: 'https://preview.bcost.com.br' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEXT_PUBLIC_APP_URL');
    expect(result.stderr).toContain('https://app.bcost.com.br');
  });
});

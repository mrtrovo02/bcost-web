import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const scannerSource = readFileSync(
  join(process.cwd(), 'scripts', 'check-versioned-secrets.cjs'),
  'utf8',
);

describe('frontend security scanner', () => {
  it('mantem bloqueio para arquivos .env reais versionados', () => {
    expect(scannerSource).toContain('isForbiddenTrackedEnvFile');
    expect(scannerSource).toContain('arquivo de ambiente real nao deve ser versionado');
    expect(scannerSource).toContain("fileName.endsWith('.example')");
  });

  it('bloqueia escrita direta de tokens reais em localStorage no codigo produtivo', () => {
    expect(scannerSource).toContain('clientReadableTokenKeys');
    expect(scannerSource).toContain('clientReadableTokenWritePattern');
    expect(scannerSource).toContain('escrita direta de token real em localStorage');
    expect(scannerSource).toContain('DEMO_TOKEN');
    expect(scannerSource).toContain('demo-token-local');
  });

  it('executa o security scan completo sem achados no estado atual', () => {
    const result = spawnSync(process.execPath, ['scripts/check-versioned-secrets.cjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.stderr ?? '').toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout ?? '').toContain('Security scan aprovado');
  });
});

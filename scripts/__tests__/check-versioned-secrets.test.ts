import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const scannerSource = readFileSync(
  join(process.cwd(), 'scripts', 'check-versioned-secrets.cjs'),
  'utf8',
);
const pullRequestTemplateSource = readFileSync(
  join(process.cwd(), '.github', 'pull_request_template.md'),
  'utf8',
);
const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
  readonly scripts?: Record<string, string>;
};

describe('frontend security scanner', () => {
  it('expoe aliases npm estaveis para a varredura de segredos versionados', () => {
    expect(packageJson.scripts?.['security:scan']).toBe('node scripts/check-versioned-secrets.cjs');
    expect(packageJson.scripts?.['check:versioned-secrets']).toBe(
      'node scripts/check-versioned-secrets.cjs',
    );
  });

  it('mantem checklist de PR apontando para o scanner operacional de segredos', () => {
    expect(pullRequestTemplateSource).toContain('npm run check:versioned-secrets');
    expect(pullRequestTemplateSource).toContain('npm run security:scan');
  });

  it('mantem bloqueio para arquivos .env reais versionados', () => {
    expect(scannerSource).toContain('isForbiddenTrackedEnvFile');
    expect(scannerSource).toContain('arquivo de ambiente real nao deve ser versionado');
    expect(scannerSource).toContain("fileName.endsWith('.example')");
  });

  it('mantem bloqueio para chaves e certificados versionados', () => {
    expect(scannerSource).toContain('isForbiddenTrackedSecretArtifact');
    expect(scannerSource).toContain("'.pem'");
    expect(scannerSource).toContain("'.p12'");
    expect(scannerSource).toContain("'id_rsa'");
    expect(scannerSource).toContain('artefato criptografico nao deve ser versionado');
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

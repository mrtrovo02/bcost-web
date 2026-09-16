import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const deployVerifySource = readFileSync(
  join(process.cwd(), 'scripts', 'verify-deploy-state.cjs'),
  'utf8',
);
const agentsSource = readFileSync(join(process.cwd(), 'AGENTS.md'), 'utf8');

describe('frontend deploy verification contract', () => {
  it('keeps production release check before public smoke tests', () => {
    const releaseCheckIndex = deployVerifySource.indexOf("runNpmScript('release:check')");
    const sessionIndex = deployVerifySource.indexOf("runNpmScript('test:session')");
    const proxyIndex = deployVerifySource.indexOf("runNpmScript('test:proxy')");
    const taxScenariosIndex = deployVerifySource.indexOf("runNpmScript('test:tax-scenarios')");
    const smokeIndex = deployVerifySource.indexOf("runNpmScript('smoke:production')");

    expect(releaseCheckIndex).toBeGreaterThan(-1);
    expect(sessionIndex).toBeGreaterThan(-1);
    expect(proxyIndex).toBeGreaterThan(-1);
    expect(taxScenariosIndex).toBeGreaterThan(-1);
    expect(smokeIndex).toBeGreaterThan(-1);
    expect(releaseCheckIndex).toBeLessThan(sessionIndex);
    expect(sessionIndex).toBeLessThan(proxyIndex);
    expect(proxyIndex).toBeLessThan(taxScenariosIndex);
    expect(taxScenariosIndex).toBeLessThan(smokeIndex);
    expect(releaseCheckIndex).toBeLessThan(smokeIndex);
  });

  it('documents deterministic frontend build version injection in the EC2 runbook', () => {
    expect(agentsSource).toContain('export BUILD_VERSION="$(git rev-parse --short HEAD)"');
    expect(agentsSource).toContain('export NEXT_PUBLIC_BUILD_VERSION="$BUILD_VERSION"');
    expect(agentsSource).toContain('pm2 restart bcost-web --update-env');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const deployVerifySource = readFileSync(
  join(process.cwd(), 'scripts', 'verify-deploy-state.cjs'),
  'utf8',
);

describe('frontend deploy verification contract', () => {
  it('keeps production release check before public smoke tests', () => {
    const releaseCheckIndex = deployVerifySource.indexOf("runNpmScript('release:check')");
    const smokeIndex = deployVerifySource.indexOf("runNpmScript('smoke:production')");

    expect(releaseCheckIndex).toBeGreaterThan(-1);
    expect(smokeIndex).toBeGreaterThan(-1);
    expect(releaseCheckIndex).toBeLessThan(smokeIndex);
  });
});

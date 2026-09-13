import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const smokeProductionSource = readFileSync(
  join(process.cwd(), 'scripts', 'smoke-production.cjs'),
  'utf8',
);

describe('frontend production smoke contract', () => {
  it('blocks production login shell when CSP allows unsafe-eval', () => {
    expect(smokeProductionSource).toContain('expectCspWithoutUnsafeEval');
    expect(smokeProductionSource).toContain('content-security-policy');
    expect(smokeProductionSource).toContain('unsafe-eval');
    expect(smokeProductionSource).toContain('Content-Security-Policy contem unsafe-eval');
  });
});

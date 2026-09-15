import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const smokeProductionSource = readFileSync(
  join(process.cwd(), 'scripts', 'smoke-production.cjs'),
  'utf8',
);

describe('frontend production smoke contract', () => {
  it('checks the Next.js runtime health outside the API rewrite and validates build drift', () => {
    expect(smokeProductionSource).toContain("url: process.env.BCOST_SMOKE_WEB_HEALTH_URL || 'https://app.bcost.com.br/web-health'");
    expect(smokeProductionSource).toContain('expectBuildVersion');
    expect(smokeProductionSource).toContain('buildVersion esperado');
  });

  it('blocks production login shell when CSP allows unsafe-eval', () => {
    expect(smokeProductionSource).toContain('expectCspWithoutUnsafeEval');
    expect(smokeProductionSource).toContain('content-security-policy');
    expect(smokeProductionSource).toContain('unsafe-eval');
    expect(smokeProductionSource).toContain('Content-Security-Policy contem unsafe-eval');
  });

  it('requires API trace id in public production smoke', () => {
    expect(smokeProductionSource).toContain('expectTraceId: true');
    expect(smokeProductionSource).toContain("response.headers.get('x-bcost-trace-id')");
    expect(smokeProductionSource).toContain('x-bcost-trace-id ausente');
  });

  it('validates official API CORS preflight without demo session headers', () => {
    expect(smokeProductionSource).toContain("name: 'api-cors-preflight'");
    expect(smokeProductionSource).toContain("method: 'OPTIONS'");
    expect(smokeProductionSource).toContain("expectCorsOrigin: 'https://app.bcost.com.br'");
    expect(smokeProductionSource).toContain("forbidCorsHeader: 'x-demo-session'");
    expect(smokeProductionSource).toContain('Access-Control-Allow-Headers contem header proibido');
  });
});

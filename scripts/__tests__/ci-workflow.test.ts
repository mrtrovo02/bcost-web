import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ciWorkflowSource = readFileSync(
  join(process.cwd(), '.github', 'workflows', 'ci.yml'),
  'utf8',
);

describe('frontend CI workflow contract', () => {
  it('declara release stage produtivo antes de executar o predeploy completo', () => {
    const stageIndex = ciWorkflowSource.indexOf('NEXT_PUBLIC_RELEASE_STAGE: beta');
    const predeployIndex = ciWorkflowSource.indexOf('npm run predeploy:full');

    expect(stageIndex).toBeGreaterThan(-1);
    expect(predeployIndex).toBeGreaterThan(-1);
    expect(stageIndex).toBeLessThan(predeployIndex);
  });

  it('mantem demo publica desligada no CI oficial', () => {
    expect(ciWorkflowSource).toContain('NEXT_PUBLIC_ENABLE_DEMO: "false"');
    expect(ciWorkflowSource).toContain('NEXT_PUBLIC_ENABLE_DEMO_FALLBACK: "false"');
    expect(ciWorkflowSource).toContain('NEXT_PUBLIC_DEMO_ACCESS_MODE: disabled');
  });
});

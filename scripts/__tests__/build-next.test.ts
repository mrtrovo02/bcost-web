import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const buildScriptSource = readFileSync(
  join(process.cwd(), 'scripts', 'build-next.cjs'),
  'utf8',
);

describe('Next.js production build runner', () => {
  it('uses a controlled heap default and allows an explicit deploy override', () => {
    expect(buildScriptSource).toContain('DEFAULT_HEAP_MB = 2048');
    expect(buildScriptSource).toContain('BCOST_NEXT_BUILD_HEAP_MB');
    expect(buildScriptSource).toContain('--max-old-space-size=${heapMb}');
  });

  it('caps the heap to avoid unsafe EC2 overcommit', () => {
    expect(buildScriptSource).toContain('MIN_HEAP_MB = 768');
    expect(buildScriptSource).toContain('MAX_HEAP_MB = 4096');
  });
});

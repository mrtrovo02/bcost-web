import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'app/context/QueryProvider.tsx'), 'utf8');

describe('QueryProvider production policy', () => {
  it('keeps query devtools disabled unless explicitly enabled in development', () => {
    expect(source).toContain("process.env.NODE_ENV === 'development'");
    expect(source).toContain("process.env.NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS === 'true'");
    expect(source).toContain('{shouldShowQueryDevtools() && <ReactQueryDevtools initialIsOpen={false} />}');
  });

  it('does not retry deterministic authorization and validation failures', () => {
    for (const status of ['400', '401', '403', '404', '409', '422']) {
      expect(source).toContain(status);
    }
    expect(source).toContain('mutations:');
    expect(source).toContain('retry: false');
  });
});

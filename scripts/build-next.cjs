'use strict';

const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const DEFAULT_HEAP_MB = 2048;
const MIN_HEAP_MB = 768;
const MAX_HEAP_MB = 4096;

function resolveHeapMb(rawValue) {
  const parsed = Number.parseInt(String(rawValue ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_HEAP_MB;
  }

  return Math.min(Math.max(parsed, MIN_HEAP_MB), MAX_HEAP_MB);
}

const heapMb = resolveHeapMb(process.env.BCOST_NEXT_BUILD_HEAP_MB);
const nextBin = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');

console.log(`Next.js build com heap controlado: ${heapMb} MB.`);

const result = spawnSync(process.execPath, [`--max-old-space-size=${heapMb}`, nextBin, 'build'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Falha ao iniciar build Next.js: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);


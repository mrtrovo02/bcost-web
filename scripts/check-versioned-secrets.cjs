'use strict';

const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');

const git = spawnSync('git', ['ls-files'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (git.status !== 0) {
  process.stderr.write(git.stderr || 'Falha ao listar arquivos versionados.\n');
  process.exit(1);
}

const ignoredPathFragments = [
  '/node_modules/',
  '/.next/',
  '/coverage/',
  '/dist/',
  '/docs/',
  '/public/',
];

const secretPattern = new RegExp(
  String.raw`\b(?:${['rk', 'sk'].join('|')})_(?:${['test', 'live'].join('|')})_[A-Za-z0-9]{20,}\b|` +
    String.raw`\bwhsec_[A-Za-z0-9]{20,}\b`,
  'g',
);

const forbiddenProductionFlags = [
  'NEXT_PUBLIC_ENABLE_DEMO',
  'NEXT_PUBLIC_ENABLE_DEMO_FALLBACK',
];

const findings = [];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function shouldSkip(filePath) {
  const normalized = `/${normalizePath(filePath)}`;
  return ignoredPathFragments.some((fragment) => normalized.includes(fragment));
}

function isTestFile(filePath) {
  return /\.(spec|test)\.[cm]?[jt]sx?$/.test(filePath);
}

function inspectFile(filePath) {
  if (shouldSkip(filePath)) return;

  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  if (content.includes('\u0000')) return;

  secretPattern.lastIndex = 0;
  for (const match of content.matchAll(secretPattern)) {
    const index = match.index ?? 0;
    const line = content.slice(0, index).split(/\r?\n/).length;
    findings.push(`${filePath}:${line}: Stripe-like secret versionado`);
  }

  if (isTestFile(filePath)) return;

  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;

    for (const flag of forbiddenProductionFlags) {
      const pattern = new RegExp(`\\b${flag}\\s*=\\s*true\\b`);
      if (pattern.test(line)) {
        findings.push(`${filePath}:${index + 1}: ${flag}=true versionado fora de teste`);
      }
    }
  }
}

for (const filePath of git.stdout.split(/\r?\n/).filter(Boolean)) {
  inspectFile(filePath);
}

if (findings.length > 0) {
  process.stderr.write('Security scan frontend reprovado:\n');
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write('Security scan aprovado: frontend sem segredos realísticos ou flags demo perigosas.\n');

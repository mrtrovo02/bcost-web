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

const forbiddenFrontendRuntimePackages = new Set(['bullmq', 'ioredis']);
const forbiddenFrontendRuntimeImports = [
  { packageName: 'bullmq', reason: 'filas e workers pertencem ao backend ou a worker dedicado' },
  { packageName: 'ioredis', reason: 'conexao Redis direta nao deve rodar no processo Next.js' },
];
const clientReadableTokenKeys = [
  'bcost_token',
  'bcost_access_token',
  'access_token',
  'accessToken',
  'token',
  'bcost_refresh_token',
  'refresh_token',
  'refreshToken',
];
const clientReadableTokenWritePattern = new RegExp(
  String.raw`(?:window\.)?localStorage\.setItem\(\s*['"](?:${clientReadableTokenKeys.join(
    '|',
  )})['"]\s*,\s*([^)]+)\)`,
  'g',
);
const forbiddenSecretArtifactExtensions = new Set([
  '.pem',
  '.key',
  '.p12',
  '.pfx',
  '.crt',
  '.cer',
  '.der',
]);
const forbiddenSecretArtifactNames = new Set([
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  'known_hosts',
  'authorized_keys',
]);

const findings = [];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function isForbiddenTrackedEnvFile(filePath) {
  const normalized = normalizePath(filePath);
  const fileName = normalized.split('/').pop() || '';

  if (!fileName.startsWith('.env')) return false;
  if (fileName.endsWith('.example') || fileName.endsWith('.template')) return false;

  return true;
}

function isForbiddenTrackedSecretArtifact(filePath) {
  const normalized = normalizePath(filePath);
  const fileName = normalized.split('/').pop() || '';
  const lowerFileName = fileName.toLowerCase();
  const extensionIndex = lowerFileName.lastIndexOf('.');
  const extension = extensionIndex >= 0 ? lowerFileName.slice(extensionIndex) : '';

  if (lowerFileName.endsWith('.example') || lowerFileName.endsWith('.template')) return false;
  if (forbiddenSecretArtifactNames.has(lowerFileName)) return true;
  if (forbiddenSecretArtifactExtensions.has(extension)) return true;

  return false;
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

  if (normalizePath(filePath) === 'package.json') {
    try {
      const manifest = JSON.parse(content);
      const dependencies = {
        ...(manifest.dependencies ?? {}),
        ...(manifest.devDependencies ?? {}),
        ...(manifest.optionalDependencies ?? {}),
      };

      for (const packageName of forbiddenFrontendRuntimePackages) {
        if (Object.prototype.hasOwnProperty.call(dependencies, packageName)) {
          findings.push(
            `${filePath}: dependencia proibida no frontend (${packageName}); mova filas/Redis para backend ou worker dedicado`,
          );
        }
      }
    } catch {
      findings.push(`${filePath}: package.json invalido para verificacao de dependencias proibidas`);
    }
  }

  secretPattern.lastIndex = 0;
  for (const match of content.matchAll(secretPattern)) {
    const index = match.index ?? 0;
    const line = content.slice(0, index).split(/\r?\n/).length;
    findings.push(`${filePath}:${line}: Stripe-like secret versionado`);
  }

  if (isTestFile(filePath)) return;

  clientReadableTokenWritePattern.lastIndex = 0;
  for (const match of content.matchAll(clientReadableTokenWritePattern)) {
    const index = match.index ?? 0;
    const line = content.slice(0, index).split(/\r?\n/).length;
    const valueExpression = match[1] ?? '';
    const isExplicitDemoToken =
      valueExpression.includes('DEMO_TOKEN') || valueExpression.includes('demo-token-local');

    if (!isExplicitDemoToken) {
      findings.push(
        `${filePath}:${line}: escrita direta de token real em localStorage; use cookie HttpOnly/Secure ou contexto demo explicito`,
      );
    }
  }

  for (const forbiddenImport of forbiddenFrontendRuntimeImports) {
    const packageName = forbiddenImport.packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const importPattern = new RegExp(
      `(?:from\\s+['"]${packageName}['"]|require\\(\\s*['"]${packageName}['"]\\s*\\))`,
    );

    if (importPattern.test(content)) {
      findings.push(`${filePath}: import proibido de ${forbiddenImport.packageName}; ${forbiddenImport.reason}`);
    }
  }

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
  if (isForbiddenTrackedEnvFile(filePath)) {
    findings.push(`${filePath}: arquivo de ambiente real nao deve ser versionado`);
    continue;
  }

  if (isForbiddenTrackedSecretArtifact(filePath)) {
    findings.push(`${filePath}: chave, certificado ou artefato criptografico nao deve ser versionado`);
    continue;
  }

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

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ENV_FILES = ['.env.production', '.env.local', '.env'];
const REQUIRED_API_ORIGIN = 'https://api.bcost.com.br';
const REQUIRED_APP_ORIGIN = 'https://app.bcost.com.br';
const errors = [];
const warnings = [];

function loadEnvironmentFiles() {
  for (const fileName of ENV_FILES) {
    const filePath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) continue;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function valueOf(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function requireEquals(name, expected, message) {
  if (valueOf(name) !== expected) {
    errors.push(`${name}: ${message}`);
  }
}

function requireHttpsUrl(name, expectedOrigin) {
  const value = valueOf(name);
  if (!value) {
    errors.push(`${name}: URL obrigatória para produção.`);
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      errors.push(`${name}: deve usar HTTPS em produção.`);
    }
    if (expectedOrigin && parsed.origin !== expectedOrigin) {
      errors.push(`${name}: deve apontar para ${expectedOrigin}.`);
    }
    return parsed;
  } catch {
    errors.push(`${name}: URL inválida.`);
    return null;
  }
}

function validateApiBasePath(name) {
  const parsed = requireHttpsUrl(name, REQUIRED_API_ORIGIN);
  if (!parsed) return;

  const pathName = parsed.pathname.replace(/\/$/, '');
  if (pathName !== '/api/v1') {
    errors.push(`${name}: deve terminar com /api/v1 para evitar 404 em produção.`);
  }
}

function validateSocketUrl() {
  const socketUrl = valueOf('NEXT_PUBLIC_SOCKET_URL');
  if (!socketUrl) {
    warnings.push('NEXT_PUBLIC_SOCKET_URL: recomendado apontar para https://api.bcost.com.br.');
    return;
  }

  const parsed = requireHttpsUrl('NEXT_PUBLIC_SOCKET_URL', REQUIRED_API_ORIGIN);
  if (parsed && parsed.pathname !== '/') {
    errors.push('NEXT_PUBLIC_SOCKET_URL: informe apenas a origem, sem /api/v1.');
  }
}

function validateInternalApiUrl() {
  const value = valueOf('INTERNAL_API_URL');
  if (!value) {
    errors.push('INTERNAL_API_URL: obrigatório para chamadas server-side do Next.js.');
    return;
  }

  try {
    const parsed = new URL(value);
    const localOrigins = new Set(['http://127.0.0.1:5000', 'http://localhost:5000']);
    if (!localOrigins.has(parsed.origin)) {
      errors.push('INTERNAL_API_URL: na EC2 deve apontar para http://127.0.0.1:5000.');
    }
  } catch {
    errors.push('INTERNAL_API_URL: URL inválida.');
  }
}

function validateServerSideRouteProtection() {
  const proxyPath = path.resolve(process.cwd(), 'proxy.ts');
  if (!fs.existsSync(proxyPath)) {
    errors.push('proxy.ts: obrigatório para proteger rotas /dashboard/* antes da hidratação do cliente.');
    return;
  }

  const proxySource = fs.readFileSync(proxyPath, 'utf8');
  const requiredFragments = [
    "'/dashboard/:path*'",
    "'/upload-xml/:path*'",
    'demo-token-local',
    'demo-disabled',
  ];

  for (const fragment of requiredFragments) {
    if (!proxySource.includes(fragment)) {
      errors.push(`proxy.ts: proteção server-side incompleta; fragmento ausente ${fragment}.`);
    }
  }
}

function validateProductionEnvironment() {
  requireEquals('NODE_ENV', 'production', 'deve ser production no build oficial.');
  validateApiBasePath('NEXT_PUBLIC_API_URL');

  if (valueOf('NEXT_PUBLIC_API_BASE_URL')) {
    validateApiBasePath('NEXT_PUBLIC_API_BASE_URL');
    requireEquals(
      'NEXT_PUBLIC_API_BASE_URL',
      valueOf('NEXT_PUBLIC_API_URL'),
      'mantenha igual ao NEXT_PUBLIC_API_URL para evitar drift entre clientes HTTP.',
    );
  } else {
    warnings.push('NEXT_PUBLIC_API_BASE_URL: recomendado manter igual ao NEXT_PUBLIC_API_URL.');
  }

  validateInternalApiUrl();
  validateSocketUrl();
  requireEquals('NEXT_PUBLIC_ENABLE_DEMO', 'false', 'demo pública deve ficar desligada no app oficial.');
  requireEquals(
    'NEXT_PUBLIC_ENABLE_DEMO_FALLBACK',
    'false',
    'fallback demonstrativo deve ficar desligado em produção.',
  );

  requireHttpsUrl('NEXT_PUBLIC_APP_URL', REQUIRED_APP_ORIGIN);
  validateServerSideRouteProtection();
}

loadEnvironmentFiles();
validateProductionEnvironment();

if (warnings.length > 0) {
  console.warn('Avisos de produção frontend:');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.error('Release check frontend reprovado:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Release check aprovado: frontend pronto para deploy produtivo.');

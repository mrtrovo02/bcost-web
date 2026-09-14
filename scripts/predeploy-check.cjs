'use strict';

const { spawnSync } = require('node:child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const command = process.platform === 'win32' ? 'cmd.exe' : npmCommand;
const withBuild = process.argv.includes('--with-build');
const codeOnly = process.argv.includes('--code-only');

const steps = [
  ['runtime:check', 'Garante Node.js 24 LTS antes de testar, compilar ou publicar.'],
  ['security:scan', 'Bloqueia segredos versionados e flags demo perigosas.'],
];

if (!codeOnly) {
  steps.push(['release:check', 'Valida URLs publicas, demo desligada e configuracao produtiva.']);
}

steps.push(
  ['typecheck', 'Executa TypeScript sem emissao.'],
  ['test:ci', 'Executa testes de release, sessao, proxy e simulador tributario.'],
);

if (withBuild) {
  steps.push(['build', 'Compila o Next.js para producao.']);
}

function runScript(scriptName, description) {
  console.log(`\n[predeploy] ${scriptName}: ${description}`);
  const args =
    process.platform === 'win32' ? ['/d', '/c', npmCommand, 'run', scriptName] : ['run', scriptName];

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    console.error(`[predeploy] Falha ao iniciar ${scriptName}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[predeploy] ${scriptName} reprovado com status ${result.status}.`);
    process.exit(result.status || 1);
  }
}

for (const [scriptName, description] of steps) {
  runScript(scriptName, description);
}

const mode = codeOnly ? 'codigo local' : 'ambiente produtivo';
console.log(`\n[predeploy] Frontend aprovado para a proxima etapa de deploy (${mode}).`);

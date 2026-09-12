# bCost Web Incident Response Runbook

Runbook operacional para incidentes do frontend em producao. Use este fluxo para falhas de login, sessao, demo, empresas ativas, rotas protegidas, billing, performance percebida, build e deploy.

## Severidade

| Nivel | Criterio | Exemplo |
| --- | --- | --- |
| SEV-1 | Usuario autenticado ve dados de outro tenant ou fica preso em loop de login | Sessao real misturada com demo, empresa errada carregada |
| SEV-2 | Fluxo comercial ou modulo essencial indisponivel | Signup, onboarding, billing, empresas, simulador ou dashboard falhando |
| SEV-3 | Degradacao visual ou performance sem perda de dados | Menu lento, card quebrado, exportacao indisponivel |

## Primeiros 10 minutos

1. Confirmar saude publica:

```bash
curl -i https://app.bcost.com.br/api/v1/health
curl -i https://api.bcost.com.br/api/v1/health
```

2. Confirmar processo:

```bash
pm2 status
pm2 logs bcost-web --lines 120
```

3. Abrir DevTools e coletar:

- rota atual;
- status HTTP;
- `x-bcost-trace-id`, quando existir;
- ambiente (`NEXT_PUBLIC_ENABLE_DEMO`, `NEXT_PUBLIC_API_URL`) sem imprimir segredos;
- se a sessao e real ou demo.

## Diagnostico padrao

```bash
cd ~/bcost.web/bcost-web
git status --short
git log --oneline -5
npm run release:check
npm run smoke:production
```

Se o build falhar por memoria no EC2, use limite explicito de heap apenas para a etapa de build:

```bash
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

## Regras para sessao e demo

- Sessao real nunca deve consumir fallback demo.
- Demo nunca deve enviar headers de bypass para a API oficial.
- Estado de empresa ativa deve vir do backend para usuario real.
- Browser storage pode hidratar UI, mas nao pode ser fonte autoritativa de autenticacao produtiva.

## Rollback

```bash
cd ~/bcost.web/bcost-web
git log --oneline -5
git checkout <commit_anterior_estavel>
npm ci
npm run release:check
NODE_OPTIONS="--max-old-space-size=2048" npm run build
pm2 restart bcost-web --update-env
npm run smoke:production
```

## Criterios de encerramento

- Login real acessa dashboard sem retornar para `/login`.
- Empresas autorizadas aparecem na sidebar e em `/dashboard/companies`.
- Demo, quando habilitada em sandbox controlado, nao mistura usuario real.
- `release:check`, build e smoke passam.
- Logs nao mostram erro recorrente em sessao, rota protegida, CORS ou API client.


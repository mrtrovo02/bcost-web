# Runbook EC2 - Frontend Environment

Use este checklist antes de reiniciar o `bcost-web` em produção.

## Variáveis obrigatórias

```bash
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://api.bcost.com.br/api/v1
NEXT_PUBLIC_API_BASE_URL=https://api.bcost.com.br/api/v1
INTERNAL_API_URL=http://127.0.0.1:5000
NEXT_PUBLIC_SOCKET_URL=https://api.bcost.com.br
NEXT_PUBLIC_APP_NAME=bCost
NEXT_PUBLIC_ENABLE_DEMO=false
NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false
NEXT_PUBLIC_DEMO_ACCESS_MODE=disabled
```

## Demo pública controlada

Para vitrine comercial com demo pública, habilite a demo somente junto com a configuração correspondente do backend:

```bash
NEXT_PUBLIC_ENABLE_DEMO=true
NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=true
NEXT_PUBLIC_DEMO_ACCESS_MODE=controlled
```

O backend exige duas evidências na mesma requisição demo em produção:

```http
Authorization: Bearer demo-token-local
x-demo-session: true
```

Não habilite demo pública em ambiente com clientes reais sem segregação operacional validada.
Nunca use `NEXT_PUBLIC_ENABLE_DEMO=true` com `NEXT_PUBLIC_DEMO_ACCESS_MODE` vazio ou diferente de `controlled` no domínio oficial.

## Deploy

```bash
cd ~/bcost.web/bcost-web
git pull origin main
npm ci
npm run release:check
npm run build
pm2 restart bcost-web --update-env
pm2 logs bcost-web --lines 80
```

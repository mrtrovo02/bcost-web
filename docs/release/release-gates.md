# Frontend release gates

## Gates bloqueantes

- `npm run predeploy:check`
- `npm run predeploy:full` quando o ambiente local/EC2 tiver memoria suficiente para build
- `npm run predeploy:code` para validar codigo fora do ambiente produtivo sem exigir variaveis publicas produtivas
- `npm audit --audit-level=high`
- `npm run security:scan`
- `npm run release:check`
- `npm run typecheck`
- `npm run test:release`
- `npm run test:session`
- `npm run test:proxy`
- `npm run test:tax-scenarios`
- `npm run build`

`predeploy:check` e `predeploy:full` sao os comandos preferenciais para EC2 e ambientes com variaveis produtivas. `predeploy:code` e o comando preferencial para validacao local/CI sem variaveis publicas produtivas. A lista detalhada acima permanece como contrato auditorio do que esses comandos cobrem.

`NEXT_PUBLIC_RELEASE_STAGE` e obrigatorio no release produtivo. Use `beta` ou
`controlled-beta` para piloto/beta pago e use `official`, `live`,
`enterprise` ou `production-live` somente quando os gates de venda oficial
estiverem cumpridos.

Quando `NEXT_PUBLIC_RELEASE_STAGE` estiver em `official`, `live`,
`enterprise` ou `production-live`, a demo controlada deve estar desligada.
Use demo controlada somente em beta/piloto explicitamente segregado.

## Smoke de produção

Após deploy na EC2:

```bash
curl -i http://127.0.0.1:3000/api/health
npm run smoke:production
pm2 logs bcost-web --lines 80
```

O smoke público deve reprovar se a rota `/login` não expuser
`Content-Security-Policy` ou se o header voltar a permitir `unsafe-eval`.
O mesmo smoke também valida `x-bcost-trace-id` na API pública para manter
correlação operacional entre frontend, Nginx e backend.
Ele também executa preflight CORS contra a API oficial e reprova se o header
legado `x-demo-session` voltar a ser aceito.

Quando o build for feito diretamente na EC2, pare o processo antes de remover
`.next`:

```bash
pm2 stop bcost-web || true
rm -rf .next
npm run predeploy:full
pm2 restart bcost-web --update-env
npm run deploy:verify
```

Validar no navegador:

- login real com cookie HttpOnly;
- empresa real visível e selecionável;
- nenhuma empresa demo dentro de sessão real;
- logout revoga sessão e limpa contexto local;
- simulador tributário calcula sem erro;
- `/dashboard/enterprise` não mostra módulo vendido como oficial sem gate de operação assistida.

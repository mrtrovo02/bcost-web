# Frontend release gates

## Gates bloqueantes

- `npm audit --audit-level=high`
- `npm run security:scan`
- `npm run release:check`
- `npm run typecheck`
- `npm run test:release`
- `npm run test:session`
- `npm run test:tax-scenarios`
- `npm run build`

## Smoke de produção

Após deploy na EC2:

```bash
curl -i http://127.0.0.1:3000/api/health
pm2 logs bcost-web --lines 80
```

Validar no navegador:

- login real com cookie HttpOnly;
- empresa real visível e selecionável;
- nenhuma empresa demo dentro de sessão real;
- logout revoga sessão e limpa contexto local;
- simulador tributário calcula sem erro;
- `/dashboard/enterprise` não mostra módulo vendido como oficial sem gate de operação assistida.

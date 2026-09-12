# bCost Web

Frontend oficial da plataforma bCost, construido com Next.js App Router, React, TypeScript e contratos HTTP tipados para a API NestJS.

## Licença e propriedade

Código proprietário da bCost. Nenhum direito de uso, cópia, distribuição, hospedagem, exploração comercial ou criação de trabalhos derivados é concedido sem autorização prévia por escrito. Consulte `LICENSE`.

## Desenvolvimento local

Instale as dependências e execute o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Segurança em produção

Para operacao com clientes reais, mantenha fallbacks demonstrativos desabilitados:

```bash
NEXT_PUBLIC_ENABLE_DEMO=false
NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false
NEXT_PUBLIC_DEMO_ACCESS_MODE=disabled
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com.br/api/v1
```

Modo demo controlado deve ficar restrito a desenvolvimento local ou ambiente de demonstracao explicitamente segregado. Telas produtivas devem falhar de forma clara quando API, empresa tenant, entitlements ou endpoints de modulo estiverem indisponiveis, sem substituir dados reais por amostras silenciosas.

Antes de publicar ou abrir pull request:

```bash
npm run security:scan
npm run release:check
npm run typecheck
npm run test:ci
npm run build
```

# bCost Web

Frontend oficial da plataforma bCost, construido com Next.js App Router, React, TypeScript e contratos HTTP tipados para a API NestJS.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Production Safety

Para operacao com clientes reais, mantenha fallbacks demonstrativos desabilitados:

```bash
NEXT_PUBLIC_ENABLE_DEMO=false
NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false
NEXT_PUBLIC_DEMO_ACCESS_MODE=disabled
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com.br/api/v1
```

Modo demo controlado deve ficar restrito a desenvolvimento local ou ambiente de demonstracao explicitamente segregado. Telas produtivas devem falhar de forma clara quando API, empresa tenant, entitlements ou endpoints de modulo estiverem indisponiveis, sem substituir dados reais por amostras silenciosas.

Before opening a pull request:

```bash
npm run security:scan
npm run release:check
npm run typecheck
npm run test:release
npm run test:session
npm run build
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

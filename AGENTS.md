# bCost Web — Diretrizes Mestras para Agentes Codex

## Missao do Produto

Transformar a bCost em uma plataforma SaaS contabil, fiscal e financeira vendavel e monetizavel, competindo com Contabilizei, Dominio, Contimatic e Conta Azul com postura juridicamente defensavel. A interface deve vender eficiencia, inteligencia fiscal e operacao assistida; nunca deve prometer apuracao oficial automatica quando o processo depende de portal publico, prefeitura, PGDAS-D, eSocial, SPED, certificado digital, Junta Comercial ou contador responsavel.

A meta do frontend e operar como produto vendavel: multi-tenant, auditavel, com modulos reais, rotas funcionais, contratos de API claros, fallback controlado e trilhas de evidencia visiveis.

## Classificacao Obrigatoria De Modulos

Todo modulo exibido deve cair em uma categoria clara:

- Operacional por software: API, banco, regra, UI, teste e auditoria completos. Fluxo normal, sem aviso desnecessario.
- Operacao assistida: depende de contador/CRC, certificado, portal publico, RPA, prefeitura, Receita ou validacao documental. UI deve mostrar badge, checklist, evidencia, SLA e revisao humana.
- Bloqueado para venda: sem evidencia tecnica, legal ou operacional. UI deve mostrar homologacao, somente leitura ou feature desabilitada.

Nada pode prometer automacao oficial sem lastro. Onde nao ha automacao oficial, abrir workflow assistido.

## Arquitetura Frontend

- Next.js App Router, React, TypeScript e Tailwind.
- API clients tipados centralizados em `lib/api`; evitar `fetch` solto em componentes.
- React Query para estado de servidor, listagens, cache, paginacao e invalidacao quando o fluxo for recorrente.
- UI resiliente: falha de API mostra erro real; nunca fazer fallback silencioso para dados demo em conta real.
- Demo so pode aparecer em sessao/ambiente explicitamente demo.
- Modulos enterprise devem expor launch gates ate homologacao completa.
- Rotas comerciais pendentes prioritarias: `/signup`, `/onboarding`, `/billing`.

## Prioridades Da Esteira

P0 — Bloqueadores de vendabilidade:
- Sessao enterprise robusta, sem loop de login e sem mistura demo/real.
- Observabilidade antes de Stripe: traces, mensagens de erro uteis, estado de falha claro, correlacao com `x-bcost-trace-id` e alertas de jornadas criticas. Avaliar Sentry/OpenTelemetry somente depois de verificar dependencias e variaveis.
- Limpeza de repositorio: `.env` real, dumps e certificados fora do git.
- Testes de isolamento tenant na UI/API client quando houver selecao de empresa.

P1 — Fechamento mensal:
- Checklist de fechamento por competencia, periodo travavel, memoria de calculo, snapshot/hash, aprovacao CRC e dossie de evidencias exportavel.
- Mostrar protocolo auditavel, pendencias oficiais e limites legais sem vender recibo oficial inexistente.

P2 — Entregas fiscais reais:
- Separar visualmente simulacao, triagem, operacao assistida e apuracao oficial.
- Toda tela tributaria deve expor versao de regra, evidencias exigidas e revisao CRC quando aplicavel.

P3 — Monetizacao:
- Criar e endurecer `/signup`, `/onboarding`, `/billing`.
- Completar checkout/portal Stripe, planos, entitlements, paywall, trial com expiracao e bloqueio real de usuarios nao pagantes.
- Nao alterar Stripe enquanto P0/P1 de sessao, observabilidade, tenant e fechamento nao estiverem estabilizados. Stripe Live fica por ultimo.

P4 — Escalabilidade e UX:
- Paginar listagens, evitar telas travadas, eliminar rotas perdidas e deduplicar modulos basico/enterprise.
- Produto deve parecer vendavel no primeiro acesso: valor claro, fluxos acionaveis e riscos declarados.

## Regras De Engenharia

- Mudancas incrementais, pequenas e separadas por repo.
- Nunca enfraquecer seguranca para "fazer funcionar".
- Nunca misturar demo com producao nem esconder erro real com dado demonstrativo.
- Toda resposta consumida de API deve ter contrato tipado. Mudanca de contrato exige atualizacao do client e da UI na mesma rodada.
- Componentes devem ter estados de loading, erro, vazio e sucesso quando consomem dados externos.
- Commits convencionais e com um contexto por commit.
- Nao fazer commit ou push sem solicitacao explicita do usuario na conversa atual.

## Definition Of Done

- `npm run typecheck`
- `npm run lint` quando viavel no repo
- Teste unitario/direcionado do modulo tocado
- `npm run build`
- `npm run release:check` quando a alteracao impactar producao/env
- Teste visual/fluxo quando tocar rotas criticas, auth, billing ou fechamento
- Commit e push separado por repo
- Nota de deploy EC2 com comandos exatos

## Deploy EC2 Frontend

```bash
cd ~/bcost.web/bcost-web
git pull origin main
npm ci
npm run release:check
npm run build
pm2 reload bcost-web --update-env
pm2 logs bcost-web --lines 80
```

Variaveis produtivas obrigatorias incluem `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SOCKET_URL`, `INTERNAL_API_URL`, `NEXT_PUBLIC_ENABLE_DEMO=false` e `NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false`.

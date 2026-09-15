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
- Eliminar dependencia de token real em `localStorage`; sessao produtiva deve convergir para cookie HttpOnly/Secure/SameSite=Strict e storage do navegador deve guardar apenas contexto nao sensivel, cache demo explicito e preferencias de UI.
- Observabilidade antes de Stripe: traces, mensagens de erro uteis, estado de falha claro, correlacao com `x-bcost-trace-id` e alertas de jornadas criticas. Avaliar Sentry/OpenTelemetry somente depois de verificar dependencias e variaveis.
- Limpeza de repositorio: `.env` real, dumps e certificados fora do git.
- Testes de isolamento tenant na UI/API client quando houver selecao de empresa.
- Smoke autenticado em producao deve provar usuario real, empresa esperada, ausencia de empresa demo em sessao real e logout funcional.

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

P5 — Pre-producao comercial rapida:
- Migrar runtime produtivo, Docker/PM2 e CI para Node 24 LTS. Node 20 nao e baseline aceitavel para venda enterprise ampla.
- Antes de novas telas comerciais, priorizar deploy repetivel, smoke test pos-deploy, rollback documentado, CI completo com cobertura medida e higiene operacional.
- Concluir migracao para sessao baseada em cookie HttpOnly/Secure/SameSite=Strict; token real nao deve depender de `localStorage`.
- `localStorage` pode guardar apenas contexto nao sensivel, cache demonstrativo explicitamente demo e preferencias de UI.
- Endurecer CSP gradualmente, removendo `unsafe-eval` primeiro e planejando nonce/hash para reduzir `unsafe-inline` sem quebrar Next.js.
- Definir estrategia de LICENSE/visibilidade dos repositorios antes de venda publica ampla.
- Documentar runbooks de incidente, LGPD basica, SLO beta, backup/restore e contatos de escalacao.
- Filas, workers, BullMQ, Redis, RPAs e processamento XML recorrente nao devem rodar dentro do Next.js. Esses componentes pertencem ao backend ou a worker dedicado.
- OpenAPI publicado e cliente TypeScript gerado/validado devem ser a fonte operacional dos contratos consumidos pela UI.
- Diretriz v6 de runtime: manter Node 24 LTS como baseline e injetar `BUILD_VERSION` no pipeline; fallback via Git existe, mas deploy oficial deve ser deterministico.
- Diretriz v6 de sessao: remover progressivamente token real do `localStorage`; `localStorage` so pode guardar contexto nao sensivel e cache demo explicitamente marcado.
- Diretriz v6 de CSP: `unsafe-inline` e aceitavel apenas no beta controlado; venda enterprise ampla exige nonce/hash e `BCOST_ENFORCE_STRICT_CSP=true` verde.
- Diretriz v6 de supply chain: pinagem SHA de GitHub Actions, SBOM e trilha de assinatura/attestation entram no backlog de release amplo.
- Diretriz v6 de contratos: frontend deve convergir para cliente TypeScript gerado/validado por OpenAPI; tipos manuais em `lib/api` precisam de contrato e teste.
- Diretriz v6 de cobertura: CI deve evoluir de subconjuntos para suite completa com `coverageThreshold` inicial e aumento por sprint.
- Diretriz v6 de produto: LGPD, retencao/exclusao de dados, DR e plano de continuidade sao requisitos para venda enterprise ampla.

## Gates De Lancamento

Beta pago/controlado exige:

- `release:check`, `test:ci`, build e `deploy:verify` aprovados no frontend publicado.
- Login real, logout, token expirado e troca de empresa testados manualmente ou por smoke autenticado.
- Demo controlada jamais pode hidratar empresa real; sessao real jamais pode hidratar empresa `demo-*`.
- Paywall/entitlements devem bloquear tambem por contrato de API, nao apenas esconder botao na UI.
- Erros de API em telas vendaveis devem mostrar estado recuperavel com trace/correlation id quando disponivel.

Venda enterprise ampla exige adicionalmente:

- Node 24 LTS em CI, build e EC2.
- CI/CD com rollback automatizado ou procedimento reversivel testado.
- Cobertura medida com threshold inicial e suite completa em agenda noturna.
- CSP endurecida, sem `unsafe-eval` e com plano de nonce/hash para reduzir `unsafe-inline`.
- `BCOST_ENFORCE_STRICT_CSP=true` precisa passar no `release:check` antes de posicionar o frontend como enterprise amplo.
- `NEXT_PUBLIC_RELEASE_STAGE` deve ser declarado e coerente com o deploy: `beta`/`controlled-beta` para beta pago e `official`/`live`/`enterprise`/`production-live` para venda oficial.
- Rotas protegidas server-side por `proxy.ts`/middleware equivalente antes da hidratacao do cliente.
- Cliente TypeScript gerado ou validado por OpenAPI para reduzir divergencia de contrato.

## Regras De Engenharia

- Mudancas incrementais, pequenas e separadas por repo.
- Nunca enfraquecer seguranca para "fazer funcionar".
- Nunca misturar demo com producao nem esconder erro real com dado demonstrativo.
- Alteracao em login, logout, refresh, cookies, selecao de empresa, demo/producao ou billing exige teste de regressao focado.
- SDD obrigatorio: contratos de API, tipos e DTOs mandam na UI; nao consumir campo nao confirmado no client tipado.
- TDD obrigatorio em simuladores, billing, paywall, sessoes, troca de empresa e fluxos fiscais expostos.
- Reuso antes de criacao: procurar page, hook, service, client HTTP, normalizer e componente existente antes de criar outro.
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
npm ci --engine-strict --include=dev
export BUILD_VERSION="$(git rev-parse --short HEAD)"
export NEXT_PUBLIC_BUILD_VERSION="$BUILD_VERSION"
export NEXT_PUBLIC_RELEASE_STAGE="${NEXT_PUBLIC_RELEASE_STAGE:-beta}"
export BCOST_NEXT_BUILD_HEAP_MB="${BCOST_NEXT_BUILD_HEAP_MB:-2048}"
pm2 stop bcost-web || true
rm -rf .next
npm run predeploy:full
pm2 restart bcost-web --update-env
npm run deploy:verify
pm2 logs bcost-web --lines 80
```

Variaveis produtivas obrigatorias incluem `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SOCKET_URL`, `INTERNAL_API_URL`, `NEXT_PUBLIC_ENABLE_DEMO=false`, `NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false`, `NEXT_PUBLIC_DEMO_ACCESS_MODE=disabled` e `NEXT_PUBLIC_RELEASE_STAGE`.

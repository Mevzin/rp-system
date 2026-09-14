# Guia de Desenvolvimento

## Setup Rápido

```bash
# 1. Instalar pnpm global (se não tiver)
npm i -g pnpm

# 2. Clonar / entrar no diretório e instalar deps
pnpm install

# 3. Copiar env
cp .env.example .env
# então preencha valores

# 4. Subir PostgreSQL local (exemplo Docker)
docker run -d --name criminals-pg \
  -e POSTGRES_DB=criminals_system \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 postgres:16-alpine

# 5. Prisma
pnpm db:generate
pnpm db:push          # ou db:migrate dev --name init
pnpm db:seed

# 6. Tudo rodando em dev (Turborepo paralelo)
pnpm dev
```

Abre:
- Web: <http://localhost:3000>
- API: <http://localhost:4000/api>
- Swagger: <http://localhost:4000/docs>

## Workspace Scripts (turbo)

| Script `pnpm ...` | Faz em apps/packages que possuem o script |
|---|---|
| `build` | Build com cache do Turborepo |
| `dev` | Dev server, paralelo, persistent |
| `lint` | Lint com eslint |
| `format` / `format:check` | Prettier em tudo |
| `clean` | Apaga dist, .next, node_modules |
| `db:generate` | `prisma generate` no `@criminals/database` |
| `db:push` | `prisma db push` |
| `db:migrate` | `prisma migrate dev` |
| `db:seed` | `tsx prisma/seed.ts` |
| `bot:deploy-commands` | deploy dos slash commands |

### Rodando apenas uma app

```bash
pnpm --filter @criminals/api dev
pnpm --filter @criminals/web dev
pnpm --filter @criminals/bot dev
```

## Adicionar nova dependência

```bash
# Compartilhada (ex. Zod no package shared)
pnpm add zod --filter @criminals/shared

# Dev dependência raiz
pnpm add -D typescript -w

# Para todos os apps
pnpm add lodash --filter ./apps/*
```

## Convenções de Código

- **TypeScript strict** habilitado raiz
- **Prettier** autoformat (semi, aspas duplas, trailing comma all)
- **ESLint**: extend `@criminals/eslint-config`
  - Sem `any` desnecessário;
  - `@typescript-eslint/consistent-type-imports`;
  - `@typescript-eslint/no-unused-vars` (exceto prefixados com `_`).
- Nomes de arquivos: kebab-case (ex: `farm.service.ts`);
- Pastas de módulo Nest: `nome.module.ts`, `nome.controller.ts`, `nome.service.ts`;
- Commands Discord: pasta `src/commands/<dominio>/<comando>.ts`.

## Novos módulos da API

1. Criar `src/modules/<nome>/<nome>.module.ts + controller + service`
2. Adicionar em `imports` de `AppModule` em `src/app.module.ts`
3. Se precisar de tabela: editar `packages/database/prisma/schema.prisma`
4. `pnpm db:generate` → novos tipos são imediatamente acessíveis em API/Bot/Web via `@criminals/database`

## Adicionar comando no Bot

1. Crie `apps/bot/src/commands/<categoria>/<nome>.ts`
2. Exporte uma const no formato `BotCommand` (vendo `commands/farm/farm.ts` como exemplo)
3. Importe e adicione no array `commands` de `apps/bot/src/commands/index.ts`
4. `pnpm bot:deploy-commands`

## Testes (Fase 10)

Serão adicionados nas pastas:
- `apps/api/test` (Jest + supertest para endpoints e regras de negócio)
- `packages/shared` (vitest p/ utilitários e schemas Zod)

Testes prioritários:
- Autenticação OAuth2 / troca de token
- Permissões (tentar aprovar farm sem REVIEW_FARM deve dar 403)
- Criação de farm (2 proofs obrigatórios, dinheiro em centavos)
- Aprovação / rejeição (modifica status, audit log, notifica)
- Cálculos de média diária / semanal (só farms APPROVED)
- Ranking correto por período
- Metas: criação, progresso correto, ativa/desativa
- Upload: MIME, extensão e tamanho válidos; URL assinada
- Audit log em ações administrativas

## Produção (checklist antes do deploy)

- [ ] Remover `prisma/migrations/*` do `.gitignore` após gerar migration `init`
- [ ] `pnpm build` sem erros
- [ ] Variáveis sensíveis em secrets manager, não no .env commitado
- [ ] `NODE_ENV=production`
- [ ] CORS com domínio real (não `*`)
- [ ] `JWT_SECRET` com pelo menos 64 chars aleatórios
- [ ] `DISCORD_REDIRECT_URI` atualizado para o domínio real
- [ ] Discord OAuth2 redirects adicionados no Developer Portal
- [ ] SSL/TLS em todas as apps (Cloudflare / Nginx / Vercel / Fly.io etc)
- [ ] Storage R2/S3 com CORS permitindo apenas o domínio web
- [ ] Rate limits de produção configurados (ThrottlerModule)
- [ ] Logs estruturados (futuro: pino/winston)

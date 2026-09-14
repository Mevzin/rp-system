# Arquitetura do Sistema

## Principios Fundamentais

```
        ┌────────────────┐        ┌────────────────┐        ┌────────────────┐
        │    Frontend    │        │     Bot        │        │   Outros       │
        │   (Next.js)    │        │  (Discord.js)  │        │  clientes API  │
        └───────┬────────┘        └───────┬────────┘        └───────┬────────┘
                │                         │                         │
                └─────────────┬───────────┴──────────────┬──────────┘
                              │                          │
                              ▼                          ▼
                     ┌──────────────────────────────────────────────┐
                     │              API (NestJS)                    │
                     │                                              │
                     │  Auth • RBAC • Regras de negócio • AuditLog  │
                     │                                              │
                     │  Storage S3/R2 ←──── imagens (fora do DB)    │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │   PostgreSQL (Prisma)    │
                              │  Única fonte de verdade  │
                              └─────────────────────────┘
```

### Regras Inquebráveis

1. **Só a API acessa o banco de dados** — frontend e bot nunca conectam diretamente ao PostgreSQL
2. **Bot não tem banco próprio** — toda persistência vai pela API
3. **Regras de negócio só na API** — frontend/bot só exibem e enviam input
4. **Sessão é a fonte do usuário** — nunca confiar em `userId` enviado pelo cliente
5. **Permissões validadas no backend** — RBAC no NestJS guard
6. **Dinheiro em centavos** — `Int`, nunca `float`/`number`
7. **Imagens fora do banco** — S3/R2 com URLs assinadas. Banco só guarda `storageKey` e `url`

## Camadas

### `apps/web` — Frontend Next.js

- **App Router** (`src/app`) com route groups `(auth)` e `(dashboard)`
- Server-side e client components bem separados
- `TanStack Query` para cache/fetch de dados da API
- `React Hook Form` + `Zod` para validação de formulários
- `shadcn/ui` + `TailwindCSS` no tema dark minimalista
- Nenhuma regra de negócio, só apresentação

### `apps/api` — Backend NestJS

- **Módulos por domínio**: `auth`, `users`, `organizations`, `farm`, `proofs`, `goals`, `rankings`, `inventory`, `notifications`, `audit`, `discord`, `statistics`, `uploads`
- `PrismaModule` global → `PrismaService` (reutiliza o client compartilhado de `@criminals/database`)
- Guards: `AuthGuard` (JWT via cookie/header), `PermissionsGuard` (RBAC via tiers Discord)
- Validação: `class-validator` global + `Zod` onde fizer sentido
- Rate limit (`@nestjs/throttler`), CORS, helmet, cookie-parser
- Swagger em `/docs`

### `apps/bot` — Bot Discord.js v14

- 100% cliente da API (sem DB)
- Slash commands: `/farm`, `/ranking`, `/meta`, `/perfil` (+ admin futuros)
- Modals, Buttons, Select Menus com handlers registrados em Collections
- Embeds padronizados (`createEmbed`, paleta `EMBED_COLORS`)
- Comunicação com API via `apiGet/apiPost` (axios)
- Config centralizada em `src/config`

### `packages/database`

- Prisma Schema (`prisma/schema.prisma`) com FKs e índices
- `PrismaClient` compartilhado (singleton que reutiliza instância global em dev)
- Migrations e seed
- Exports: `prisma` instance + tudo do `@prisma/client`

### `packages/shared`

- Enums (Prisma enum é a fonte, copiados aqui por conveniência)
- Tipos TypeScript compartilhados entre web/api/bot
- Schemas Zod usados tanto no frontend quanto API
- Funções utilitárias (formatação monetária, datas, URL de avatar, cálculos de período)

## Fluxo de Dados: Registro de Farm (exemplo completo)

```
1.  [Web]  Usuário abre página de novo farm
2.  [Web]  Pede URL assinada → POST /api/uploads/presigned-url × 2 (inventário + banco)
3.  [API]  Gera URL PUT assinada do S3/R2 (1h válida) → retorna storageKey, publicUrl
4.  [Web]  Faz PUT do arquivo direto pro storage usando a URL assinada
5.  [Web]  Submete formulário → POST /api/farm com { quantity, withdrawnAmount, proofs:[{type,storageKey,url}] }
6.  [API]  Valida entrada (Zod), confere se tem os 2 proof types obrigatórios
7.  [API]  Cria Farm + Proofs em transaction
8.  [API]  Escreve AuditLog com FARM_CREATED
9.  [API]  Cria Notification (canal Discord)
10. [Web]  Redireciona p/ lista de farms e mostra status PENDING
11. [Bot]  (futuro) Envia embed no canal de farms
12. [Supervisor] Aprova: POST /api/farm/:id/approve → backend checa permissão REVIEW_FARM
13. [API]  Atualiza status APPROVED + reviewedBy + reviewedAt
14. [API]  AuditLog FARM_APPROVED
15. [API]  Envia DM ao usuário via Discord REST
16. [API]  Acumula o valor nas metas/rankings (via read-time em statistics/rankings)
```

## RBAC — Mapeamento Cargos → Permissões

Os cargos são resolvidos pelos IDs de roles do Discord configurados em `.env`:

| Tier          | Role env var              | Permissões principais |
|---------------|---------------------------|-----------------------|
| OWNER         | `DISCORD_ROLE_OWNER_ID`   | Todas |
| MANAGER       | `DISCORD_ROLE_MANAGER_ID` | Gerenciar membros, metas, farm, estoque, cargos, logs |
| SUPERVISOR    | `DISCORD_ROLE_SUPERVISOR_ID` | Criar/ver farms, aprovar/rejeitar, ver membros, estoque, logs |
| MEMBER        | (qualquer outro)          | Criar farm, ver próprio, ranking, metas |

Implementado em:
- API: `PermissionsGuard` + `RequirePermissions()` decorator
- Shared: `getPermissionsForTier()` em `packages/shared/src/utils/index.ts`

## Comunicação Bot ↔ API

O bot usa `axios` com a API e envia opcionalmente `Authorization: Bearer <API_KEY>`:

- Leitura: `/statistics/dashboard`, `/statistics/ranking`, `/goals`, `/farm`, etc.
- Escrita futura: criação de farm pelo bot (sem proofs), aprovação administrativa

> Como alternativa à API Key compartilhada, pode-se instalar uma rota `/auth/service-token` que troca `BOT_TOKEN` por JWT de serviço. Mantenha a camada de segurança.

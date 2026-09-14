# Banco de Dados — PostgreSQL + Prisma

## Esquema

O schema Prisma está em: [`packages/database/prisma/schema.prisma`](file:///d:/projects/criminals-system/packages/database/prisma/schema.prisma)

## Modelos

| Modelo             | Descrição |
|--------------------|-----------|
| `Organization`     | Organização/RP. Preparada para multi-org (tudo tem FK). Uma por enquanto. |
| `User`             | Identificado por `discordId` (único). Sem email/senha. |
| `Farm`             | Registro de farm com `quantity`, `withdrawnAmount` (centavos), status, revisão. |
| `Proof`            | Referência a imagens em storage (`storageKey` + `url`). **Nunca armazena bytes**. |
| `Goal`             | Metas: global/individual · semanal/mensal. |
| `InventoryItem`    | Item de estoque com saldo. |
| `InventoryMovement`| Entrada, saída ou ajuste com motivo + responsável. |
| `AuditLog`         | Toda ação administrativa importante. Campos: `action`, `entity`, `entityId`, `metadata`. |
| `Notification`     | Registro de notificações enviadas (Discord DM/canal). |

## Enums (Prisma)

```prisma
enum FarmStatus             { PENDING, APPROVED, REJECTED }
enum ProofType              { INVENTORY_PROOF, BANK_PROOF }
enum GoalType               { GLOBAL_WEEKLY, GLOBAL_MONTHLY, INDIVIDUAL_WEEKLY, INDIVIDUAL_MONTHLY }
enum InventoryMovementType  { IN, OUT, ADJUSTMENT }
enum AuditAction            { USER_LOGIN, USER_UPDATED, FARM_CREATED, FARM_APPROVED, FARM_REJECTED,
                               GOAL_CREATED, GOAL_UPDATED, GOAL_DELETED, INVENTORY_ITEM_CREATED,
                               INVENTORY_MOVEMENT_CREATED, ROLE_ASSIGNED, ROLE_REMOVED,
                               NOTIFICATION_SENT, UPLOAD_CREATED, CONFIG_UPDATED }
```

## Índices criados

- `Organization.discordGuildId` (unique)
- `User.discordId` (unique), `User.organizationId`
- `Farm.organizationId`, `Farm.userId`, `Farm.status`, `Farm.createdAt`
- `AuditLog.organizationId`, `AuditLog.userId`, `AuditLog.action`, `AuditLog.createdAt`
- `InventoryItem.organizationId`, `InventoryItem.name`
- `InventoryMovement.organizationId`, `InventoryMovement.itemId`, `InventoryMovement.userId`, `InventoryMovement.createdAt`
- `Goal.organizationId`, `Goal.type`, `Goal.isActive`
- `Notification.organizationId`, `Notification.userId`

## Regras Financeiras

- `Farm.withdrawnAmount`: **Int em centavos**. `R$ 50,00 = 5000`.
- Nunca usar `Float`/`Decimal` Prisma para valores monetários.
- Formatação para exibição: `centsToReais()` em `@criminals/shared`.

## Regras de FK (On Delete)

- Quase tudo `Cascade` em relação a `Organization` (apagar org limpa tudo)
- `Farm.reviewedById` → `SetNull` (não apagar farm se o revisor for removido)
- `AuditLog.userId` → `SetNull` (preserva log se usuário for removido)

## Comandos Prisma

```bash
# 1. Altere packages/database/prisma/schema.prisma

# 2. Gere o cliente (novo PrismaClient com os tipos atualizados)
pnpm db:generate

# 3-a. Desenvolvimento rápido: empurra schema sem migration (não use em prod)
pnpm db:push

# 3-b. Modo correto com migration
pnpm db:migrate           # cria migration nova + aplica

# 4. Seed (dados iniciais: 1 organização)
pnpm db:seed

# 5. Produção: aplica migrations pendentes
pnpm --filter @criminals/database db:migrate:deploy

# 6. Studio (GUI)
pnpm --filter @criminals/database db:studio
```

## Migrations

Ficam em `packages/database/prisma/migrations/`. Em `.gitignore` inicial está ignorando tudo,
pois a primeira migration será gerada **depois do primeiro `pnpm db:generate` e ajustes finos**.

Quando for gerar a primeira migration:

```bash
pnpm db:migrate dev --name init
```

E então remover a linha `prisma/migrations/*` do `.gitignore`.

## Seed

`packages/database/prisma/seed.ts` cria:

- 1 `Organization` com nome "Criminals System" e `discordGuildId` vindo de `DISCORD_GUILD_ID`

Para adicionar dados iniciais de teste, edite o seed e rode `pnpm db:seed`.

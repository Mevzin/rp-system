# Criminals System — Organização RP (ERP + CRM Discord)

> Um ERP interno completo para organização criminal RP. Autenticação Discord OAuth2, gerenciamento de membros,
> farm com pontuação no ranking, metas, estoque, garagem de veículos, auditoria total, upload de comprovantes
> via Discord CDN + um Bot Discord integrado. **Monorepo pnpm + Turborepo com build ciente da topologia.**

---

## 🧱 O que o sistema já possui (features v1.0+)

### Autenticação e autorização (RBAC)
- Login **100% via Discord OAuth2** (nenhum usuário/senha local).
- 4 **tiers hierárquicos** mapeados automaticamente dos cargos do Discord (guild):
  `OWNER → MANAGER → SUPERVISOR → MEMBER`.
- `PermissionsGuard` por endpoint (NestJS) com granularidade de **25 permissões** (ex: `VIEW_LOGS`,
  `REVIEW_FARM`, `MANAGE_MEMBER_ACCESS`, `MANAGE_GARAGE` etc.).
- Sessão **JWT HTTPOnly (7d) + Refresh (30d)** (cookies never touch JS).
- Primeiro acesso obrigatório: tela de onboarding (`/primeiro-acesso`) para preencher RP ID, telefone,
  patente, nome de guerra.
- Página de gerenciamento de acesso do membro (`siteAccess = ACTIVE | BLOCKED | null` para novatos
  aguardando liberação).

### Dashboard principal (navbar reorganizada em 2 grupos)
| Grupo        | Ordem | Telas                                     | Quem vê?                                     |
| ------------ | ----- | ------------------------------------------|----------------------------------------------|
| **Principal** | 1–6   | Dashboard → Farm → Garagem → Metas → Membros → Ranking | Todos os tiers (MEMBER inclusive) |
| **Sistema**   | 1–3   | Logs / Auditoria → Comprovações → Configurações | Apenas `{OWNER, MANAGER, SUPERVISOR}` (MEMBER **não vê o grupo no sidebar e não consegue acessar via URL direta**) |

### Produção / Farm (2 modalidades)
- **Farm Normal** — quantidade de componentes + valor gasto em R$ + N comprovantes (Banco ou Inventário, limite 5).
- **Comprovante de Carga / Depósito** (BANK_DEPOSIT_PROOF) — 1 anexo de banco **+ seleção de valor
  obrigatória**:
  - 3 presets de carga: **25 mil / 50 mil / 100 mil R$**
  - Opção **"Valor customizado"** livre (R$)
  - Card "Valor gasto (comprovado)" atualiza em **tempo real** + badge colorido por faixa (≥25k / ≥50k / ≥100k / <25k).
- Qualquer enviado inicia com status `PENDING`. Fluxo de aprovação:
  1. **PENDENTE**: cai na aba **Pendentes** da Linha do Tempo (abaixo).
  2. **Staff** clica em Aprovar/Rejeitar → abre um **Modal Countdown 5s** (`ConfirmCountdownDialog`).
     O botão "Confirmar" fica **bloqueado e em contagem regressiva** (barra de progresso), evita
     duplo clique / clique acidental.
  3. Após confirmar → farm muda status, pontuação creditada/rejeitada, AuditLog registra
     **o nome + avatar de quem aprovou/rejeitou** (performer), item some da lista.
- **Comprovantes enviados são anexados em um canal Discord** (env: `FARM_PROOFS_DISCORD_CHANNEL_ID`)
  via `fetch` nativo Node20 (nenhuma lib discord extra), e guardamos `discordJumpUrl` — click abre
  direto o anexo no Discord.
- Colunas tabela farm: Tipo, Autor (avatar+nome), Componentes, R$ gasto, Data, Status, Ações.

### Linha do Tempo / Auditoria (unificada `/logs`)
- 2 abas: **Pendentes** + **Histórico**.
- **Pendentes**: duas listas separadas:
  1. **Novos membros esperando aprovação** (primeiro login Discord com `siteAccess === null`):
     Botões **Liberar acesso (verde)** / **Negar (vermelho)** → modal 5s → grava
     `MEMBER_ACCESS_GRANTED / MEMBER_ACCESS_REVOKED` com performer.
  2. **Farms pendentes** (status=PENDING) — query separada `?status=PENDING` server-side (não depende de
     paginação top100; **todo farm pendente aparece independente da idade**).
- **Histórico (Timeline vertical)**: últimos 50 eventos ordenados desc. Cada card mostra:
  - **Performer da ação** (avatar Discord URL + nome displayName / globalName / username)
  - Badge colorido por `AuditAction` (FARM_APPROVED, USER_LOGIN, VEHICLE_TAKEN, GOAL_CREATED, …)
  - Data relativa (3m atrás) + absoluta (hora pt-BR)
  - Endereço IP, resumo da operação, entidade relacionada.

### Membros
- Colunas: **RP ID** (badge `#`), Membro (displayName + nome Discord), Patente, Telefone
  (placeholder `000-000`), Cadastro em, Tier, Status, Ações.
- **Discord ID não aparece visível**: substituído por botão **Copiar ID** (1 clique).
- Edição inline via Drawer: salvar → toast sucesso + `invalidateQueries` + `refetchQueries` (lista
  recarrega imediatamente).

### Ranking / Metas / Estoque / Garagem
- **Ranking**: score por pontuação farm do período.
- **Metas** (globais / semanais / mensais / individuais): barra de progresso, ativa/desativa,
  criação com `replaceActive=true` substitui meta atual ativa.
- **Estoque**: itens, movimentos IN/OUT/AJUST, inventário.
- **Garagem / Veículos**: status `STORED | OUT | DETAINED`. ações Retirar / Guardar / Detêr / Liberar,
  histórico de movimentação por veículo e por membro. Tudo AuditLogado.

### Comprovações (staff only)
- Tela de **gerenciamento das imagens/provas** enviadas em farms. Gate de permissão no topo do componente:
  mesmo que MEMBER digite `/comprovacoes` direto → card "Acesso restrito a staff" com botão de voltar.

### Auditoria total (37 `AuditAction` catalogadas)
Login, edição perfil, aprovação/rejeição farm, criar/editar/deletar meta, movimentar veículo,
cargos atribuídos/removidos, sincronia Discord, provas, configs etc.
Service de audit tem `$lookup users` (userId → dados do performer) com `displayName, discordId, username,
globalName, avatar` para montar URLs de avatar Discord corretas.

### Bot Discord v14
- Slash commands: `/farm`, `/perfil`, `/metas`, `/ranking`, `/admin`.
- Interactions (buttons/modals/selects/embeds) — **o Bot não tem DB próprio**. Tudo consulta a API
  via HTTP, usando os mesmos services e models.

---

## 🧩 Arquitetura (Monorepo 4 pacotes)

```
packages/
├── shared/          # Tipos, Enums (FarmType, Permission, AuditAction…), Zod Schemas, utils RBAC (getPermissionsForTier)
└── database/        # Mongoose compartilhado (models + conexão singleton + seed)

apps/
├── api/             # NestJS 10 REST  → Mongo 8 + Swagger + JWT HTTPOnly + PermissionsGuard + CRONs limpeza uploads
├── web/             # Next.js 14 App Router  → shadcn/ui + Tailwind + TanStack Query + React Hook Form
└── bot/             # discord.js v14      → zero banco, consome API
```

**Fonte única da verdade**: Mongo (via `@criminals/database`).
Tudo passa pela API — frontend, bot e terceiros.
Nenhuma regra duplicada; schemas compartilhados (`@criminals/shared`) garantem consistência de
tipos entre API ↔ WEB ↔ BOT em compile-time.

### Princípios
- Valor monetário sempre **armazenado em centavos (int)**. Ex: `R$ 25.000,00 = 2500000`.
- Imagens de comprovação: Discord CDN (FARM_PROOFS channel) e fallback uploads locais `apps/api/uploads/`.
- Escritas em múltiplas collections usam **transações ACID** (helper `runInTxSession`).
- Aggregations substituem JOINs SQL (`$match → $lookup → $group → $sort → $limit`).

---

## ⚙️ Variáveis de ambiente (`.env`)

Copie o modelo **`.env.example`** para **`.env`** na raiz e preencha. Todas são exigidas.

| Grupo | Chave | Obrigatoria? | Exemplo / descrição |
|---|---|---|---|
| Servidor API | `PORT` | ✅ | `4000` (padrão) |
| **Mongo** | `MONGODB_URI` | ✅ | `mongodb+srv://user:pass@cluster0.fwej7.mongodb.net/criminals?retryWrites=true&w=majority` (recomendado MongoDB Atlas) **ou** local `mongodb://127.0.0.1:27017/criminals` (Docker). |
| Mongo (opcional) | `MONGODB_DB_NAME` | — | `criminals` |
| Mongo (opcional) | `MONGODB_TIMEOUT_MS` | — | `30000` |
| Identidade | `ORGANIZATION_NAME` | ✅ | Nome da sua org RP (ex: `Criminals RP`) |
| **Discord OAuth2** | `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `DISCORD_BOT_TOKEN` / `DISCORD_GUILD_ID` | ✅ | Pegar em Discord Developer Portal → OAuth2 → Reset de segredos. Guild = ID do seu servidor. |
| Discord (callback) | `DISCORD_REDIRECT_URI` | ✅ | **Desenvolvimento**: `http://localhost:4000/api/auth/discord/callback` <br/> **Produção**: `https://api.seudominio.com/api/auth/discord/callback` |
| Discord (roles tiers) | `DISCORD_ROLE_OWNER_ID` / `_MANAGER_ID` / `_SUPERVISOR_ID` / `_MEMBER_ID` | ✅ | IDs dos 4 cargos hierárquicos no seu Discord (Settings → Server Settings → Roles → Copy ID). |
| Discord (channels) | `DISCORD_CHANNEL_LOGS_ID` / `DISCORD_CHANNEL_NOTIFICATIONS_ID` | ✅ | Canais de texto para logs do bot e notificações. |
| **Discord (PROOFS)** | `FARM_PROOFS_DISCORD_CHANNEL_ID` | ✅ | **Canal de texto onde os comprovantes de carga/farm são enviados** como anexos. **O bot precisa ter permissão `Enviar mensagens + Anexar arquivos` neste canal.** |
| **JWT** | `JWT_SECRET`, `JWT_EXPIRES_IN` | ✅ | Use pelo menos 64 chars aleatórios. Ex: `7d`. |
| Refresh JWT | `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` | ✅ | **Diferente do primeiro**. Ex: `30d`. |
| Uploads fallback | `UPLOAD_DIR`, `UPLOAD_RETENTION_DAYS` | ✅ | `./uploads` (relativo a `apps/api`); `30` (limpeza automática). |
| URLs públicas | `WEB_URL`, `API_URL`, `CORS_ORIGIN` | ✅ | Dev: `http://localhost:3000` / `http://localhost:4000/api` <br/> Prod: domínios reais (CORS_ORIGIN separado por vírgula, sem espaços). |
| Bot ↔ API | `API_KEY` | ➖ | Chave opcional de comunicação de serviço. |
| Front (NEXT_PUBLIC_) | `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WEB_URL` | ✅ | **Mantidas como public porque o browser precisa delas**. Mesmos valores de `WEB_URL`/`API_URL`. |

---

## 🚀 Como usar local (Windows / macOS / Linux)

### 1. Pré-requisitos
- **Node ≥ 18.17 LTS** (recomendado Node 20 LTS, pois `fetch` nativo estável).
- **pnpm ≥ 9.0** (package manager do monorepo; definido em `.npmrc` + `packageManager`).
- **MongoDB**: MongoDB Atlas (fácil, recomendado) **OU** local via Docker:
  ```bash
  docker run -d --name criminals-mongo -p 27017:27017 -e MONGO_INITDB_DATABASE=criminals mongo:7
  ```
- **Uma App do Discord** criada em <https://discord.com/developers/applications> (OAuth2 + Bot habilitado,
  Bot no servidor com `Server Members Intent`, `Message Content Intent`, `Guild Intent`, permissões
  de attach files).

### 2. Clonar + instalar dependências
```bash
git clone <seu-repo>
cd criminals-system
corepack enable        # garante pnpm via packageManager
pnpm install
```

### 3. Configurar `.env`
Copie `.env.example` → `.env` e preencha todas as chaves acima (principalmente Discord, Mongo,
`FARM_PROOFS_DISCORD_CHANNEL_ID` e JWT secrets).

### 4. (Opcional) Seed do banco
Se quiser população inicial:
```bash
pnpm db:seed
```
Cria a org padrão, permissões, e o primeiro owner mapeado do Discord role.

### 5. Subir tudo
```bash
pnpm dev
```
Abre automaticamente:
- **Web**:  <http://localhost:3000>
- **API**:  <http://localhost:4000/api> (Swagger em <http://localhost:4000/api/docs>)
- **Bot**:  Discord slash-commands.

> Primeira vez? Rode **1x** para publicar os slash-commands no Discord:
> ```bash
> pnpm bot:deploy-commands
> ```

### 6. Fluxo inicial de login / primeiro acesso
1. Vá em <http://localhost:3000/login> → "Entrar com Discord".
2. Autoriza OAuth. **Se seu cargo no Discord = OWNER/MANAGER/SUPERVISOR**, você tem acesso total.
   Se for **MEMBER novato**, cai em `/primeiro-acesso` (preencher RP ID, telefone, patente).
   Em seguida, **você fica `siteAccess = null`** e precisa que **qualquer staff abra `/logs` →
   Pendentes → clique em "Liberar acesso"**. Somente após a liberação você consegue usar o resto do
   painel.

---

## 📚 Scripts úteis (raiz)

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe **tudo** (web + api + bot) em watch mode. |
| `pnpm build` | Build de todos os pacotes (cache turbo, só roda o que mudou). |
| `pnpm lint` | ESLint de todos os pacotes. |
| `pnpm format` | Prettier escreve. `pnpm format:check` valida. |
| `pnpm db:connect` | Checa conexão com MongoDB. |
| `pnpm db:seed` | Popula org inicial, permissões defaults, owner se já houver role. |
| `pnpm bot:deploy-commands` | Publica os slash commands do Bot no Discord (guilde). |
| `pnpm clean` | Apaga caches turbo + node_modules (reseta build state). |

### Filtros por pacote (turbo/pnpm)
```bash
pnpm --filter @criminals/api build    # só back-end
pnpm --filter @criminals/web build    # só front-end
pnpm --filter @criminals/bot dev      # só bot watch
pnpm --filter @criminals/shared dev   # só shared watch
```

---

## 🔐 Permissões e RBAC (camada API)

Matriz resumida — tudo governa pelo tier Discord:

| Permissão | OWNER | MANAGER | SUPERVISOR | MEMBER |
|---|---|---|---|---|
| VIEW_DASHBOARD, VIEW_RANKING, VIEW_GOAL(S), VIEW_GARAGE, VIEW_INVENTORY | ✅ | ✅ | ✅ | ✅ |
| CREATE_FARM, VIEW_OWN_FARMS, TAKE_VEHICLE, STORE_VEHICLE | ✅ | ✅ | ✅ | ✅ |
| **VIEW_ALL_FARMS**, **REVIEW_FARM**, **VIEW_MEMBERS**, **VIEW_LOGS**, **VIEW_DISCORD**, **SYNC_DISCORD_MEMBERS**, **MANAGE_MEMBER_ACCESS** | ✅ | ✅ | ✅ | ❌ |
| **MANAGE_MEMBERS**, **MANAGE_ROLES**, **MANAGE_DISCORD_ROLE_CONFIG**, **MANAGE_GARAGE**, **MANAGE_INVENTORY**, **MANAGE_GOAL(S)**, **MANAGE_CONFIG**, **VIEW_VEHICLE_HISTORY** | ✅ | ✅ | ❌ | ❌ |

Fonte da verdade: `getPermissionsForTier(DiscordRoleTier)` em `packages/shared/src/utils/index.ts`.

---

## 🖥️ Rodar build de produção (todos os pacotes)
```bash
pnpm build
```
Resultado:
```
packages/shared/dist/     ← cjs + esm + d.ts
packages/database/dist/   ← cjs + esm + d.ts
apps/api/dist/            ← Nest build
apps/bot/dist/            ← tsup
apps/web/.next/           ← Next standalone output? (ver next.config.js)
```

Para subir a API standalone:
```bash
cd apps/api && node dist/main
```

Para subir o Web standalone:
```bash
cd apps/web && pnpm start       # (porta 3000, ou NEXT_PORT=4001)
```

---

## 🌐 Como fazer Deploy (exemplos)

### Opção A — Frontend: Vercel (recomendado) + Backend: Render / Railway / Fly.io + Mongo Atlas
1. **Mongo Atlas**: Free tier (M0) é suficiente para começar. Copie a connection string completa.
2. **Deploy API**:
   - Conecte seu repo no Render / Railway.
   - Root directory: `/`
   - **Build command**:
     ```bash
     corepack enable && pnpm install --frozen-lockfile && pnpm --filter @criminals/shared build && pnpm --filter @criminals/database build && pnpm --filter @criminals/api build
     ```
   - **Start command**:
     ```bash
     cd apps/api && node dist/main
     ```
   - **Environment variables**: cole TODAS as do `.env` em Secrets. `PORT` geralmente a própria
     plataforma injeta, senão use 10000 (Render) ou 3000 (Railway default).
3. **Deploy Web (Next.js) em Vercel**:
   - Importe o repo em <https://vercel.com/new>.
   - Framework preset: **Next.js**.
   - **Environment Variables** (cole as `NEXT_PUBLIC_*` + `WEB_URL` + `CORS_ORIGIN`).
     - `NEXT_PUBLIC_API_URL=https://api.seudominio.com/api`
     - `NEXT_PUBLIC_WEB_URL=https://app.seudominio.com`
   - **Build command**: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @criminals/web build`
   - Deploy.
4. **Deploy Bot** (em uma VPS pequena / Railway worker / Fly.io):
   - **Build**:
     ```bash
     corepack enable && pnpm install --frozen-lockfile && pnpm --filter @criminals/shared build && pnpm --filter @criminals/bot build
     ```
   - **Run** (forever):
     ```bash
     cd apps/bot && pm2 start dist/index.js --name criminals-bot
     ```
   - Antes da primeira vez: `pnpm bot:deploy-commands`.
5. **Domínios + CORS**:
   - Crie DNS: `app.seudominio.com` → CNAME para Vercel. `api.seudominio.com` → CNAME Render.
   - Em Secrets do deploy da API, defina:
     ```
     CORS_ORIGIN=https://app.seudominio.com,https://api.seudominio.com
     WEB_URL=https://app.seudominio.com
     API_URL=https://api.seudominio.com/api
     DISCORD_REDIRECT_URI=https://api.seudominio.com/api/auth/discord/callback
     ```
   - No Discord Developer Portal → **OAuth2 → Redirects**: cadastre a URL pública do callback
     (**se não cadastrar OAuth falha com erro redirect_uri_mismatch**).

### Opção B — Tudo em uma VPS Ubuntu (Docker + Nginx + PM2)
Guia rápido (script adaptado):
```bash
# 1) instalar node 20 + pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx
corepack enable

# 2) mongo (docker)
apt install -y docker.io
docker run -d --name criminals-mongo --restart unless-stopped \
  -p 127.0.0.1:27017:27017 \
  -e MONGO_INITDB_DATABASE=criminals \
  -v /var/lib/criminals-mongo:/data/db mongo:7

# 3) build
cd /opt/criminals-system
pnpm install --frozen-lockfile
pnpm build

# 4) rodar (pm2)
npm i -g pm2
pm2 start apps/api/dist/main.js --name criminals-api
pm2 start apps/web/node_modules/next/dist/bin/next --name criminals-web -- -p 3000 -c apps/web
pm2 start apps/bot/dist/index.js --name criminals-bot
pm2 save && pm2 startup
```
- Nginx reverse proxy para `:3000` (web) e `:4000` (api) + SSL via certbot
  (`certbot --nginx -d app.seudominio.com -d api.seudominio.com`).
- Atualize `DISCORD_REDIRECT_URI`, `CORS_ORIGIN`, `WEB_URL`, `API_URL`, `NEXT_PUBLIC_*`.

---

## ⚠️ Checklist de lançamento (produção)
Antes de abrir para usuários:

- [ ] **JWT secrets**: gerou dois strings **distintos**, longos (64 chars), e não os cometeu no git.
- [ ] **Discord OAuth redirects**: preencheu a URL pública no Developer Portal.
- [ ] **Bot no Discord**: concedeu cargos `Manage Roles / Send Messages / Attach Files / Embed Links`.
- [ ] **Canal de provas**: `FARM_PROOFS_DISCORD_CHANNEL_ID` existe e bot pode enviar anexos lá.
- [ ] **CORS_ORIGIN**: contém **apenas** seus domínios públicos (não `*`).
- [ ] **Mongo Atlas**: Network Access liberado para IPs do deploy (ou 0.0.0.0/0 temporariamente).
- [ ] **Testou o primeiro fluxo**: Owner loga → MEMBER novato loga → abre `/logs` → tab Pendentes
      → **Liberar** → abre modal 5s → confirma → MEMBER aparece na lista Membros como **ACTIVE** e
      ação aparece no Histórico com nome do Owner correto.
- [ ] **Testou farm**: Envia um farm → Pendências aparece no `/logs` → Aprovar 5s → ranking + meta
      atualiza → Histórico mostra "Farm aprovado por ${você}".
- [ ] `.gitignore` abaixo configurado — secrets, node_modules, builds, uploads **NUNCA** no repo.

---

## 🛠️ Comandos referência (por pacote)

| Pacote | Dev | Build | Produção |
|---|---|---|---|
| `@criminals/shared` | `pnpm --filter shared dev` (tsup watch) | `pnpm --filter shared build` | — |
| `@criminals/database` | — | `pnpm --filter database build` | — |
| `@criminals/api` | `pnpm --filter api dev` | `pnpm --filter api build` | `cd apps/api && node dist/main` |
| `@criminals/web` | `pnpm --filter web dev` | `pnpm --filter web build` | `cd apps/web && pnpm start` |
| `@criminals/bot` | `pnpm --filter bot dev` | `pnpm --filter bot build` | `cd apps/bot && node dist/index.js` |

---

## 📁 Links do código (estrutura de referência)
- [shared enums & schemas](packages/shared/src)
- [database models mongoose](packages/database/src/models)
- [API controllers + services NestJS](apps/api/src/modules)
- [WEB páginas do dashboard (App Router)](apps/web/src/app/(dashboard))
- [Sidebar (desktop)](apps/web/src/components/app-sidebar.tsx) / [Sidebar mobile](apps/web/src/components/mobile-sidebar.tsx)
- [Linha do tempo unificada / Pendentes + Histórico](apps/web/src/app/(dashboard)/logs/page.tsx)
- [ConfirmCountdownDialog (bloqueio 5s)](apps/web/src/components/ui/confirm-countdown-dialog.tsx)
- [Farm page (modos Normal + Carga com presets 25/50/100k)](apps/web/src/app/(dashboard)/farm/page.tsx)

---

Boa sorte no RP. 🏴‍☠️

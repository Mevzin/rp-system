# Discord — OAuth2 + Bot

## 1. Discord Developer Portal

1. Acesse <https://discord.com/developers/applications>
2. **New Application** → dê um nome
3. Em **Bot** → clique em **Add Bot**, copie o token (`DISCORD_BOT_TOKEN`)
4. Em **OAuth2 → General**:
   - **Client ID** → `DISCORD_CLIENT_ID`
   - **Client Secret** → `DISCORD_CLIENT_SECRET`
5. Em **OAuth2 → Redirects**, adicione:
   ```
   http://localhost:4000/api/auth/discord/callback
   ```
   (em produção, substitua por seu domínio real)
6. Convite o bot pro servidor com permissões. Scopes recomendados:
   `bot` + `applications.commands`. Permissões:
   - Manage Roles (abaixo da role do bot na hierarquia)
   - Send Messages, Embed Links, Attach Files, Use Slash Commands
   - Read Messages/View Channels

URL de convite (preencha o `CLIENT_ID`):
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=268435456&scope=bot+applications.commands
```

## 2. Variáveis de ambiente do Discord

```env
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=                         # ID do servidor
DISCORD_REDIRECT_URI=http://localhost:4000/api/auth/discord/callback

# Cargo → Tier (para RBAC)
DISCORD_ROLE_OWNER_ID=
DISCORD_ROLE_MANAGER_ID=
DISCORD_ROLE_SUPERVISOR_ID=

# Canais (para notificações e logs)
DISCORD_CHANNEL_FARM_ID=
DISCORD_CHANNEL_LOGS_ID=
DISCORD_CHANNEL_NOTIFICATIONS_ID=
```

## 3. Comandos do Bot (implementados)

| Comando     | Descrição                                                               |
|-------------|-------------------------------------------------------------------------|
| `/farm`     | Abre Modal (quantidade + valor retirado + obs). Responde com Embed e botão "Abrir Painel" p/ enviar proofs no site. |
| `/ranking [periodo]` | Ranking semana/mês/geral, top 10 em embed + botão "Abrir Ranking"   |
| `/meta [tipo]`    | Meta ativa do tipo selecionado (padrão mensal global) com barra de progresso |
| `/perfil [usuario]` | Perfil do membro com estatísticas, ranking, meta, retirado total |

## 4. Deploy de comandos

```bash
pnpm bot:deploy-commands
```

Registra todos os slash commands no guild definido por `DISCORD_GUILD_ID`.
Aparecem instantaneamente. Para comandos globais (todas as guilds), demora até 1h.

## 5. Registro de Farm pelo Bot

```
Usuário → /farm
  ↓ abre Modal
Quantidade? [      ]
Valor retirado? [      ]
Observação? [               ]
  ↓ submit
Bot responde ephemeral:
  ✅ Farm registrado parcialmente
     Quantidade: 1.500
     Valor retirado: R$ 50,00
     Para concluir, envie as comprovações pelo painel web.
                                   [ Abrir Painel ] ← linka WEB_URL/farm
```

O Bot **não envia diretamente** o farm para a API na fase atual por segurança (precisamos de autenticação serviço-a-serviço). Na fase 7 (bot completo) implementaremos:

1. Rota de Service Token na API que valida uma chave compartilhada e retorna JWT de serviço;
2. O Bot então chama `POST /farm` com o `discordId` do autor, o serviço resolve usuário e permissões;
3. Cria Farm com `proofs: []` (pending);
4. Usuário completa os proofs pelo site (patch no farm ou anexa proofs).

## 6. Embed Padrão

Helpers em `apps/bot/src/embeds/index.ts`:
- `createEmbed({...})` — paleta: `EMBED_COLORS` (primary/success/warning/error/info/farm/ranking/goals)
- `formatCurrency(cents)` → `R$ 50,00`
- `formatNumber(n)` → `1.500`
- `createProgressBar(atual, total, tamanho)` → `[████████░░░░] 60.0%`
- `getAvatarUrl(userId, avatar)` — URL CDN correta (GIF se `a_`)

## 7. Futuras Notificações (Fase 8)

Eventos a integrar por Webhook (ou pela API Discord REST já implementada):

| Evento             | Onde notificar                                 | Conteúdo |
|--------------------|------------------------------------------------|----------|
| `FARM_CREATED`     | `DISCORD_CHANNEL_FARM_ID`                      | Embed: usuário, qtd, valor, status PENDING |
| `FARM_APPROVED`    | DM do usuário + canal de notificações          | Aprovado por, qtd, valor |
| `FARM_REJECTED`    | DM do usuário **inclui motivo**                | Motivo, dados do farm |
| `GOAL_CREATED` etc| `DISCORD_CHANNEL_LOGS_ID`                      | Audit log formatado |
| Role assigned      | `DISCORD_CHANNEL_LOGS_ID` + DM do membro       | Quem atribuiu, qual cargo |
| Ações admin        | `DISCORD_CHANNEL_LOGS_ID`                      | Audit log com action + metadata |

A API possui `DiscordService.sendDM(userId, embeds)` e `sendMessageToChannel(channelId, embeds)` prontos.

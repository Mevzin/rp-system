import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import type {
  BotCommand,
  ButtonHandler,
  ModalHandler,
  SelectMenuHandler,
} from "@/types";
import { config } from "@/config";
import { loadCommands } from "@/commands";
import { loadEvents } from "@/events";

class BotClient extends Client {
  public commands: Collection<string, BotCommand> = new Collection();
  public buttons!: Collection<string, ButtonHandler>;
  public modals!: Collection<string, ModalHandler>;
  public selects!: Collection<string, SelectMenuHandler>;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel],
    });
  }
}

const client = new BotClient();

async function bootstrap() {
  const token = config.discord.token;
  const apiBasePreview = config.api.baseUrl.replace(/^https?:\/\//, "");
  console.log("🤖 Iniciando bot...");
  console.log(`   Guild ID  : ${config.discord.guildId || "<VAZIO>"}`);
  console.log(`   Client ID : ${config.discord.clientId || "<VAZIO>"}`);
  console.log(`   API       : ${apiBasePreview}`);

  if (!token) {
    console.error(
      "❌ DISCORD_BOT_TOKEN não foi carregado do .env (está vazio). Verifique a variável DISCORD_BOT_TOKEN no .env da raiz.",
    );
    process.exit(1);
  }

  try {
    await loadCommands(client);
    console.log(`✅ Comandos carregados: ${client.commands.size}`);

    await loadEvents(client);
    console.log("✅ Eventos carregados");
  } catch (error) {
    console.error("❌ Erro ao carregar comandos/eventos:", error);
    process.exit(1);
  }

  try {
    await client.login(token);
    console.log(`✅ Logado como ${client.user?.tag ?? "desconhecido"}`);
    console.log(`ℹ️  ID do bot: ${client.user?.id}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao fazer login no Discord Gateway:");
    console.error("   Causas comuns:");
    console.error("   1. Token inválido ou expirado — gere um novo em discord.com/developers/applications → Bot → Reset Token");
    console.error("   2. Privileged Gateway Intents (SERVER MEMBERS / MESSAGE CONTENT) desativados no Discord Dev Portal");
    console.error("   3. Bot não está no servidor (DISCORD_GUILD_ID) — convide-o por URL OAuth2");
    console.error("   4. Sem conexão com a internet");
    console.error(`   Mensagem do Discord.js: ${msg}`);
    process.exit(1);
  }
}

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception no bot:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("💥 Unhandled Rejection no bot:", err);
});

bootstrap();

export { BotClient, client };

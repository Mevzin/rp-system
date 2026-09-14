import { BotClient } from ".";
import { config } from "@/config";
import { loadCommands } from "@/commands";
import { loadEvents } from "@/events";

const client = new BotClient();

async function bootstrap() {
  try {
    console.log("🤖 Iniciando bot...");

    await loadCommands(client);
    console.log(`✅ Comandos carregados: ${client.commands.size}`);

    await loadEvents(client);
    console.log("✅ Eventos carregados");

    await client.login(config.discord.token);
    console.log(`✅ Logado como ${client.user?.tag}`);
  } catch (error) {
    console.error("❌ Erro ao iniciar o bot:", error);
    process.exit(1);
  }
}

bootstrap();

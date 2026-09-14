import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

const projectRoot = resolve(__dirname, "..", "..", "..", "..");
const rootEnvPath = resolve(projectRoot, ".env");
const localEnvPath = resolve(projectRoot, ".env.local");

dotenvConfig({ path: existsSync(localEnvPath) ? localEnvPath : rootEnvPath });

export const config = {
  discord: {
    token: process.env.DISCORD_BOT_TOKEN ?? "",
    clientId: process.env.DISCORD_CLIENT_ID ?? "",
    guildId: process.env.DISCORD_GUILD_ID ?? "",
  },
  api: {
    baseUrl:
      process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
    apiKey: process.env.API_KEY,
  },
  web: {
    url: process.env.WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
  },
  channels: {
    farm: process.env.DISCORD_CHANNEL_FARM_ID,
    logs: process.env.DISCORD_CHANNEL_LOGS_ID,
    notifications: process.env.DISCORD_CHANNEL_NOTIFICATIONS_ID,
  },
  roles: {
    owner: process.env.DISCORD_ROLE_OWNER_ID,
    manager: process.env.DISCORD_ROLE_MANAGER_ID,
    supervisor: process.env.DISCORD_ROLE_SUPERVISOR_ID,
    member: process.env.DISCORD_ROLE_MEMBER_ID,
  },
} as const;

const requiredForBot = [
  ["DISCORD_BOT_TOKEN", config.discord.token],
  ["DISCORD_CLIENT_ID", config.discord.clientId],
  ["DISCORD_GUILD_ID", config.discord.guildId],
];

const missing = requiredForBot.filter(([, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
  console.warn(
    `[Bot] ⚠️  Variáveis de ambiente faltando (o bot pode não funcionar corretamente): ${missing.join(", ")}`,
  );
}

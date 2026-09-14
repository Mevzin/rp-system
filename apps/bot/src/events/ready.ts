import { Events } from "discord.js";
import type { BotClient } from "@/index";
import type { BotEvent } from "@/types";

export const readyEvent: BotEvent = {
  name: Events.ClientReady,
  once: true,
  execute: (client: BotClient) => {
    console.log(`✅ Bot está online: ${client.user?.tag}`);
    console.log(`📊 Servidores: ${client.guilds.cache.size}`);
  },
};

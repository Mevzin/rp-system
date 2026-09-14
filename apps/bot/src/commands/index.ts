import type { BotCommand } from "@/types";
import type { BotClient } from "@/index";
import { farmCommand } from "./farm/farm";
import { rankingCommand } from "./ranking/ranking";
import { metaCommand } from "./metas/meta";
import { perfilCommand } from "./perfil/perfil";

export const commands: BotCommand[] = [
  farmCommand,
  rankingCommand,
  metaCommand,
  perfilCommand,
];

export async function loadCommands(client: BotClient): Promise<void> {
  for (const command of commands) {
    client.commands.set(command.data.name, command);
  }
}

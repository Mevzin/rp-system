import { Events } from "discord.js";
import type { BotClient } from "@/index";
import type { BotEvent } from "@/types";

export const interactionCreateEvent: BotEvent = {
  name: Events.InteractionCreate,
  execute: async (client: BotClient, interaction: any) => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(client, interaction);
      } catch (error) {
        console.error(
          `❌ Erro no comando ${interaction.commandName}:`,
          error,
        );
        const reply = {
          content:
            "Ocorreu um erro ao executar esse comando. Tente novamente.",
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply).catch(() => {});
        } else {
          await interaction.reply(reply).catch(() => {});
        }
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      const handler = client.modals?.get(interaction.customId);
      if (handler) {
        try {
          await handler.execute(client, interaction);
        } catch (error) {
          console.error(
            `❌ Erro no modal ${interaction.customId}:`,
            error,
          );
        }
      }
      return;
    }

    if (interaction.isButton()) {
      const handler = client.buttons?.get(interaction.customId);
      if (handler) {
        try {
          await handler.execute(client, interaction);
        } catch (error) {
          console.error(
            `❌ Erro no botão ${interaction.customId}:`,
            error,
          );
        }
      }
      return;
    }

    if (interaction.isAnySelectMenu()) {
      const handler = client.selects?.get(interaction.customId);
      if (handler) {
        try {
          await handler.execute(client, interaction);
        } catch (error) {
          console.error(
            `❌ Erro no select ${interaction.customId}:`,
            error,
          );
        }
      }
      return;
    }
  },
};

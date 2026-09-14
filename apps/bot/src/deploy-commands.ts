import { REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";
import { config } from "@/config";
import { commands } from "@/commands";

const commandsData = commands.map((cmd) => {
  const builder = new SlashCommandBuilder()
    .setName(cmd.data.name)
    .setDescription(cmd.data.description);

  if (cmd.data.options) {
    for (const opt of cmd.data.options as any[]) {
      if (opt.type === "integer") {
        builder.addIntegerOption((option) =>
          option
            .setName(opt.name)
            .setDescription(opt.description)
            .setRequired(opt.required ?? false),
        );
      } else if (opt.type === "string") {
        builder.addStringOption((option) =>
          option
            .setName(opt.name)
            .setDescription(opt.description)
            .setRequired(opt.required ?? false),
        );
      } else if (opt.type === "user") {
        builder.addUserOption((option) =>
          option
            .setName(opt.name)
            .setDescription(opt.description)
            .setRequired(opt.required ?? false),
        );
      }
    }
  }

  if (cmd.data.dmPermission !== undefined) {
    builder.setDMPermission(cmd.data.dmPermission);
  }

  if (cmd.data.defaultMemberPermissions) {
    builder.setDefaultMemberPermissions(cmd.data.defaultMemberPermissions);
  }

  return builder.toJSON();
});

const rest = new REST().setToken(config.discord.token);

async function deploy() {
  try {
    console.log(
      `🔄 Atualizando ${commandsData.length} comandos (/) para o servidor...`,
    );

    await rest.put(
      Routes.applicationGuildCommands(
        config.discord.clientId,
        config.discord.guildId,
      ),
      { body: commandsData },
    );

    console.log("✅ Comandos atualizados com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao atualizar comandos:", error);
    process.exit(1);
  }
}

deploy();

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { BotClient } from "@/index";
import type { BotCommand } from "@/types";
import { config } from "@/config";
import { createEmbed, EMBED_COLORS, formatNumber, createProgressBar } from "@/embeds";
import { apiGet } from "@/api/client";
import { GoalType } from "@criminals/shared";

export const metaCommand: BotCommand = {
  data: {
    name: "meta",
    description: "Ver o progresso das metas atuais",
    options: [
      {
        type: "string",
        name: "tipo",
        description: "Tipo de meta",
        required: false,
        choices: [
          { name: "Mensal Global", value: "GLOBAL_MONTHLY" },
          { name: "Semanal Global", value: "GLOBAL_WEEKLY" },
          { name: "Mensal Individual", value: "INDIVIDUAL_MONTHLY" },
          { name: "Semanal Individual", value: "INDIVIDUAL_WEEKLY" },
        ],
      },
    ],
    dmPermission: false,
  },
  execute: async (_client: BotClient, interaction) => {
    await interaction.deferReply({ ephemeral: false });

    const tipo =
      (interaction.options.getString("tipo") as GoalType) ??
      GoalType.GLOBAL_MONTHLY;

    const typeLabels: Record<GoalType, string> = {
      [GoalType.GLOBAL_WEEKLY]: "Meta Semanal Global",
      [GoalType.GLOBAL_MONTHLY]: "Meta Mensal Global",
      [GoalType.INDIVIDUAL_WEEKLY]: "Meta Semanal Individual",
      [GoalType.INDIVIDUAL_MONTHLY]: "Meta Mensal Individual",
    };

    try {
      const goals = await apiGet<any[]>("/goals", {
        type: tipo,
        isActive: "true",
      });

      if (!goals || goals.length === 0) {
        await interaction.editReply({
          content: "Nenhuma meta ativa encontrada para esse tipo.",
        });
        return;
      }

      const goal = goals[0];
      const progressBar = createProgressBar(goal.currentAmount, goal.targetAmount);
      const percentage =
        goal.targetAmount > 0
          ? ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)
          : "0";

      const embed = createEmbed({
        title: `🎯 ${typeLabels[tipo]}`,
        color: EMBED_COLORS.goals,
        fields: [
          {
            name: "Meta",
            value: `\`${formatNumber(goal.targetAmount)}\``,
            inline: true,
          },
          {
            name: "Atual",
            value: `\`${formatNumber(goal.currentAmount)}\``,
            inline: true,
          },
          {
            name: "Progresso",
            value: `\`${percentage}%\``,
            inline: true,
          },
          {
            name: "Barra",
            value: `\`\`\`${progressBar}\`\`\``,
          },
        ],
        footer: {
          text: `De ${new Date(goal.startDate).toLocaleDateString("pt-BR")} a ${new Date(
            goal.endDate,
          ).toLocaleDateString("pt-BR")}`,
        },
        timestamp: true,
      });

      const button = new ButtonBuilder()
        .setLabel("Ver Metas")
        .setStyle(ButtonStyle.Link)
        .setURL(`${config.web.url}/metas`)
        .setEmoji("🎯");

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } catch (error: any) {
      await interaction.editReply({
        content: `❌ Erro ao buscar metas: ${error?.message ?? "Erro desconhecido"}`,
      });
    }
  },
};

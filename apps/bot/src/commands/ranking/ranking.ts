import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";
import type { BotClient } from "@/index";
import type { BotCommand } from "@/types";
import { config } from "@/config";
import { createEmbed, EMBED_COLORS, formatNumber, getAvatarUrl } from "@/embeds";
import { apiGet } from "@/api/client";

export const rankingCommand: BotCommand = {
  data: {
    name: "ranking",
    description: "Ver o ranking atual da organização",
    options: [
      {
        type: "string",
        name: "periodo",
        description: "Período do ranking",
        required: false,
        choices: [
          { name: "Semanal", value: "week" },
          { name: "Mensal", value: "month" },
          { name: "Geral", value: "all" },
        ],
      },
    ],
    dmPermission: false,
  },
  execute: async (_client: BotClient, interaction) => {
    await interaction.deferReply({ ephemeral: false });

    const period = (interaction.options.getString("periodo") ??
      "month") as "week" | "month" | "all";

    const periodLabels: Record<string, string> = {
      week: "SEMANA",
      month: "MÊS",
      all: "GERAL",
    };

    try {
      const ranking = await apiGet<any[]>("/statistics/ranking", {
        period,
        limit: 10,
      });

      if (!ranking || ranking.length === 0) {
        await interaction.editReply({
          content: "Nenhum registro encontrado para esse período.",
        });
        return;
      }

      const rankingLines = ranking
        .map((entry, idx) => {
          const medals = ["🥇", "🥈", "🥉"];
          const prefix = medals[idx] ?? `**${idx + 1}.**`;
          const name = entry.globalName ?? entry.username;
          const qty = formatNumber(entry.quantity);
          return `${prefix} ${name} — ${qty}`;
        })
        .join("\n");

      const topUser = ranking[0];
      const avatarUrl = getAvatarUrl(topUser.discordId, topUser.avatar);

      const embed = createEmbed({
        title: `🏆 RANKING DO ${periodLabels[period]}`,
        description: rankingLines,
        color: EMBED_COLORS.ranking,
        thumbnail: avatarUrl,
        footer: {
          text: `Top 10 de ${ranking.length} membros`,
        },
        timestamp: true,
      });

      const button = new ButtonBuilder()
        .setLabel("Abrir Ranking")
        .setStyle(ButtonStyle.Link)
        .setURL(`${config.web.url}/ranking`)
        .setEmoji("📊");

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } catch (error: any) {
      await interaction.editReply({
        content: `❌ Erro ao buscar ranking: ${error?.message ?? "Erro desconhecido"}`,
      });
    }
  },
};

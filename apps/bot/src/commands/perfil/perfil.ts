import type { BotClient } from "@/index";
import type { BotCommand } from "@/types";
import {
  createEmbed,
  EMBED_COLORS,
  formatCurrency,
  formatNumber,
  getAvatarUrl,
} from "@/embeds";
import { apiGet } from "@/api/client";

export const perfilCommand: BotCommand = {
  data: {
    name: "perfil",
    description: "Ver seu perfil ou o de outro membro",
    options: [
      {
        type: "user",
        name: "usuario",
        description: "Usuário para ver o perfil",
        required: false,
      },
    ],
    dmPermission: false,
  },
  execute: async (_client: BotClient, interaction) => {
    await interaction.deferReply({ ephemeral: false });

    const target = interaction.options.getUser("usuario") ?? interaction.user;

    const avatarUrl = getAvatarUrl(target.id, target.avatar ?? null);
    const displayName = target.displayName ?? target.username;

    try {
      const dashboard = await apiGet<any>("/statistics/dashboard", {
        userId: target.id,
      });

      const ranking = await apiGet<any[]>("/statistics/ranking", {
        period: "month",
        limit: 100,
      });

      const position =
        ranking.findIndex(
          (r: any) => r.discordId === target.id,
        ) + 1 || "-";

      const goals = await apiGet<any[]>("/goals", {
        type: "INDIVIDUAL_MONTHLY",
        isActive: "true",
      });

      const goal = goals[0];
      const goalProgress = goal
        ? `\`${formatNumber(goal.currentAmount)}\` / \`${formatNumber(goal.targetAmount)}\` (${((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)}%)`
        : "Sem meta ativa";

      const embed = createEmbed({
        title: `👤 Perfil de ${displayName}`,
        color: EMBED_COLORS.primary,
        thumbnail: avatarUrl,
        fields: [
          {
            name: "💼 Nome",
            value: displayName,
            inline: true,
          },
          {
            name: "🏆 Ranking Mensal",
            value: position === "-" ? "Sem posição" : `#${position}`,
            inline: true,
          },
          { name: "\u200B", value: "\u200B", inline: true },
          {
            name: "💰 Farm Total",
            value: formatNumber(dashboard?.totalFarm ?? 0),
            inline: true,
          },
          {
            name: "📅 Farm do Mês",
            value: formatNumber(dashboard?.monthlyFarm ?? 0),
            inline: true,
          },
          { name: "\u200B", value: "\u200B", inline: true },
          {
            name: "📈 Média Diária",
            value: formatNumber(dashboard?.dailyAverage ?? 0),
            inline: true,
          },
          {
            name: "💸 Retirado Total",
            value: formatCurrency(dashboard?.totalWithdrawn ?? 0),
            inline: true,
          },
          { name: "\u200B", value: "\u200B", inline: true },
          {
            name: "🎯 Meta Mensal",
            value: goalProgress,
          },
          {
            name: "📝 Registros",
            value: formatNumber(dashboard?.recordCount ?? 0),
            inline: true,
          },
        ],
        footer: {
          text: `ID: ${target.id}`,
          iconURL: avatarUrl,
        },
        timestamp: true,
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      const fallbackEmbed = createEmbed({
        title: `👤 Perfil de ${displayName}`,
        description:
          "Não foi possível buscar as estatísticas. Conecte-se à API para dados completos.",
        color: EMBED_COLORS.info,
        thumbnail: avatarUrl,
        fields: [
          { name: "💼 Nome", value: displayName, inline: true },
          { name: "🆔 Discord ID", value: `\`${target.id}\``, inline: true },
        ],
        footer: {
          text: `Sistema offline`,
        },
        timestamp: true,
      });
      await interaction.editReply({ embeds: [fallbackEmbed] });
    }
  },
};

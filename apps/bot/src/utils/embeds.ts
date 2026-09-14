import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { config } from "@/config";
import { EMBED_COLORS, createEmbed, formatCurrency, formatNumber } from "@/embeds";

export { EMBED_COLORS, createEmbed, formatCurrency, formatNumber };

export const webDashboardRow = () => {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Abrir Painel Web")
      .setStyle(ButtonStyle.Link)
      .setURL(config.web.url)
      .setEmoji("🌐"),
  );
};

export const openFarmModal = (interactionId: string) => {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Registrar Farm")
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(`open_farm_${interactionId}`),
  );
};

export function createNotificationEmbed(data: {
  title: string;
  description: string;
  user?: {
    name: string;
    avatarUrl?: string;
  };
  color?: keyof typeof EMBED_COLORS;
  fields?: { name: string; value: string; inline?: boolean }[];
}) {
  return createEmbed({
    title: data.title,
    description: data.description,
    color: data.color
      ? EMBED_COLORS[data.color]
      : EMBED_COLORS.info,
    author: data.user
      ? {
          name: data.user.name,
          iconURL: data.user.avatarUrl,
        }
      : undefined,
    fields: data.fields,
    timestamp: true,
  });
}

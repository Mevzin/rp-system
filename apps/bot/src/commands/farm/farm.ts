import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { BotClient } from "@/index";
import type { BotCommand } from "@/types";
import { config } from "@/config";
import { createEmbed, EMBED_COLORS, handlers } from "@/embeds";
import { apiPost } from "@/api/client";

export const farmCommand: BotCommand = {
  data: {
    name: "farm",
    description: "Registrar um novo farm",
    options: [],
    dmPermission: false,
  },
  execute: async (_client: BotClient, interaction) => {
    const modal = new ModalBuilder()
      .setCustomId("farm_modal")
      .setTitle("Registrar Farm");

    const quantityInput = new TextInputBuilder()
      .setCustomId("farm_quantity")
      .setLabel("Quantidade farmada")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: 1500")
      .setRequired(true);

    const withdrawnInput = new TextInputBuilder()
      .setCustomId("farm_withdrawn")
      .setLabel("Valor retirado (R$)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: 50,00")
      .setRequired(true);

    const observationInput = new TextInputBuilder()
      .setCustomId("farm_observation")
      .setLabel("Observação (opcional)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Alguma informação adicional?")
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(quantityInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(withdrawnInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(observationInput),
    );

    await interaction.showModal(modal);
  },
};

handlers.modals.set("farm_modal", {
  customId: "farm_modal",
  execute: async (_client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const quantityStr =
      interaction.fields.getTextInputValue("farm_quantity");
    const withdrawnStr =
      interaction.fields.getTextInputValue("farm_withdrawn");
    const observation =
      interaction.fields.getTextInputValue("farm_observation") || null;

    const quantity = parseInt(quantityStr.replace(/\D/g, ""), 10);
    const withdrawnReais = parseFloat(
      withdrawnStr.replace(/\./g, "").replace(",", "."),
    );
    const withdrawnCents = Math.round(withdrawnReais * 100);

    if (isNaN(quantity) || quantity <= 0) {
      await interaction.editReply({
        content: "❌ Quantidade inválida. Digite apenas números.",
      });
      return;
    }

    if (isNaN(withdrawnCents) || withdrawnCents < 0) {
      await interaction.editReply({
        content: "❌ Valor retirado inválido.",
      });
      return;
    }

    const dashboardUrl = `${config.web.url}/farm`;

    const embed = createEmbed({
      title: "Farm registrado parcialmente",
      description:
        "Para concluir o registro, utilize o painel web para enviar as comprovações de inventário e banco.",
      color: EMBED_COLORS.farm,
      fields: [
        { name: "Quantidade", value: `\`${quantity.toLocaleString("pt-BR")}\``, inline: true },
        {
          name: "Valor Retirado",
          value: `\`R$ ${withdrawnReais.toFixed(2).replace(".", ",")}\``,
          inline: true,
        },
        ...(observation
          ? [{ name: "Observação", value: observation }]
          : []),
      ],
      footer: {
        text: `Solicitado por ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      },
      timestamp: true,
    });

    const button = new ButtonBuilder()
      .setLabel("Abrir Painel")
      .setStyle(ButtonStyle.Link)
      .setURL(dashboardUrl)
      .setEmoji("🌐");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  },
});

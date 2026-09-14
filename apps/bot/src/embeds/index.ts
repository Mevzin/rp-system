import { Collection, ColorResolvable, EmbedBuilder } from "discord.js";

export const EMBED_COLORS: Record<string, ColorResolvable> = {
  primary: 0x3b82f6,
  success: 0x10b981,
  warning: 0xf59e0b,
  error: 0xef4444,
  info: 0x6366f1,
  farm: 0x8b5cf6,
  ranking: 0xfbbf24,
  goals: 0x14b8a6,
};

export function createEmbed(options?: {
  title?: string;
  description?: string;
  color?: ColorResolvable;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; iconURL?: string };
  author?: { name: string; iconURL?: string };
  timestamp?: boolean;
  thumbnail?: string;
  image?: string;
  url?: string;
}) {
  const embed = new EmbedBuilder()
    .setColor(options?.color ?? EMBED_COLORS.primary)
    .setTitle(options?.title ?? null)
    .setDescription(options?.description ?? null)
    .setFooter(options?.footer ?? null)
    .setAuthor(options?.author ?? null)
    .setThumbnail(options?.thumbnail ?? null)
    .setImage(options?.image ?? null)
    .setURL(options?.url ?? null);

  if (options?.fields) {
    embed.addFields(
      options.fields.map((f) => ({
        name: f.name,
        value: f.value,
        inline: f.inline ?? false,
      })),
    );
  }

  if (options?.timestamp) {
    embed.setTimestamp();
  }

  return embed;
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function createProgressBar(
  current: number,
  total: number,
  length = 20,
): string {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;

  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percentage.toFixed(1)}%`;
}

export function getAvatarUrl(
  userId: string,
  avatar: string | null | undefined,
): string {
  if (!avatar) {
    return `https://cdn.discordapp.com/embed/avatars/${
      Number(userId) % 5
    }.png`;
  }
  const ext = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}`;
}

export const handlers = {
  buttons: new Collection<string, import("@/types").ButtonHandler>(),
  modals: new Collection<string, import("@/types").ModalHandler>(),
  selects: new Collection<string, import("@/types").SelectMenuHandler>(),
};

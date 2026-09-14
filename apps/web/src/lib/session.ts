import type { UserData, DiscordRoleTier } from "@criminals/shared";

export const TIER_LABELS: Record<DiscordRoleTier, string> = {
  OWNER: "Dono",
  MANAGER: "Gerente",
  SUPERVISOR: "Supervisor",
  MEMBER: "Membro",
} as Record<DiscordRoleTier, string>;

export const TIER_BADGE_VARIANT: Record<
  DiscordRoleTier,
  "default" | "secondary" | "outline" | "destructive"
> = {
  OWNER: "default",
  MANAGER: "secondary",
  SUPERVISOR: "outline",
  MEMBER: "outline",
} as Record<DiscordRoleTier, any>;

export function getTierColorClass(tier?: DiscordRoleTier): string {
  switch (tier) {
    case "OWNER":
      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    case "MANAGER":
      return "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30";
    case "SUPERVISOR":
      return "text-sky-400 bg-sky-500/10 border-sky-500/30";
    case "MEMBER":
    default:
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  }
}

export function getTierLabel(tier?: DiscordRoleTier): string {
  if (!tier) return "Membro";
  return TIER_LABELS[tier] ?? "Membro";
}

export function getDiscordAvatarUrl(
  discordId?: string,
  avatarHash?: string | null,
  discriminator?: string | null,
  size = 128,
): string {
  if (discordId && avatarHash) {
    const ext = avatarHash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}?size=${size}`;
  }
  const d = (() => {
    if (discriminator && discriminator !== "0") {
      return parseInt(discriminator, 10) % 5;
    }
    if (!discordId) return 0;
    try {
      const tail = discordId.slice(-Math.min(discordId.length, 10));
      const num = parseInt(tail, 10);
      if (!Number.isFinite(num)) return 0;
      return num % 5;
    } catch {
      return 0;
    }
  })();
  return `https://cdn.discordapp.com/embed/avatars/${Math.max(0, Math.min(4, isNaN(d) ? 0 : d))}.png`;
}

export function getDisplayName(user: UserData | null | undefined): string {
  if (!user) return "Convidado";
  return user.globalName?.trim() || user.username || `ID ${user.discordId}`;
}

export function getUserInitials(user: UserData | null | undefined): string {
  const name = getDisplayName(user).trim();
  if (!name) return "??";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  return (
    (parts[0]?.[0] ?? "") +
    (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")
  ).toUpperCase();
}

export function getUserAvatarUrl(
  user: UserData | null | undefined,
  size = 128,
): string {
  return getDiscordAvatarUrl(user?.discordId, user?.avatar, null, size);
}

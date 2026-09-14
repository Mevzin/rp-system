import { DiscordRoleTier, Permission } from "../enums";

const ROLE_PERMISSIONS: Record<DiscordRoleTier, Permission[]> = {
  [DiscordRoleTier.MEMBER]: [
    Permission.VIEW_DASHBOARD,
    Permission.CREATE_FARM,
    Permission.VIEW_OWN_FARMS,
    Permission.VIEW_RANKING,
    Permission.VIEW_GOAL,
    Permission.VIEW_GOALS,
    Permission.VIEW_MEMBERS,
    Permission.VIEW_GARAGE,
    Permission.TAKE_VEHICLE,
    Permission.STORE_VEHICLE,
    Permission.VIEW_VEHICLE_HISTORY,
    Permission.MANAGE_GARAGE,
  ],
  [DiscordRoleTier.SUPERVISOR]: [
    Permission.VIEW_DASHBOARD,
    Permission.CREATE_FARM,
    Permission.VIEW_OWN_FARMS,
    Permission.VIEW_ALL_FARMS,
    Permission.REVIEW_FARM,
    Permission.VIEW_RANKING,
    Permission.VIEW_GOAL,
    Permission.VIEW_GOALS,
    Permission.VIEW_MEMBERS,
    Permission.VIEW_INVENTORY,
    Permission.VIEW_GARAGE,
    Permission.MANAGE_GARAGE,
    Permission.TAKE_VEHICLE,
    Permission.STORE_VEHICLE,
    Permission.VIEW_VEHICLE_HISTORY,
    Permission.VIEW_LOGS,
    Permission.SYNC_DISCORD_MEMBERS,
  ],
  [DiscordRoleTier.MANAGER]: [
    Permission.VIEW_DASHBOARD,
    Permission.CREATE_FARM,
    Permission.VIEW_OWN_FARMS,
    Permission.VIEW_ALL_FARMS,
    Permission.REVIEW_FARM,
    Permission.VIEW_RANKING,
    Permission.VIEW_GOAL,
    Permission.VIEW_GOALS,
    Permission.MANAGE_GOAL,
    Permission.MANAGE_GOALS,
    Permission.VIEW_MEMBERS,
    Permission.MANAGE_MEMBERS,
    Permission.MANAGE_ROLES,
    Permission.VIEW_INVENTORY,
    Permission.MANAGE_INVENTORY,
    Permission.VIEW_GARAGE,
    Permission.MANAGE_GARAGE,
    Permission.TAKE_VEHICLE,
    Permission.STORE_VEHICLE,
    Permission.VIEW_VEHICLE_HISTORY,
    Permission.VIEW_LOGS,
    Permission.VIEW_DISCORD,
    Permission.MANAGE_MEMBER_ACCESS,
    Permission.MANAGE_MEMBER_ROLE,
    Permission.MANAGE_DISCORD_ROLE_CONFIG,
    Permission.SYNC_DISCORD_MEMBERS,
  ],
  [DiscordRoleTier.OWNER]: Object.values(Permission),
};

export function getPermissionsForTier(tier: DiscordRoleTier): Permission[] {
  return ROLE_PERMISSIONS[tier] ?? ROLE_PERMISSIONS[DiscordRoleTier.MEMBER];
}

export function hasPermission(
  userTier: DiscordRoleTier,
  requiredPermission: Permission,
): boolean {
  const permissions = getPermissionsForTier(userTier);
  return permissions.includes(requiredPermission);
}

export function centsToReais(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("pt-BR").format(num);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getAvatarUrl(discordId: string, avatar: string | null): string {
  if (!avatar) {
    return `https://cdn.discordapp.com/embed/avatars/${Number(discordId) % 5}.png`;
  }
  const extension = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${extension}`;
}

export function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

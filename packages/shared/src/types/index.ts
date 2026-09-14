import { Permission, DiscordRoleTier, VehicleStatus, VehicleHistoryAction, SiteAccessStatus, OrganizationRank } from "../enums";

export interface UserData {
  id: string;
  discordId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  organizationId: string;
  roles: string[];
  tier: DiscordRoleTier;
  permissions: Permission[];
  rpId?: string | null;
  alias?: string | null;
  phone?: string | null;
  siteAccess?: SiteAccessStatus;
  displayName?: string | null;
  profileCompleted?: boolean;
  rank?: OrganizationRank | null;
}

export interface DashboardStats {
  totalFarm: number;
  monthlyFarm: number;
  weeklyFarm: number;
  dailyAverage: number;
  weeklyAverage: number;
  totalWithdrawn: number;
  recordCount: number;
  pendingFarms: number;
}

export interface RankingEntry {
  position: number;
  userId: string;
  discordId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  quantity: number;
  goalProgress: number | null;
}

export interface GoalProgress {
  id: string;
  type: string;
  title?: string | null;
  description?: string | null;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  remainingAmount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export interface VehicleSummary {
  total: number;
  stored: number;
  out: number;
}

export interface VehicleData {
  id: string;
  organizationId: string;
  model: string;
  plate: string;
  ownerName: string | null;
  ownerUserId: string | null;
  imageUrl: string | null;
  status: VehicleStatus;
  lastActionAt: Date | null;
  lastActionBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleHistoryEntry {
  id: string;
  vehicleId: string;
  userId: string | null;
  username?: string | null;
  action: VehicleHistoryAction;
  createdAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  tier?: DiscordRoleTier;
}

export interface DiscordMember {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  roles: string[];
  joinedAt: Date;
}

export interface MemberData extends UserData {
  rpId: string | null;
  alias: string | null;
  phone: string | null;
  siteAccess: SiteAccessStatus;
  displayName: string | null;
  profileCompleted: boolean;
  rank: OrganizationRank | null;
  joinedAt: Date | string | null;
  lastLoginAt: Date | string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface OrganizationRoleConfig {
  ownerRoleId: string | null;
  managerRoleId: string | null;
  supervisorRoleId: string | null;
  memberRoleId: string | null;
  leaderRoleId: string | null;
  subLeaderRoleId: string | null;
  level1RoleId: string | null;
  level2RoleId: string | null;
  level3RoleId: string | null;
  afkRoleId: string | null;
}




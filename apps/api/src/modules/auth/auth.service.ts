import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import {
  UserModel,
  OrganizationModel,
  AuditLogModel,
  mongoose,
} from "@criminals/database";
import { DiscordRoleTier, AuditAction, getPermissionsForTier, OrganizationRank, SiteAccessStatus } from "@criminals/shared";
import type { UserData } from "@criminals/shared";

export interface DiscordProfile {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  guild?: {
    id: string;
    roles: string[];
  } | null;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  private determineRankFromRoles(
    roleIds: {
      leaderRoleId?: string | null;
      subLeaderRoleId?: string | null;
      level1RoleId?: string | null;
      level2RoleId?: string | null;
      level3RoleId?: string | null;
      afkRoleId?: string | null;
    },
    userRoles: string[],
  ): OrganizationRank | null {
    if (roleIds.leaderRoleId && userRoles.includes(roleIds.leaderRoleId)) {
      return OrganizationRank.LEADER;
    }
    if (roleIds.subLeaderRoleId && userRoles.includes(roleIds.subLeaderRoleId)) {
      return OrganizationRank.SUB_LEADER;
    }
    if (roleIds.level3RoleId && userRoles.includes(roleIds.level3RoleId)) {
      return OrganizationRank.LEVEL_3;
    }
    if (roleIds.level2RoleId && userRoles.includes(roleIds.level2RoleId)) {
      return OrganizationRank.LEVEL_2;
    }
    if (roleIds.level1RoleId && userRoles.includes(roleIds.level1RoleId)) {
      return OrganizationRank.LEVEL_1;
    }
    if (roleIds.afkRoleId && userRoles.includes(roleIds.afkRoleId)) {
      return OrganizationRank.AFK;
    }
    return null;
  }

  async validateDiscordUser(
    profile: DiscordProfile,
  ): Promise<{ user: UserData; token: string }> {
    const guildId = this.configService.getOrThrow("DISCORD_GUILD_ID");
    const envOwner = this.configService.get("DISCORD_ROLE_OWNER_ID") ?? null;
    const envManager = this.configService.get("DISCORD_ROLE_MANAGER_ID") ?? null;
    const envSupervisor =
      this.configService.get("DISCORD_ROLE_SUPERVISOR_ID") ?? null;
    const envMember = this.configService.get("DISCORD_ROLE_MEMBER_ID") ?? null;

    const orgObjectId = new mongoose.Types.ObjectId(
      (
        await OrganizationModel.findOne({
          discordGuildId: guildId,
        }).select("_id").lean()
      )?._id as any,
    );
    if (!orgObjectId) {
      throw new UnauthorizedException("Organização não configurada");
    }

    const syncSet: Record<string, any> = {};
    const existingRoleIds =
      (await OrganizationModel.findById(orgObjectId).select("settings.roleIds").lean())
        ?.settings?.roleIds ?? {};

    if (envOwner && !existingRoleIds.ownerRoleId && !existingRoleIds.owner) {
      syncSet["settings.roleIds.ownerRoleId"] = envOwner;
    }
    if (
      envManager &&
      !existingRoleIds.managerRoleId &&
      !existingRoleIds.manager
    ) {
      syncSet["settings.roleIds.managerRoleId"] = envManager;
    }
    if (
      envSupervisor &&
      !existingRoleIds.supervisorRoleId &&
      !existingRoleIds.supervisor
    ) {
      syncSet["settings.roleIds.supervisorRoleId"] = envSupervisor;
    }
    if (envMember && !existingRoleIds.memberRoleId && !existingRoleIds.member) {
      syncSet["settings.roleIds.memberRoleId"] = envMember;
    }

    let organization = await OrganizationModel.findById(orgObjectId).lean();
    if (Object.keys(syncSet).length > 0 && organization) {
      await OrganizationModel.findByIdAndUpdate(orgObjectId, {
        $set: syncSet,
      });
      organization =
        (await OrganizationModel.findById(orgObjectId).lean()) ?? organization;
    }

    if (!organization) {
      throw new UnauthorizedException("Organização não configurada");
    }

    const memberRoleId =
      organization.settings?.roleIds?.memberRoleId ??
      organization.settings?.roleIds?.member ??
      envMember;

    const roleIdsConfig = {
      ownerRoleId:
        organization.settings?.roleIds?.ownerRoleId ??
        organization.settings?.roleIds?.owner ??
        envOwner,
      managerRoleId:
        organization.settings?.roleIds?.managerRoleId ??
        organization.settings?.roleIds?.manager ??
        envManager,
      supervisorRoleId:
        organization.settings?.roleIds?.supervisorRoleId ??
        organization.settings?.roleIds?.supervisor ??
        envSupervisor,
      memberRoleId,
      leaderRoleId: organization.settings?.roleIds?.leaderRoleId ?? null,
      subLeaderRoleId:
        organization.settings?.roleIds?.subLeaderRoleId ?? null,
      level1RoleId: organization.settings?.roleIds?.level1RoleId ?? null,
      level2RoleId: organization.settings?.roleIds?.level2RoleId ?? null,
      level3RoleId: organization.settings?.roleIds?.level3RoleId ?? null,
      afkRoleId: organization.settings?.roleIds?.afkRoleId ?? null,
    };

    const userRoles = profile.guild?.roles ?? [];

    if (memberRoleId && !userRoles.includes(memberRoleId)) {
      const existingCheck = await UserModel.findOne({
        discordId: profile.id,
        organizationId: organization._id,
      }).lean();
      if (!existingCheck) {
        throw new UnauthorizedException(
          "Você não possui o cargo de membro exigido.",
        );
      }
    }

    const tier = this.resolveTier(userRoles, roleIdsConfig, {
      envOwner,
      envManager,
      envSupervisor,
    });
    const rank = this.determineRankFromRoles(roleIdsConfig, userRoles);

    const now = new Date();
    const existing = await UserModel.findOne({
      discordId: profile.id,
      organizationId: organization._id,
    }).lean();

    let user: any;
    if (existing) {
      if (existing.siteAccess === SiteAccessStatus.BLOCKED) {
        throw new UnauthorizedException("Seu acesso ao site foi bloqueado.");
      }

      user = await UserModel.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            username: profile.username,
            globalName: profile.global_name ?? null,
            avatar: profile.avatar ?? null,
            tier,
            roles: userRoles,
            rank,
            lastLoginAt: now,
          },
        },
        { new: true, runValidators: true },
      ).lean();
    } else {
      const displayName = profile.global_name ?? null;
      const doc = new UserModel({
        discordId: profile.id,
        username: profile.username,
        globalName: profile.global_name ?? null,
        avatar: profile.avatar ?? null,
        organizationId: organization._id,
        tier,
        roles: userRoles,
        lastLoginAt: now,
        siteAccess: SiteAccessStatus.ACTIVE,
        displayName,
        profileCompleted: false,
        rank,
      });
      user = await doc.save();
    }

    const userIdStr = String(user._id);
    const permissions = getPermissionsForTier(tier ?? DiscordRoleTier.MEMBER);
    const userData: UserData = {
      id: userIdStr,
      discordId: user.discordId,
      username: user.username,
      globalName: user.globalName,
      avatar: user.avatar,
      organizationId: String(user.organizationId),
      roles: userRoles,
      tier,
      permissions,
      rpId: user.rpId ?? null,
      alias: user.alias ?? null,
      phone: user.phone ?? null,
      siteAccess: (user.siteAccess as SiteAccessStatus) ?? SiteAccessStatus.ACTIVE,
      displayName: user.displayName ?? null,
      profileCompleted: user.profileCompleted ?? false,
      rank: (user.rank as OrganizationRank) ?? null,
    };

    const token = this.jwtService.sign({
      sub: userIdStr,
      discordId: user.discordId,
      organizationId: String(user.organizationId),
      tier,
    });

    await AuditLogModel.create({
      organizationId: new mongoose.Types.ObjectId(user.organizationId),
      userId: new mongoose.Types.ObjectId(userIdStr),
      action: AuditAction.USER_LOGIN,
      entity: "User",
      entityId: userIdStr,
      metadata: {
        discordId: user.discordId,
        tier,
      },
    });

    this.logger.log(
      `Usuário autenticado: ${user.username} (${user.discordId})`,
    );

    return { user: userData, token };
  }

  private resolveTier(
    roles: string[],
    roleIdsConfig: {
      ownerRoleId?: string | null;
      managerRoleId?: string | null;
      supervisorRoleId?: string | null;
      memberRoleId?: string | null;
      owner?: string | null;
      manager?: string | null;
      supervisor?: string | null;
      member?: string | null;
    } = {},
    envFallback: {
      envOwner: string | null;
      envManager: string | null;
      envSupervisor: string | null;
    } = { envOwner: null, envManager: null, envSupervisor: null },
  ): DiscordRoleTier {
    const { envOwner, envManager, envSupervisor } = envFallback;

    const ownerId =
      envOwner ??
      roleIdsConfig.ownerRoleId ??
      roleIdsConfig.owner ??
      null;
    const managerId =
      envManager ??
      roleIdsConfig.managerRoleId ??
      roleIdsConfig.manager ??
      null;
    const supervisorId =
      envSupervisor ??
      roleIdsConfig.supervisorRoleId ??
      roleIdsConfig.supervisor ??
      null;

    if (ownerId && roles.includes(String(ownerId))) {
      return DiscordRoleTier.OWNER;
    }
    if (managerId && roles.includes(String(managerId))) {
      return DiscordRoleTier.MANAGER;
    }
    if (supervisorId && roles.includes(String(supervisorId))) {
      return DiscordRoleTier.SUPERVISOR;
    }
    return DiscordRoleTier.MEMBER;
  }

  async getUserFromToken(token: string): Promise<UserData | null> {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        discordId: string;
        organizationId: string;
        tier: DiscordRoleTier;
      }>(token);
      return this.getUserById(payload.sub);
    } catch {
      return null;
    }
  }

  async getUserById(userId: string): Promise<UserData> {
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      throw new UnauthorizedException("Usuário não encontrado");
    }
    if (user.siteAccess === SiteAccessStatus.BLOCKED) {
      throw new UnauthorizedException("Seu acesso ao site foi bloqueado.");
    }
    const permissions = getPermissionsForTier(
      (user.tier as DiscordRoleTier) ?? DiscordRoleTier.MEMBER,
    );
    return {
      id: String(user._id),
      discordId: user.discordId,
      username: user.username,
      globalName: user.globalName ?? null,
      avatar: user.avatar ?? null,
      organizationId: String(user.organizationId),
      roles: Array.isArray(user.roles) ? (user.roles as string[]) : [],
      tier: (user.tier as DiscordRoleTier) ?? DiscordRoleTier.MEMBER,
      permissions,
      rpId: user.rpId ?? null,
      alias: user.alias ?? null,
      phone: user.phone ?? null,
      siteAccess: (user.siteAccess as SiteAccessStatus) ?? SiteAccessStatus.ACTIVE,
      displayName: user.displayName ?? null,
      profileCompleted: user.profileCompleted ?? false,
      rank: (user.rank as OrganizationRank) ?? null,
    };
  }
}

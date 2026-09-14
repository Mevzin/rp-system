import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import { UserModel, OrganizationModel, mongoose } from "@criminals/database";
import {
  SiteAccessStatus,
  DiscordRoleTier,
  OrganizationRank,
} from "@criminals/shared";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.["access_token"] ?? null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow("JWT_SECRET"),
    });
  }

  private resolveTierFromRoles(
    roles: string[],
    roleIdsConfig: Record<string, any>,
  ): DiscordRoleTier {
    const envOwner = this.configService.get("DISCORD_ROLE_OWNER_ID") ?? null;
    const envManager =
      this.configService.get("DISCORD_ROLE_MANAGER_ID") ?? null;
    const envSupervisor =
      this.configService.get("DISCORD_ROLE_SUPERVISOR_ID") ?? null;

    const ownerId =
      envOwner ??
      roleIdsConfig?.ownerRoleId ??
      roleIdsConfig?.owner ??
      null;
    const managerId =
      envManager ??
      roleIdsConfig?.managerRoleId ??
      roleIdsConfig?.manager ??
      null;
    const supervisorId =
      envSupervisor ??
      roleIdsConfig?.supervisorRoleId ??
      roleIdsConfig?.supervisor ??
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

  private determineRankFromRoles(
    roleIdsConfig: Record<string, any>,
    roles: string[],
  ): OrganizationRank | null {
    if (!Array.isArray(roles) || roles.length === 0) return null;
    const priority: Array<[OrganizationRank, string | null]> = [
      [OrganizationRank.LEADER, roleIdsConfig?.leaderRoleId ?? null],
      [
        OrganizationRank.SUB_LEADER,
        roleIdsConfig?.subLeaderRoleId ?? null,
      ],
      [OrganizationRank.LEVEL_1, roleIdsConfig?.level1RoleId ?? null],
      [OrganizationRank.LEVEL_2, roleIdsConfig?.level2RoleId ?? null],
      [OrganizationRank.LEVEL_3, roleIdsConfig?.level3RoleId ?? null],
      [OrganizationRank.AFK, roleIdsConfig?.afkRoleId ?? null],
    ];
    for (const [rank, roleId] of priority) {
      if (roleId && roles.includes(String(roleId))) {
        return rank;
      }
    }
    return null;
  }

  async validate(payload: any) {
    const userId = payload.sub;
    if (!userId) {
      return null;
    }

    try {
      const user = await UserModel.findById(
        new mongoose.Types.ObjectId(userId),
      ).lean();
      if (!user) {
        return null;
      }
      if (user.siteAccess === SiteAccessStatus.BLOCKED) {
        return null;
      }

      let roleIdsConfig: Record<string, any> = {};
      try {
        const org = await OrganizationModel.findById(
          new mongoose.Types.ObjectId(user.organizationId as any),
        )
          .select("settings.roleIds")
          .lean();
        roleIdsConfig = org?.settings?.roleIds ?? {};
      } catch {
        roleIdsConfig = {};
      }

      const userRoles = Array.isArray(user.roles)
        ? (user.roles as string[])
        : [];
      const tier = this.resolveTierFromRoles(userRoles, roleIdsConfig);
      const rank = this.determineRankFromRoles(roleIdsConfig, userRoles);

      return {
        id: String(user._id),
        discordId: user.discordId,
        organizationId: String(user.organizationId),
        tier,
        rank,
      };
    } catch (e) {
      return null;
    }
  }
}

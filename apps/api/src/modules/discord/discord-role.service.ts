import { Injectable, BadRequestException } from "@nestjs/common";
import { DiscordMemberService } from "./discord-member.service";
import { OrganizationModel, AuditLogModel, mongoose } from "@criminals/database";
import { AuditAction, OrganizationRank, DiscordRoleTier } from "@criminals/shared";
import type { OrganizationRoleConfig } from "@criminals/shared";

@Injectable()
export class DiscordRoleService {
  constructor(
    private readonly discordMemberService: DiscordMemberService,
  ) { }

  async getRoleConfig(organizationId: string): Promise<OrganizationRoleConfig> {
    const org = await OrganizationModel.findById(
      new mongoose.Types.ObjectId(organizationId),
    ).lean();

    if (!org) {
      throw new BadRequestException("Organização não encontrada");
    }

    const roleIds = org.settings?.roleIds ?? {};
    return {
      ownerRoleId: roleIds.ownerRoleId ?? roleIds.owner ?? null,
      managerRoleId: roleIds.managerRoleId ?? roleIds.manager ?? null,
      supervisorRoleId: roleIds.supervisorRoleId ?? roleIds.supervisor ?? null,
      memberRoleId: roleIds.memberRoleId ?? roleIds.member ?? null,
      leaderRoleId: roleIds.leaderRoleId ?? null,
      subLeaderRoleId: roleIds.subLeaderRoleId ?? null,
      level1RoleId: roleIds.level1RoleId ?? null,
      level2RoleId: roleIds.level2RoleId ?? null,
      level3RoleId: roleIds.level3RoleId ?? null,
      afkRoleId: roleIds.afkRoleId ?? null,
    };
  }

  async saveRoleConfig(
    organizationId: string,
    roleConfig: OrganizationRoleConfig,
    actorUserId: string,
    actorTier: DiscordRoleTier,
  ): Promise<OrganizationRoleConfig> {
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const org = await OrganizationModel.findById(orgObjectId).lean();

    if (!org) {
      throw new BadRequestException("Organização não encontrada");
    }

    const updated = await OrganizationModel.findByIdAndUpdate(
      orgObjectId,
      {
        $set: {
          "settings.roleIds.ownerRoleId": roleConfig.ownerRoleId,
          "settings.roleIds.managerRoleId": roleConfig.managerRoleId,
          "settings.roleIds.supervisorRoleId": roleConfig.supervisorRoleId,
          "settings.roleIds.memberRoleId": roleConfig.memberRoleId,
          "settings.roleIds.leaderRoleId": roleConfig.leaderRoleId,
          "settings.roleIds.subLeaderRoleId": roleConfig.subLeaderRoleId,
          "settings.roleIds.level1RoleId": roleConfig.level1RoleId,
          "settings.roleIds.level2RoleId": roleConfig.level2RoleId,
          "settings.roleIds.level3RoleId": roleConfig.level3RoleId,
          "settings.roleIds.afkRoleId": roleConfig.afkRoleId,
        },
      },
      { new: true, runValidators: true },
    ).lean();

    await AuditLogModel.create({
      organizationId: orgObjectId,
      userId: new mongoose.Types.ObjectId(actorUserId),
      action: AuditAction.DISCORD_ROLE_CONFIG_UPDATED,
      entity: "Organization",
      entityId: organizationId,
      metadata: {
        before: org.settings?.roleIds ?? {},
        after: roleConfig,
      },
    });

    return this.getRoleConfig(organizationId);
  }

  async getManagedRoleIds(organizationId: string): Promise<string[]> {
    const config = await this.getRoleConfig(organizationId);
    const ids: string[] = [];
    if (config.memberRoleId) ids.push(config.memberRoleId);
    if (config.leaderRoleId) ids.push(config.leaderRoleId);
    if (config.subLeaderRoleId) ids.push(config.subLeaderRoleId);
    if (config.level1RoleId) ids.push(config.level1RoleId);
    if (config.level2RoleId) ids.push(config.level2RoleId);
    if (config.level3RoleId) ids.push(config.level3RoleId);
    if (config.afkRoleId) ids.push(config.afkRoleId);
    return ids;
  }

  getRankRoleId(config: OrganizationRoleConfig, rank: OrganizationRank): string | null {
    switch (rank) {
      case OrganizationRank.LEADER:
        return config.leaderRoleId;
      case OrganizationRank.SUB_LEADER:
        return config.subLeaderRoleId;
      case OrganizationRank.LEVEL_1:
        return config.level1RoleId;
      case OrganizationRank.LEVEL_2:
        return config.level2RoleId;
      case OrganizationRank.LEVEL_3:
        return config.level3RoleId;
      case OrganizationRank.AFK:
        return config.afkRoleId;
      default:
        return null;
    }
  }

  determineRankFromRoles(
    config: OrganizationRoleConfig,
    userRoles: string[],
  ): OrganizationRank | null {
    if (config.leaderRoleId && userRoles.includes(config.leaderRoleId)) {
      return OrganizationRank.LEADER;
    }
    if (config.subLeaderRoleId && userRoles.includes(config.subLeaderRoleId)) {
      return OrganizationRank.SUB_LEADER;
    }
    if (config.level3RoleId && userRoles.includes(config.level3RoleId)) {
      return OrganizationRank.LEVEL_3;
    }
    if (config.level2RoleId && userRoles.includes(config.level2RoleId)) {
      return OrganizationRank.LEVEL_2;
    }
    if (config.level1RoleId && userRoles.includes(config.level1RoleId)) {
      return OrganizationRank.LEVEL_1;
    }
    if (config.afkRoleId && userRoles.includes(config.afkRoleId)) {
      return OrganizationRank.AFK;
    }
    return null;
  }

  async applyRankToMember(
    organizationId: string,
    actorUserId: string,
    actorTier: DiscordRoleTier,
    userDiscordId: string,
    newRank: OrganizationRank,
  ): Promise<{ success: true }> {
    const org = await OrganizationModel.findById(
      new mongoose.Types.ObjectId(organizationId),
    ).lean();

    if (!org) {
      throw new BadRequestException("Organização não encontrada");
    }

    const guildId = org.discordGuildId;
    const config = await this.getRoleConfig(organizationId);
    const managedRoleIds = await this.getManagedRoleIds(organizationId);
    const newRoleId = this.getRankRoleId(config, newRank);

    const memberRoleId = config.memberRoleId;

    for (const roleId of managedRoleIds) {
      if (memberRoleId && roleId === memberRoleId) {
        continue;
      }
      if (newRoleId && roleId === newRoleId) {
        continue;
      }
      try {
        await this.discordMemberService.removeRole(guildId, userDiscordId, roleId);
      } catch (e) {
      }
    }

    if (newRoleId) {
      await this.discordMemberService.addRole(guildId, userDiscordId, newRoleId);
    }

    await AuditLogModel.create({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      userId: new mongoose.Types.ObjectId(actorUserId),
      action: AuditAction.MEMBER_ROLE_CHANGED,
      entity: "User",
      entityId: userDiscordId,
      metadata: {
        userDiscordId,
        newRank,
        newRoleId,
      },
    });

    return { success: true };
  }
}

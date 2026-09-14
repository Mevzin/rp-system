import { Injectable, BadRequestException } from "@nestjs/common";
import { DiscordService } from "./discord.service";
import { DiscordRoleService } from "./discord-role.service";
import { UserModel, OrganizationModel, AuditLogModel, mongoose } from "@criminals/database";
import { AuditAction, DiscordRoleTier, OrganizationRank, SiteAccessStatus } from "@criminals/shared";
import type { DiscordMember } from "@criminals/shared";

@Injectable()
export class MemberSyncService {
  constructor(
    private readonly discordService: DiscordService,
    private readonly discordRoleService: DiscordRoleService,
  ) {}

  async syncMembersFromDiscord(
    organizationId: string,
    actorUserId: string,
    actorTier: DiscordRoleTier,
  ): Promise<{ synced: number; created: number; updated: number }> {
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const org = await OrganizationModel.findById(orgObjectId).lean();

    if (!org) {
      throw new BadRequestException("Organização não encontrada");
    }

    const guildId = org.discordGuildId;
    const memberRoleId = org.settings?.roleIds?.memberRoleId;
    const roleConfig = await this.discordRoleService.getRoleConfig(organizationId);

    const allMembers = await this.discordService.getMembers();
    const filteredMembers = memberRoleId
      ? allMembers.filter((m) => m.roles.includes(memberRoleId))
      : allMembers;

    let createdCount = 0;
    let updatedCount = 0;

    for (const member of filteredMembers) {
      const existing = await UserModel.findOne({
        discordId: member.id,
        organizationId: orgObjectId,
      }).lean();

      const displayName = member.globalName ?? null;
      const rank = this.discordRoleService.determineRankFromRoles(
        roleConfig,
        member.roles,
      );

      if (existing) {
        await UserModel.findByIdAndUpdate(
          existing._id,
          {
            $set: {
              username: member.username,
              globalName: member.globalName,
              avatar: member.avatar,
              roles: member.roles,
              displayName,
              rank,
            },
          },
          { runValidators: true },
        );
        updatedCount++;
      } else {
        await UserModel.create({
          discordId: member.id,
          username: member.username,
          globalName: member.globalName,
          avatar: member.avatar,
          organizationId: orgObjectId,
          tier: DiscordRoleTier.MEMBER,
          roles: member.roles,
          joinedAt: member.joinedAt,
          siteAccess: SiteAccessStatus.ACTIVE,
          displayName,
          profileCompleted: false,
          rank,
        });
        createdCount++;
      }
    }

    await AuditLogModel.create({
      organizationId: orgObjectId,
      userId: new mongoose.Types.ObjectId(actorUserId),
      action: AuditAction.MEMBER_SYNCED,
      entity: "User",
      metadata: {
        totalSynced: filteredMembers.length,
        created: createdCount,
        updated: updatedCount,
      },
    });

    return {
      synced: filteredMembers.length,
      created: createdCount,
      updated: updatedCount,
    };
  }

  async syncOneMemberFromDiscord(
    organizationId: string,
    userDiscordId: string,
  ): Promise<{ user: any; created: boolean } | null> {
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const org = await OrganizationModel.findById(orgObjectId).lean();

    if (!org) {
      throw new BadRequestException("Organização não encontrada");
    }

    const allMembers = await this.discordService.getMembers();
    const member = allMembers.find((m) => m.id === userDiscordId);

    if (!member) {
      return null;
    }

    const roleConfig = await this.discordRoleService.getRoleConfig(organizationId);
    const displayName = member.globalName ?? null;
    const rank = this.discordRoleService.determineRankFromRoles(
      roleConfig,
      member.roles,
    );

    const existing = await UserModel.findOne({
      discordId: member.id,
      organizationId: orgObjectId,
    }).lean();

    if (existing) {
      const updated = await UserModel.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            username: member.username,
            globalName: member.globalName,
            avatar: member.avatar,
            roles: member.roles,
            displayName,
            rank,
          },
        },
        { new: true, runValidators: true },
      ).lean();
      return { user: updated, created: false };
    } else {
      const created = await UserModel.create({
        discordId: member.id,
        username: member.username,
        globalName: member.globalName,
        avatar: member.avatar,
        organizationId: orgObjectId,
        tier: DiscordRoleTier.MEMBER,
        roles: member.roles,
        joinedAt: member.joinedAt,
        siteAccess: SiteAccessStatus.ACTIVE,
        displayName,
        profileCompleted: false,
        rank,
      });
      return { user: created.toObject(), created: true };
    }
  }
}

import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { UserModel, AuditLogModel, OrganizationModel, mongoose } from "@criminals/database";
import { Permission, DiscordRoleTier, AuditAction, OrganizationRank, SiteAccessStatus, getPermissionsForTier } from "@criminals/shared";
import type { UpdateMemberInput, PaginatedResponse, MemberData, PaginationParams } from "@criminals/shared";
import { DiscordMemberService } from "../discord/discord-member.service";
import { DiscordRoleService } from "../discord/discord-role.service";
import { MemberSyncService } from "../discord/member-sync.service";

@Injectable()
export class MembersService {
  constructor(
    private readonly discordMemberService: DiscordMemberService,
    private readonly discordRoleService: DiscordRoleService,
    private readonly memberSyncService: MemberSyncService,
  ) { }

  async findAll(
    orgId: string,
    params?: {
      search?: string;
      rank?: OrganizationRank;
      siteAccess?: SiteAccessStatus;
    } & PaginationParams,
  ): Promise<PaginatedResponse<MemberData>> {
    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 50;
    const skip = (page - 1) * perPage;
    const orgObjectId = new mongoose.Types.ObjectId(orgId);

    const match: any = { organizationId: orgObjectId };

    if (params?.search) {
      const searchRegex = new RegExp(params.search, "i");
      match.$or = [
        { username: searchRegex },
        { globalName: searchRegex },
        { displayName: searchRegex },
        { alias: searchRegex },
        { discordId: params.search },
        { rpId: searchRegex },
      ];
    }

    if (params?.rank) {
      match.rank = params.rank;
    }

    if (params?.siteAccess) {
      match.siteAccess = params.siteAccess;
    }

    const [data, total] = await Promise.all([
      UserModel.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: perPage },
      ]).exec(),
      UserModel.countDocuments(match),
    ]);

    const mapped: MemberData[] = data.map((u: any) => ({
      id: String(u._id),
      discordId: u.discordId,
      username: u.username,
      globalName: u.globalName ?? null,
      avatar: u.avatar ?? null,
      organizationId: String(u.organizationId),
      roles: Array.isArray(u.roles) ? u.roles : [],
      tier: u.tier,
      permissions: getPermissionsForTier(u.tier ?? DiscordRoleTier.MEMBER),
      rpId: u.rpId ?? null,
      alias: u.alias ?? null,
      phone: u.phone ?? null,
      siteAccess: u.siteAccess ?? SiteAccessStatus.ACTIVE,
      displayName: u.displayName ?? null,
      profileCompleted: u.profileCompleted ?? false,
      rank: u.rank ?? null,
      joinedAt: u.joinedAt ?? null,
      lastLoginAt: u.lastLoginAt ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return {
      data: mapped,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findById(orgId: string, id: string): Promise<MemberData | null> {
    const user = await UserModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: new mongoose.Types.ObjectId(orgId),
    }).lean();

    if (!user) return null;

    return {
      id: String(user._id),
      discordId: user.discordId,
      username: user.username,
      globalName: user.globalName ?? null,
      avatar: user.avatar ?? null,
      organizationId: String(user.organizationId),
      roles: Array.isArray(user.roles) ? user.roles : [],
      tier: user.tier as DiscordRoleTier,
      permissions: getPermissionsForTier((user.tier as DiscordRoleTier) ?? DiscordRoleTier.MEMBER),
      rpId: user.rpId ?? null,
      alias: user.alias ?? null,
      phone: user.phone ?? null,
      siteAccess: (user.siteAccess as SiteAccessStatus) ?? SiteAccessStatus.ACTIVE,
      displayName: user.displayName ?? null,
      profileCompleted: user.profileCompleted ?? false,
      rank: (user.rank as OrganizationRank) ?? null,
      joinedAt: user.joinedAt ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };
  }

  async patchMember(
    orgId: string,
    actorUserId: string,
    actorTier: DiscordRoleTier,
    id: string,
    input: UpdateMemberInput,
  ): Promise<MemberData> {
    const permissions = getPermissionsForTier(actorTier);
    const orgObjectId = new mongoose.Types.ObjectId(orgId);
    const userObjectId = new mongoose.Types.ObjectId(id);

    const existing = await UserModel.findOne({
      _id: userObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!existing) {
      throw new BadRequestException("Membro não encontrado");
    }

    const org = await OrganizationModel.findById(orgObjectId).lean();
    if (!org) {
      throw new BadRequestException("Organização não encontrada");
    }

    const guildId = org.discordGuildId;
    const updateData: any = {};
    const before: any = {};
    const after: any = {};

    const finalRpId =
      input.rpId !== undefined ? input.rpId : (existing.rpId ?? "");
    const finalDisplayName =
      input.displayName !== undefined
        ? input.displayName
        : (existing.displayName ?? "");

    const needsNickUpdate =
      (input.displayName !== undefined &&
        input.displayName !== existing.displayName) ||
      (input.rpId !== undefined && input.rpId !== existing.rpId);

    function formatDiscordNick(id: string, name: string): string | null {
      const cleanId = String(id ?? "").trim();
      const cleanName = String(name ?? "").trim();
      if (cleanId && cleanName) return `${cleanId} | ${cleanName}`;
      if (cleanId) return cleanId;
      if (cleanName) return cleanName;
      return null;
    }

    if (needsNickUpdate) {
      if (!permissions.includes(Permission.MANAGE_MEMBERS)) {
        throw new ForbiddenException(
          "Permissões insuficientes para alterar nome/ID",
        );
      }
      const newNick = formatDiscordNick(
        String(finalRpId ?? ""),
        String(finalDisplayName ?? ""),
      );
      try {
        await this.discordMemberService.updateNickname(
          guildId,
          existing.discordId,
          newNick,
        );
      } catch (e: any) {
        throw new BadRequestException(
          `Falha ao atualizar apelido no Discord: ${e?.message ?? "Erro desconhecido"}`,
        );
      }
      before.displayName = existing.displayName;
      before.rpId = existing.rpId;
      after.displayName = finalDisplayName;
      after.rpId = finalRpId;
      if (input.displayName !== undefined) {
        updateData.displayName = input.displayName;
      }
      if (input.rpId !== undefined) {
        updateData.rpId = input.rpId;
      }
    }

    if (
      input.alias !== undefined &&
      input.alias !== existing.alias
    ) {
      if (!permissions.includes(Permission.MANAGE_MEMBERS)) {
        throw new ForbiddenException(
          "Permissões insuficientes para alterar alias",
        );
      }
      before.alias = existing.alias;
      after.alias = input.alias;
      updateData.alias = input.alias;
    }

    if (input.phone !== undefined && input.phone !== existing.phone) {
      if (!permissions.includes(Permission.MANAGE_MEMBERS)) {
        throw new ForbiddenException(
          "Permissões insuficientes para alterar phone",
        );
      }
      before.phone = existing.phone;
      after.phone = input.phone;
      updateData.phone = input.phone;
    }

    if (input.rank !== undefined && input.rank !== existing.rank) {
      await this.patchRole(orgId, actorUserId, actorTier, id, input.rank);
      before.rank = existing.rank;
      after.rank = input.rank;
    }

    if (Object.keys(updateData).length > 0) {
      await UserModel.findByIdAndUpdate(
        userObjectId,
        { $set: updateData },
        { runValidators: true },
      );
    }

    if (Object.keys(before).length > 0) {
      await AuditLogModel.create({
        organizationId: orgObjectId,
        userId: new mongoose.Types.ObjectId(actorUserId),
        action: AuditAction.USER_UPDATED,
        entity: "User",
        entityId: id,
        metadata: { before, after },
      });
    }

    const result = await this.findById(orgId, id);
    if (!result) throw new BadRequestException("Membro não encontrado após atualização");
    return result;
  }

  async patchAccess(
    orgId: string,
    actorUserId: string,
    actorTier: DiscordRoleTier,
    id: string,
    newAccess: SiteAccessStatus,
  ): Promise<MemberData> {
    const permissions = getPermissionsForTier(actorTier);
    if (!permissions.includes(Permission.MANAGE_MEMBER_ACCESS)) {
      throw new ForbiddenException("Permissões insuficientes para gerenciar acesso");
    }

    const orgObjectId = new mongoose.Types.ObjectId(orgId);
    const userObjectId = new mongoose.Types.ObjectId(id);

    const existing = await UserModel.findOne({
      _id: userObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!existing) {
      throw new BadRequestException("Membro não encontrado");
    }

    if (existing.siteAccess === newAccess) {
      const result = await this.findById(orgId, id);
      if (!result) throw new BadRequestException("Membro não encontrado");
      return result;
    }

    await UserModel.findByIdAndUpdate(
      userObjectId,
      { $set: { siteAccess: newAccess } },
      { runValidators: true },
    );

    const action = newAccess === SiteAccessStatus.ACTIVE
      ? AuditAction.MEMBER_ACCESS_GRANTED
      : AuditAction.MEMBER_ACCESS_REVOKED;

    await AuditLogModel.create({
      organizationId: orgObjectId,
      userId: new mongoose.Types.ObjectId(actorUserId),
      action,
      entity: "User",
      entityId: id,
      metadata: {
        before: { siteAccess: existing.siteAccess },
        after: { siteAccess: newAccess },
      },
    });

    const result = await this.findById(orgId, id);
    if (!result) throw new BadRequestException("Membro não encontrado após atualização");
    return result;
  }

  async patchRole(
    orgId: string,
    actorUserId: string,
    actorTier: DiscordRoleTier,
    id: string,
    newRank: OrganizationRank,
  ): Promise<MemberData> {
    const permissions = getPermissionsForTier(actorTier);
    if (!permissions.includes(Permission.MANAGE_MEMBER_ROLE)) {
      throw new ForbiddenException("Permissões insuficientes para gerenciar cargos");
    }

    const orgObjectId = new mongoose.Types.ObjectId(orgId);
    const userObjectId = new mongoose.Types.ObjectId(id);

    const existing = await UserModel.findOne({
      _id: userObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!existing) {
      throw new BadRequestException("Membro não encontrado");
    }

    await this.discordRoleService.applyRankToMember(
      orgId,
      actorUserId,
      actorTier,
      existing.discordId,
      newRank,
    );

    await UserModel.findByIdAndUpdate(
      userObjectId,
      { $set: { rank: newRank } },
      { runValidators: true },
    );

    const result = await this.findById(orgId, id);
    if (!result) throw new BadRequestException("Membro não encontrado após atualização");
    return result;
  }

  async syncMembers(
    orgId: string,
    actorUserId: string,
    actorTier: DiscordRoleTier,
  ): Promise<{ synced: number; created: number; updated: number }> {
    const permissions = getPermissionsForTier(actorTier);
    if (!permissions.includes(Permission.SYNC_DISCORD_MEMBERS)) {
      throw new ForbiddenException("Permissões insuficientes para sincronizar membros");
    }

    return this.memberSyncService.syncMembersFromDiscord(
      orgId,
      actorUserId,
      actorTier,
    );
  }
}

import { Injectable, BadRequestException } from "@nestjs/common";
import { UserModel, AuditLogModel, OrganizationModel, mongoose } from "@criminals/database";
import { AuditAction, SiteAccessStatus, getPermissionsForTier, DiscordRoleTier } from "@criminals/shared";
import type { CompleteProfileInput, UserData } from "@criminals/shared";
import { completeProfileSchema } from "@criminals/shared";
import { DiscordMemberService } from "../discord/discord-member.service";

@Injectable()
export class ProfileService {
  constructor(
    private readonly discordMemberService: DiscordMemberService,
  ) { }

  async getProfileStatus(
    userId: string,
    organizationId: string,
  ): Promise<{
    profileCompleted: boolean;
    displayName: string | null;
    alias: string | null;
    rpId: string | null;
    phone: string | null;
    siteAccess: SiteAccessStatus;
  }> {
    const user = await UserModel.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).lean();

    if (!user) {
      throw new BadRequestException("Usuário não encontrado");
    }

    return {
      profileCompleted: user.profileCompleted ?? false,
      displayName: user.displayName ?? null,
      alias: user.alias ?? null,
      rpId: user.rpId ?? null,
      phone: user.phone ?? null,
      siteAccess: (user.siteAccess as SiteAccessStatus) ?? SiteAccessStatus.ACTIVE,
    };
  }

  async completeProfile(
    userId: string,
    organizationId: string,
    input: CompleteProfileInput,
  ): Promise<{ success: true; profileCompleted: boolean }> {
    const validated = completeProfileSchema.safeParse(input);
    if (!validated.success) {
      const messages = validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      throw new BadRequestException(messages.join("; "));
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);

    const existing = await UserModel.findOne({
      _id: userObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!existing) {
      throw new BadRequestException("Usuário não encontrado");
    }

    const org = await OrganizationModel.findById(orgObjectId).lean();
    if (!org) {
      throw new BadRequestException("Organização não encontrada");
    }

    const guildId = org.discordGuildId;
    const before: any = {};
    const after: any = {};

    const finalRpId = validated.data.rpId ?? existing.rpId ?? "";
    const finalDisplayName = validated.data.displayName ?? existing.displayName ?? "";

    const needsNickUpdate =
      validated.data.displayName !== existing.displayName ||
      validated.data.rpId !== existing.rpId;

    function formatDiscordNick(id: string, name: string): string | null {
      const cleanId = String(id ?? "").trim();
      const cleanName = String(name ?? "").trim();
      if (cleanId && cleanName) return `${cleanId} | ${cleanName}`;
      if (cleanId) return cleanId;
      if (cleanName) return cleanName;
      return null;
    }

    if (needsNickUpdate) {
      const newNick = formatDiscordNick(finalRpId, finalDisplayName);
      try {
        await this.discordMemberService.updateNickname(
          guildId,
          existing.discordId,
          newNick,
        );
      } catch (e: any) {
        throw new BadRequestException(
          `Falha ao atualizar apelido no Discord: ${e?.message ?? "Erro desconhecido"}. Perfil não foi salvo.`,
        );
      }
      before.displayName = existing.displayName;
      before.rpId = existing.rpId;
      after.displayName = validated.data.displayName;
      after.rpId = validated.data.rpId;
    }

    if (validated.data.alias !== existing.alias) {
      before.alias = existing.alias;
      after.alias = validated.data.alias;
    }
    if (validated.data.rpId !== existing.rpId) {
      before.rpId = existing.rpId;
      after.rpId = validated.data.rpId;
    }
    if (validated.data.phone !== existing.phone) {
      before.phone = existing.phone;
      after.phone = validated.data.phone;
    }
    if (!existing.profileCompleted) {
      before.profileCompleted = false;
      after.profileCompleted = true;
    }

    await UserModel.findByIdAndUpdate(
      userObjectId,
      {
        $set: {
          displayName: validated.data.displayName,
          alias: validated.data.alias,
          rpId: validated.data.rpId,
          phone: validated.data.phone,
          profileCompleted: true,
        },
      },
      { runValidators: true },
    );

    if (Object.keys(before).length > 0) {
      await AuditLogModel.create({
        organizationId: orgObjectId,
        userId: userObjectId,
        action: AuditAction.USER_UPDATED,
        entity: "User",
        entityId: userId,
        metadata: { before, after, action: "completeProfile" },
      });
    }

    return { success: true, profileCompleted: true };
  }
}

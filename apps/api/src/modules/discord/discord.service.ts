import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserModel, AuditLogModel, mongoose } from "@criminals/database";
import { Permission, DiscordRoleTier, AuditAction } from "@criminals/shared";
import type { DiscordRole, DiscordMember } from "@criminals/shared";
import { getPermissionsForTier } from "@criminals/shared";
import type { AssignRoleInput } from "@criminals/shared";

const API_BASE = "https://discord.com/api/v10";

@Injectable()
export class DiscordService {
  private readonly botToken: string;
  private readonly guildId: string;

  constructor(private readonly configService: ConfigService) {
    this.guildId = this.configService.getOrThrow("DISCORD_GUILD_ID");
    this.botToken = this.configService.getOrThrow("DISCORD_BOT_TOKEN");
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bot ${this.botToken}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(
        `Discord API ${res.status} ${res.statusText} on ${options.method ?? "GET"} ${path}: ${errBody}`,
      );
    }

    if (res.status === 204) return undefined as unknown as T;
    return res.json() as Promise<T>;
  }

  async getGuild() {
    try {
      return await this.request<any>(`/guilds/${this.guildId}`);
    } catch (e) {
      return null;
    }
  }

  async getRoles(): Promise<DiscordRole[]> {
    try {
      const roles = await this.request<any[]>(`/guilds/${this.guildId}/roles`);
      return roles.map((role) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: String(role.permissions),
      }));
    } catch {
      return [];
    }
  }

  async getMembers(): Promise<DiscordMember[]> {
    try {
      const members = await this.request<any[]>(
        `/guilds/${this.guildId}/members?limit=1000`,
      );
      return members.map((member) => ({
        id: member.user!.id,
        username: member.user!.username,
        globalName: member.user!.global_name ?? null,
        avatar: member.user!.avatar ?? member.avatar ?? null,
        roles: member.roles,
        joinedAt: new Date(member.joined_at),
      }));
    } catch {
      return [];
    }
  }

  async assignRole(
    organizationId: string,
    actorId: string,
    actorTier: DiscordRoleTier,
    targetUserId: string,
    input: AssignRoleInput,
  ) {
    const permissions = getPermissionsForTier(actorTier);
    if (!permissions.includes(Permission.MANAGE_ROLES)) {
      throw new ForbiddenException("Sem permissão para gerenciar cargos");
    }

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const targetObjectId = new mongoose.Types.ObjectId(targetUserId);

    const user = await UserModel.findOne({
      _id: targetObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!user) {
      throw new BadRequestException("Usuário não encontrado");
    }

    try {
      await this.request<void>(
        `/guilds/${this.guildId}/members/${user.discordId}/roles/${input.roleId}`,
        { method: "PUT" },
      );

      const actorObjectId = new mongoose.Types.ObjectId(actorId);
      await AuditLogModel.create({
        organizationId: orgObjectId,
        userId: actorObjectId,
        action: AuditAction.ROLE_ASSIGNED,
        entity: "User",
        entityId: targetUserId,
        metadata: {
          targetUserId,
          targetDiscordId: user.discordId,
          roleId: input.roleId,
        },
      });

      return { success: true };
    } catch (e: any) {
      throw new BadRequestException(
        `Falha ao atribuir cargo: ${e?.message ?? "Erro desconhecido"}`,
      );
    }
  }

  async removeRole(
    organizationId: string,
    actorId: string,
    actorTier: DiscordRoleTier,
    targetUserId: string,
    roleId: string,
  ) {
    const permissions = getPermissionsForTier(actorTier);
    if (!permissions.includes(Permission.MANAGE_ROLES)) {
      throw new ForbiddenException("Sem permissão para gerenciar cargos");
    }

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const targetObjectId = new mongoose.Types.ObjectId(targetUserId);

    const user = await UserModel.findOne({
      _id: targetObjectId,
      organizationId: orgObjectId,
    }).lean();

    if (!user) {
      throw new BadRequestException("Usuário não encontrado");
    }

    try {
      await this.request<void>(
        `/guilds/${this.guildId}/members/${user.discordId}/roles/${roleId}`,
        { method: "DELETE" },
      );

      const actorObjectId = new mongoose.Types.ObjectId(actorId);
      await AuditLogModel.create({
        organizationId: orgObjectId,
        userId: actorObjectId,
        action: AuditAction.ROLE_REMOVED,
        entity: "User",
        entityId: targetUserId,
        metadata: {
          targetUserId,
          targetDiscordId: user.discordId,
          roleId,
        },
      });

      return { success: true };
    } catch (e: any) {
      throw new BadRequestException(
        `Falha ao remover cargo: ${e?.message ?? "Erro desconhecido"}`,
      );
    }
  }

  async sendDM(
    discordUserId: string,
    content: { embeds?: any[]; components?: any[] },
  ) {
    try {
      const dmChannel = await this.request<any>("/users/@me/channels", {
        method: "POST",
        body: JSON.stringify({ recipient_id: discordUserId }),
      });

      await this.request(`/channels/${dmChannel.id}/messages`, {
        method: "POST",
        body: JSON.stringify(content),
      });

      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    }
  }

  async sendMessageToChannel(
    channelId: string,
    content: { embeds?: any[]; components?: any[] },
  ) {
    try {
      await this.request(`/channels/${channelId}/messages`, {
        method: "POST",
        body: JSON.stringify(content),
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    }
  }
}

import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { DiscordService } from "./discord.service";
import { DiscordRoleService } from "./discord-role.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Permission, DiscordRoleTier } from "@criminals/shared";
import type { AssignRoleInput, UpdateDiscordRoleConfigInput, UserData } from "@criminals/shared";

@ApiTags("Discord")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("discord")
export class DiscordController {
  constructor(
    private readonly discordService: DiscordService,
    private readonly discordRoleService: DiscordRoleService,
  ) { }

  @Get("guild")
  @RequirePermissions(Permission.VIEW_DISCORD)
  getGuild() {
    return this.discordService.getGuild();
  }

  @Get("roles")
  @RequirePermissions(Permission.VIEW_DISCORD)
  getRoles() {
    return this.discordService.getRoles();
  }

  @Get("members")
  @RequirePermissions(Permission.VIEW_MEMBERS)
  getMembers() {
    return this.discordService.getMembers();
  }

  @Get("config/roles")
  @RequirePermissions(Permission.MANAGE_DISCORD_ROLE_CONFIG)
  getRoleConfig(@CurrentUser() user: UserData) {
    return this.discordRoleService.getRoleConfig(user.organizationId);
  }

  @Patch("config/roles")
  @RequirePermissions(Permission.MANAGE_DISCORD_ROLE_CONFIG)
  saveRoleConfig(
    @CurrentUser() user: UserData,
    @Body() body: UpdateDiscordRoleConfigInput,
  ) {
    const normalized: any = {};
    (
      [
        "ownerRoleId",
        "managerRoleId",
        "supervisorRoleId",
        "memberRoleId",
        "leaderRoleId",
        "subLeaderRoleId",
        "level1RoleId",
        "level2RoleId",
        "level3RoleId",
        "afkRoleId",
      ] as const
    ).forEach((k) => {
      normalized[k] = (body as any)[k] ?? null;
    });
    return this.discordRoleService.saveRoleConfig(
      user.organizationId,
      normalized,
      user.id,
      user.tier,
    );
  }

  @Patch("members/:id/roles")
  @RequirePermissions(Permission.MANAGE_ROLES)
  assignRole(
    @Param("id") targetUserId: string,
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
    @Body() body: AssignRoleInput,
  ) {
    return this.discordService.assignRole(
      user.organizationId,
      user.id,
      user.tier,
      targetUserId,
      body,
    );
  }

  @Delete("members/:id/roles/:roleId")
  @RequirePermissions(Permission.MANAGE_ROLES)
  removeRole(
    @Param("id") targetUserId: string,
    @Param("roleId") roleId: string,
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
  ) {
    return this.discordService.removeRole(
      user.organizationId,
      user.id,
      user.tier,
      targetUserId,
      roleId,
    );
  }
}

import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { MembersService } from "./members.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Permission, OrganizationRank, SiteAccessStatus } from "@criminals/shared";
import type { UpdateMemberInput, UserData } from "@criminals/shared";

@ApiTags("Members")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_MEMBERS)
  findAll(
    @CurrentUser() user: UserData,
    @Query("search") search?: string,
    @Query("rank") rank?: OrganizationRank,
    @Query("siteAccess") siteAccess?: SiteAccessStatus,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string,
  ) {
    return this.membersService.findAll(user.organizationId, {
      search,
      rank,
      siteAccess,
      page: page ? Number(page) : undefined,
      perPage: perPage ? Number(perPage) : undefined,
    });
  }

  @Get("search")
  @RequirePermissions(Permission.VIEW_MEMBERS)
  search(
    @CurrentUser() user: UserData,
    @Query("search") search?: string,
    @Query("rank") rank?: OrganizationRank,
    @Query("siteAccess") siteAccess?: SiteAccessStatus,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string,
  ) {
    return this.membersService.findAll(user.organizationId, {
      search,
      rank,
      siteAccess,
      page: page ? Number(page) : undefined,
      perPage: perPage ? Number(perPage) : undefined,
    });
  }

  @Get(":id")
  @RequirePermissions(Permission.VIEW_MEMBERS)
  findById(
    @CurrentUser() user: UserData,
    @Param("id") id: string,
  ) {
    return this.membersService.findById(user.organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(Permission.MANAGE_MEMBERS)
  patchMember(
    @CurrentUser() user: UserData,
    @Param("id") id: string,
    @Body() body: UpdateMemberInput,
  ) {
    return this.membersService.patchMember(
      user.organizationId,
      user.id,
      user.tier,
      id,
      body,
    );
  }

  @Patch(":id/access")
  @RequirePermissions(Permission.MANAGE_MEMBER_ACCESS)
  patchAccess(
    @CurrentUser() user: UserData,
    @Param("id") id: string,
    @Body("siteAccess") newAccess: SiteAccessStatus,
  ) {
    return this.membersService.patchAccess(
      user.organizationId,
      user.id,
      user.tier,
      id,
      newAccess,
    );
  }

  @Patch(":id/role")
  @RequirePermissions(Permission.MANAGE_MEMBER_ROLE)
  patchRole(
    @CurrentUser() user: UserData,
    @Param("id") id: string,
    @Body("rank") newRank: OrganizationRank,
  ) {
    return this.membersService.patchRole(
      user.organizationId,
      user.id,
      user.tier,
      id,
      newRank,
    );
  }

  @Post("sync")
  @RequirePermissions(Permission.SYNC_DISCORD_MEMBERS)
  syncMembers(@CurrentUser() user: UserData) {
    return this.membersService.syncMembers(
      user.organizationId,
      user.id,
      user.tier,
    );
  }
}

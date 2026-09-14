import { Controller, Get, Param, Patch, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { UsersService } from "./users.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permission } from "@criminals/shared";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(Permission.VIEW_MEMBERS)
  findAll(@CurrentUser() user: { organizationId: string }) {
    return this.usersService.findAll(user.organizationId);
  }

  @Get(":id")
  findOne(
    @Param("id") id: string,
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.usersService.findById(id, user.organizationId);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @CurrentUser() user: { organizationId: string },
    @Body() body: { globalName?: string | null },
  ) {
    return this.usersService.update(id, user.organizationId, body);
  }
}

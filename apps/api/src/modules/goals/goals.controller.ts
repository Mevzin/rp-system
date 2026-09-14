import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { GoalsService } from "./goals.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Permission, DiscordRoleTier } from "@criminals/shared";
import type { CreateGoalInput, UpdateGoalInput } from "@criminals/shared";

@ApiTags("Goals")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("goals")
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get("active")
  @RequirePermissions(Permission.VIEW_GOALS)
  findActive(
    @CurrentUser() user: { organizationId: string },
  ) {
    return this.goalsService.findActive(user.organizationId);
  }

  @Post()
  @RequirePermissions(Permission.MANAGE_GOALS)
  create(
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
    @Body() body: CreateGoalInput,
  ) {
    return this.goalsService.create(
      user.organizationId,
      user.id,
      user.tier,
      body,
    );
  }

  @Get()
  @RequirePermissions(Permission.VIEW_GOALS)
  findAll(
    @CurrentUser() user: { organizationId: string },
    @Query("type") type?: string,
    @Query("isActive") isActive?: string,
    @Query("userId") userId?: string,
  ) {
    return this.goalsService.findAll(user.organizationId, {
      type,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
      userId,
    });
  }

  @Post(":id/activate")
  @RequirePermissions(Permission.MANAGE_GOALS)
  activate(
    @Param("id") id: string,
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
  ) {
    return this.goalsService.activate(
      id,
      user.organizationId,
      user.id,
      user.tier,
    );
  }

  @Post(":id/deactivate")
  @RequirePermissions(Permission.MANAGE_GOALS)
  deactivate(
    @Param("id") id: string,
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
  ) {
    return this.goalsService.deactivate(
      id,
      user.organizationId,
      user.id,
      user.tier,
    );
  }

  @Patch(":id")
  @RequirePermissions(Permission.MANAGE_GOALS)
  update(
    @Param("id") id: string,
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
    @Body() body: UpdateGoalInput,
  ) {
    return this.goalsService.update(
      id,
      user.organizationId,
      user.id,
      user.tier,
      body,
    );
  }

  @Delete(":id")
  @RequirePermissions(Permission.MANAGE_GOALS)
  remove(
    @Param("id") id: string,
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
  ) {
    return this.goalsService.remove(
      id,
      user.organizationId,
      user.id,
      user.tier,
    );
  }
}

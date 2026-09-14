import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { StatisticsService } from "./statistics.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { Permission, DiscordRoleTier } from "@criminals/shared";
import { getPermissionsForTier } from "@criminals/shared";

@ApiTags("Statistics")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
@Controller("statistics")
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get("dashboard")
  @RequirePermissions(Permission.VIEW_DASHBOARD)
  getDashboardStats(
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
    @Query("userId") userId?: string,
  ) {
    const permissions = getPermissionsForTier(user.tier);
    const canViewAll = permissions.includes(Permission.VIEW_ALL_FARMS);
    const targetUserId = canViewAll && userId ? userId : user.id;

    return this.statisticsService.getDashboardStats(
      user.organizationId,
      targetUserId,
    );
  }

  @Get("overview")
  @RequirePermissions(Permission.VIEW_DASHBOARD)
  getOverview(
    @CurrentUser()
    user: {
      id: string;
      organizationId: string;
      tier: DiscordRoleTier;
    },
  ) {
    return this.statisticsService.getOverview(user.organizationId);
  }

  @Get("farm")
  @RequirePermissions(Permission.VIEW_DASHBOARD)
  getFarmStats(
    @CurrentUser() user: { organizationId: string },
    @Query("period") period?: "day" | "week" | "month" | "all",
  ) {
    return this.statisticsService.getFarmStats(
      user.organizationId,
      period ?? "month",
    );
  }
}
